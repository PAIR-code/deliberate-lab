import {onValueWritten} from 'firebase-functions/v2/database';
import {app} from '../app';

/**
 * Mirror the presence status from RTDB to Firestore.
 *
 * This function is triggered when the presence status of a participant changes in the RTDB.
 * It updates the corresponding participant document in Firestore with the new status.
 *
 * Currently, rtdb is only used in Deliberate Lab for presence tracking (using the rtdb websocket).
 */
export const mirrorPresenceToFirestore = onValueWritten(
  {
    ref: '/status/{experimentId}/{participantPrivateId}',
    instance: `${process.env.GCLOUD_PROJECT}-default-rtdb`,
  },
  async (event) => {
    const {experimentId, participantPrivateId} = event.params;
    console.log(
      `mirrorPresenceToFirestore triggered for experimentId=${experimentId} participantPrivateId=${participantPrivateId}`,
    );
    const status = event.data.after.val();

    if (!status) return null; // status was deleted

    // Find the matching participant doc
    const participantRef = app
      .firestore()
      .doc(`experiments/${experimentId}/participants/${participantPrivateId}`);
    const participantSnapshot = await participantRef.get();

    if (!participantSnapshot.exists) {
      console.warn(
        `No participant found with id=${participantPrivateId} in experiment=${experimentId}`,
      );
      return null;
    }
    const participant = participantSnapshot.data();

    if (participant && participant.agentConfig) {
      return null; // Don't update presence for agent participants
    }

    // Temporarily prevent participants from switching from connected
    // to disconnected (PR #537)
    // TODO: Remove this logic to resume actual presence detection
    if (!status.connected) {
      return null;
    }

    return participantRef.set({connected: status.connected}, {merge: true});
  },
);
