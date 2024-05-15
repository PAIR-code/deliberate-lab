/** Chat message endpoints */
import { Value } from '@sinclair/typebox/value';
import * as functions from 'firebase-functions';
import { onCall } from 'firebase-functions/v2/https';
import { app } from '../app';
import { MessageData } from '../validation/messages.validation';

import { MessageKind } from '@llm-mediation-experiments/utils';
import { Timestamp } from 'firebase-admin/firestore';
import { AuthGuard } from '../utils/auth-guard';

export const message = onCall(async (request) => {
  const { data } = request;

  if (Value.Check(MessageData, data)) {
    // Validate authentication status for experimenter messages
    if (data.message.kind !== MessageKind.UserMessage) await AuthGuard.isExperimenter(request);

    const timestamp = Timestamp.now();

    const participants = await app
      .firestore()
      .collection(`experiments/${data.experimentId}/participants`)
      .get();

    // Create all messages in transaction
    await app.firestore().runTransaction(async (transaction) => {
      participants.docs.forEach((participant) => {
        transaction.set(participant.ref.collection(`chats/${data.chatId}/messages`).doc(), {
          ...data.message,
          timestamp,
        });
      });
    });
  }

  throw new functions.https.HttpsError('invalid-argument', 'Invalid data');
});
