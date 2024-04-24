/** Chat message endpoints */
import { Value } from '@sinclair/typebox/value';
import * as functions from 'firebase-functions';
import { onCall } from 'firebase-functions/v2/https';
import { app } from '../app';
import {
  DiscussItemsMessageMutationData,
  MediatorMessageMutationData,
  UserMessageMutationData,
} from '../validation/messages.validation';

import { AuthGuard } from '../utils/auth-guard';

export const userMessage = onCall(async (request) => {
  const { data } = request;

  if (Value.Check(UserMessageMutationData, data)) {
    await AuthGuard.canSendUserMessage(request, data.chatId);

    // Build message data
    const msgData = {
      ...data,
      messageType: 'userMessage',
      timestamp: new Date(),
    };

    const ref = await app.firestore().collection('messages').add(msgData);
    return { uid: ref.id };
  }

  throw new functions.https.HttpsError('invalid-argument', 'Invalid data');
});

export const discussItemsMessage = onCall(async (request) => {
  await AuthGuard.isExperimenter(request);

  const { data } = request;

  if (Value.Check(DiscussItemsMessageMutationData, data)) {
    // Build message data
    const msgData = {
      ...data,
      messageType: 'discussItemsMessage',
      timestamp: new Date(),
    };

    const ref = await app.firestore().collection('messages').add(msgData);
    return { uid: ref.id };
  }

  throw new functions.https.HttpsError('invalid-argument', 'Invalid data');
});

export const mediatorMessage = onCall(async (request) => {
  await AuthGuard.isExperimenter(request);

  // access authenticated user
  const { data } = request;

  if (Value.Check(MediatorMessageMutationData, data)) {
    // Build message data
    const msgData = {
      ...data,
      messageType: 'mediatorMessage',
      timestamp: new Date(),
    };

    const ref = await app.firestore().collection('messages').add(msgData);
    return { uid: ref.id };
  }

  throw new functions.https.HttpsError('invalid-argument', 'Invalid data');
});
