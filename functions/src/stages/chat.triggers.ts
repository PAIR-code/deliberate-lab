import { Timestamp } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import {
  ChatMessage,
  ChatMessageType,
  StageKind,
  addChatHistoryToPrompt,
  createAgentMediatorChatMessage
} from '@deliberation-lab/utils';

import { app } from '../app';
import { getGeminiAPIResponse } from '../api/gemini.api';

/** When chat message is created, generate mediator response if relevant. */
export const createMediatorMessage = onDocumentWritten(
  'experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}/chats/{chatId}',
  async (event) => {
    const data = event.data?.after.data() as ChatMessage | undefined;
    if (data.type !== ChatMessageType.PARTICIPANT) return;

    // Use experiment config to get ChatStageConfig with mediators.
    const stage = (
      await app.firestore().doc(`experiments/${event.params.experimentId}/stages/${event.params.stageId}`).get()
    ).data() as StageConfig;
    if (stage.kind !== StageKind.CHAT) { return; }

    // Fetch experiment creator's API key.
    const creatorId = (await app.firestore().collection('experiments').doc(event.params.experimentId).get())
      .data().metadata.creator;
    const creatorDoc = (await app.firestore().collection('experimenterData').doc(creatorId).get());
    if (!creatorDoc.exists) return;

    const apiKeys = creatorDoc.data().apiKeys;

    for (const mediator of stage.mediators) {
      // Use chats in collection to build chat history for prompt, get num chats
      const chatMessages = (
        await app
        .firestore()
        .collection(`experiments/${event.params.experimentId}/cohorts/${event.params.cohortId}/publicStageData/${event.params.stageId}/chats`)
        .orderBy('timestamp', 'asc')
        .get())
      .docs.map(doc => doc.data() as ChatMessage);

      // Use last 10 messages to build chat history
      const prompt = addChatHistoryToPrompt(chatMessages.slice(-10), mediator.prompt);
      const numChatsBeforeMediator = chatMessages.length;

      // Call Gemini API with given modelCall info
      const response = await getGeminiAPIResponse(apiKeys.geminiKey, prompt);

      // If number of chats has not changed, add mediator message
      const numChatsAfterMediator = (
        await app
        .firestore()
        .collection(`experiments/${event.params.experimentId}/cohorts/${event.params.cohortId}/publicStageData/${event.params.stageId}/chats`)
        .count().get())
      .data().count;
      if (numChatsAfterMediator > numChatsBeforeMediator) { return; }

      // Add mediator message if non-empty
      const message = response.text;
      if (message.trim() === '') return;

      const mediatorMessage = createAgentMediatorChatMessage(
        {
          profile: { name: mediator.name, avatar: mediator.avatar, pronouns: null },
          message,
          timestamp: Timestamp.now(),
          mediatorId: mediator.id
        }
      );
      const mediatorDocument = app.firestore()
        .collection('experiments')
        .doc(event.params.experimentId)
        .collection('cohorts')
        .doc(event.params.cohortId)
        .collection('publicStageData')
        .doc(event.params.stageId)
        .collection('chats')
        .doc(mediatorMessage.id);

      await app.firestore().runTransaction(async (transaction) => {
        transaction.set(mediatorDocument, mediatorMessage);
      });
    } // end mediator loop
  }
);