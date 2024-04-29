/** Endpoints for interactions with participants */

import { Value } from '@sinclair/typebox/value';
import { Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { onCall } from 'firebase-functions/v2/https';
import { app } from '../app';
import { checkStageProgression } from '../utils/check-stage-progression';
import { getUserChat } from '../utils/get-user-chat';
import { ProfileAndTOS } from '../validation/participants.validation';
import {
  GenericStageUpdate,
  ToggleReadyToEndChat,
  validateStageUpdateAndMerge,
} from '../validation/stages.validation';

/** Fetch a specific participant */
export const participant = onCall(async (request) => {
  const { participantUid } = request.data;

  if (!participantUid) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing participant UID');
  }

  const participant = await app.firestore().collection('participants').doc(participantUid).get();

  if (!participant.exists) {
    throw new functions.https.HttpsError('not-found', 'Participant not found');
  }

  const data = { uid: participant.id, ...participant.data() };

  return data;
});

/** Update the profile and terms of service acceptance date for a participant */
export const updateProfileAndTOS = onCall(async (request) => {
  const { uid, ...body } = request.data;

  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing participant UID');
  }

  const participant = await app.firestore().collection('participants').doc(uid).get();

  if (!participant.exists) {
    throw new functions.https.HttpsError('not-found', 'Participant not found');
  }

  // Validate the body data
  if (Value.Check(ProfileAndTOS, body)) {
    // Patch the data
    await participant.ref.update(checkStageProgression(participant, body));
    return { uid: participant.id, ...body }; // Send back the data
  } else {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid data');
  }
});

/** Generic endpoint for stage update. */
export const updateStage = onCall(async (request) => {
  const { uid, ...body } = request.data;

  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing participant UID');
  }

  // Validate the generic stage update data
  if (Value.Check(GenericStageUpdate, body)) {
    const participant = await app.firestore().collection('participants').doc(uid).get();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stageMap: Record<string, any> = participant.data()?.stageMap;

    if (!stageMap || !stageMap[body.name]) {
      throw new functions.https.HttpsError('not-found', 'Stage not found');
    }

    const stage = stageMap[body.name];
    const valid = validateStageUpdateAndMerge(stage, body.data);

    if (!valid)
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Invalid stage kind for update : ${stage.kind}`,
      );
    else {
      // Patch the data
      const { justFinishedStageName } = body;
      await participant.ref.update(
        checkStageProgression(participant, { justFinishedStageName, stageMap }),
      );
      return { uid }; // Send back the uid for refetch
    }
  }
  throw new functions.https.HttpsError('invalid-argument', 'Invalid data');
});

/** Toggle On/Off ready state for given participant and chat */
export const toggleReadyToEndChat = onCall(async (request) => {
  const { uid, ...body } = request.data;

  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing participant UID');
  }

  if (Value.Check(ToggleReadyToEndChat, body)) {
    if (body.readyToEndChat === false) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Cannot set readyToEndChat to false. Only true is allowed.',
      );
    }

    await app.firestore().runTransaction(async (transaction) => {
      const doc = await transaction.get(
        app.firestore().collection('participants_ready_to_end_chat').doc(body.chatId),
      );

      const data = doc.data();

      if (!data) {
        throw new functions.https.HttpsError('not-found', 'Chat sync document not found');
      }

      if (data.readyToEndChat[uid] === true) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Participant is already ready to end chat',
        );
      }

      data.readyToEndChat[uid] = true;

      // If everyone is now ready for the next pair, increment the current pair and reset everyone to false.
      if (Object.values(data.readyToEndChat).every((value) => value === true)) {
        data.currentPair += 1;
        Object.keys(data.readyToEndChat).forEach((key) => {
          data.readyToEndChat[key] = false;
        });

        const stage = await getUserChat(transaction, uid, body.chatId);

        if (!stage) {
          throw new functions.https.HttpsError('not-found', 'Chat not found');
        }

        if (stage.config.ratingsToDiscuss.length > data.currentPair) {
          const { id1, id2 } = stage.config.ratingsToDiscuss[data.currentPair];
          const itemPair = {
            item1: stage.config.items[id1],
            item2: stage.config.items[id2],
          };
          transaction.set(app.firestore().collection('messages').doc(), {
            chatId: body.chatId,
            messageType: 'discussItemsMessage',
            text: 'Discuss aabout this pair of items.',
            itemPair,
            timestamp: Timestamp.now(),
          });
        }
      }

      transaction.set(doc.ref, data);
    });
    return { uid };
  }

  throw new functions.https.HttpsError('invalid-argument', 'Invalid data');
});
