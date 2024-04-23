/** Chat message endpoints */
import { Value } from '@sinclair/typebox/value';
import * as functions from 'firebase-functions';
import { onCall } from 'firebase-functions/v2/https';
import { app } from '../app';
import { validateUserChat } from '../utils/validate-user-chat';
import {
  DiscussItemsMessageMutationData,
  MediatorMessageMutationData,
  UserMessageMutationData,
} from '../validation/messages.validation';

import 'firebase/compat/auth';

export const userMessage = onCall(async (request) => {
  const { data } = request;

  if (Value.Check(UserMessageMutationData, data)) {
    if (!validateUserChat(data.fromUserId, data.chatId)) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'User is not allowed to post to this chat',
      );
    }

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
  // TODO: experimenter authentication

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
  // TODO: experimenter authentication
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
