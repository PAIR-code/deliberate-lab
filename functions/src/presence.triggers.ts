import * as admin from 'firebase-admin';

import {database, pubsub} from 'firebase-functions';
import {app} from './app';

const dbInstance = database.instance(
  `${process.env.GCLOUD_PROJECT}-default-rtdb`,
);

/**
 * Mirror presence from RTDB → Firestore and maintain an aggregate node. Use
 * separate connection IDs to track individual connections, to properly support
 * multiple browser tabs or devices.
 *
 * RTDB write path:
 *   /status/{experimentId}/{participantPrivateId}/{connectionId}
 *
 * Firestore doc path:
 *   experiments/{experimentId}/participants/{participantPrivateId}
 */
export const mirrorPresenceToFirestore = dbInstance
  .ref('/status/{experimentId}/{participantPrivateId}/{connectionId}')
  .onWrite(async (change, context) => {
    const {experimentId, participantPrivateId, connectionId} = context.params;

    if (connectionId.startsWith('_')) return null;

    const parentRef = change.after.ref.parent; // participantPrivateId
    const aggRef = parentRef!.child('_aggregate');
    const fsRef = app
      .firestore()
      .doc(`experiments/${experimentId}/participants/${participantPrivateId}`);

    const siblingsSnapshot = await parentRef!.once('value');

    let online = false;
    for (const key in siblingsSnapshot.val()) {
      if (key.startsWith('_')) {
        // ignore _aggregate, future meta-nodes
        continue;
      }

      if (siblingsSnapshot.val()[key].connected) {
        online = true;
        break;
      }
    }

    await aggRef.set({
      state: online ? 'online' : 'offline',
      ts: admin.database.ServerValue.TIMESTAMP,
    });

    const snapshot = await fsRef.get();
    if (!snapshot.exists) {
      console.warn(
        `No participant ${participantPrivateId} in experiment ${experimentId}`,
      );
      return null;
    }
    if (snapshot.data()?.agentConfig) {
      // Skip bot/agent participants
      return null;
    }

    return fsRef.set(
      {
        connected: online,
        last_changed: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true},
    );
  });

export const scrubStalePresence = pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const cutoff = Date.now() - 72 * 60 * 60 * 1000; // 72 hours
    const root = admin.app().database().ref('status');
    const usersSnapshot = await root.get();
    const userSnapshots: admin.database.DataSnapshot[] = [];
    for (const userSnapshot of Object.values(usersSnapshot.val() || {})) {
      userSnapshots.push(userSnapshot as admin.database.DataSnapshot);
    }
    for (const userSnapshot of userSnapshots) {
      const connSnapshots: admin.database.DataSnapshot[] = [];
      userSnapshot.forEach((connSnapshot) => {
        connSnapshots.push(connSnapshot);
      });
      for (const connSnapshot of connSnapshots) {
        if (
          !connSnapshot.key!.startsWith('_') &&
          connSnapshot.child('ts').val() < cutoff
        ) {
          connSnapshot.ref.remove();
        }
      }
    }
  });
