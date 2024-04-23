/** Chat message endpoints */
import { Value } from '@sinclair/typebox/value';
import { onRequest } from 'firebase-functions/v2/https';
import { app } from '../app';
import { validateUserChat } from '../utils/validate-user-chat';
import {
  DiscussItemsMessageMutationData,
  MediatorMessageMutationData,
  UserMessageMutationData,
} from '../validation/messages.validation';

export const userMessage = onRequest(async (request, response) => {
  const { body } = request;

  if (Value.Check(UserMessageMutationData, body)) {
    if (!validateUserChat(body.fromUserId, body.chatId)) {
      response.status(403).send('User is not allowed to post to this chat');
      return;
    }

    // Build message data
    const data = {
      ...body,
      messageType: 'userMessage',
      timestamp: new Date(),
    };

    const ref = await app.firestore().collection('messages').add(data);
    response.send({ id: ref.id });
    return;
  }

  response.status(400).send('Invalid data');
});

export const discussItemsMessage = onRequest(async (request, response) => {
  // TODO: experimenter authentication

  const { body } = request;

  if (Value.Check(DiscussItemsMessageMutationData, body)) {
    // Build message data
    const data = {
      ...body,
      messageType: 'discussItemsMessage',
      timestamp: new Date(),
    };

    const ref = await app.firestore().collection('messages').add(data);
    response.send({ id: ref.id });
    return;
  }

  response.status(400).send('Invalid data');
});

export const mediatorMessage = onRequest(async (request, response) => {
  // TODO: experimenter authentication

  const { body } = request;

  if (Value.Check(MediatorMessageMutationData, body)) {
    // Build message data
    const data = {
      ...body,
      messageType: 'mediatorMessage',
      timestamp: new Date(),
    };

    const ref = await app.firestore().collection('messages').add(data);
    response.send({ id: ref.id });
  }
});
