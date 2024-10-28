import { Timestamp } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import {
  awaitTypingDelay,
  ChatMessage,
  ChatMessageType,
  StageKind,
  addChatHistoryToPrompt,
  getPreface,
  getChatHistory,
  createAgentMediatorChatMessage,
  MediatorConfig,
} from '@deliberation-lab/utils';

import { app } from '../app';
import { getGeminiAPIResponse } from '../api/gemini.api';

export interface MediatorMessage {
  mediator: MediatorConfig;
  parsed: any;
  message: string;
}

/** When chat message is created, generate mediator response if relevant. */
export const createMediatorMessage = onDocumentCreated(
  'experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}/chats/{chatId}',
  async (event) => {
    const data = event.data?.data() as ChatMessage | undefined;

    // Use experiment config to get ChatStageConfig with mediators.
    let stage = (
      await app
        .firestore()
        .doc(`experiments/${event.params.experimentId}/stages/${event.params.stageId}`)
        .get()
    ).data() as StageConfig;
    if (stage.kind !== StageKind.CHAT) {
      return;
    }
    if (stage.muteMediators) {
      return;
    }
    // Fetch experiment creator's API key.
    const creatorId = (
      await app.firestore().collection('experiments').doc(event.params.experimentId).get()
    ).data().metadata.creator;
    const creatorDoc = await app.firestore().collection('experimenterData').doc(creatorId).get();
    if (!creatorDoc.exists) return;

    const apiKeys = creatorDoc.data().apiKeys;

    // Use chats in collection to build chat history for prompt, get num chats
    const chatMessages = (
      await app
        .firestore()
        .collection(
          `experiments/${event.params.experimentId}/cohorts/${event.params.cohortId}/publicStageData/${event.params.stageId}/chats`,
        )
        .orderBy('timestamp', 'asc')
        .get()
    ).docs.map((doc) => doc.data() as ChatMessage);

    // Fetch messages from all mediators
    const mediatorMessages: MediatorMessage[] = [];
    for (const mediator of stage.mediators) {
      const prompt = `${getPreface(mediator)}\n${getChatHistory(chatMessages, mediator)}\n${mediator.responseConfig.formattingInstructions}`;

      // Call Gemini API with given modelCall info
      const response = await getGeminiAPIResponse(apiKeys.geminiKey, prompt);

      // Add mediator message if non-empty
      let message = response.text;
      let parsed = '';

      if (mediator.responseConfig.isJSON) {
        // Reset message to empty before trying to fill with JSON response
        message = '';

        try {
          const cleanedText = response.text.replace(/```json\s*|\s*```/g, '').trim();
          parsed = JSON.parse(cleanedText);
        } catch {
          // Response is already logged in console during Gemini API call
          console.log('Could not parse JSON!');
        }
        message = parsed[mediator.responseConfig.messageField] ?? '';
      }

      const trimmed = message.trim();
      if (trimmed === '' || trimmed === '""' || trimmed === "''") continue;
      mediatorMessages.push({ mediator, parsed, message });
    }

    if (mediatorMessages.length === 0) return;

    // Show all of the potential messages.
    console.log('The following participants wish to speak:');
    mediatorMessages.forEach((message) => {
      console.log(`\t${message.mediator.name}: ${message.message}`);
    });

    // Randomly sample a message.
    const mediatorMessage = mediatorMessages[Math.floor(Math.random() * mediatorMessages.length)];
    const mediator = mediatorMessage.mediator;
    const message = mediatorMessage.message;
    const parsed = mediatorMessage.parsed;

    await awaitTypingDelay(message);

    // Refresh the stage to check if mediators have been muted.
    stage = (
      await app
        .firestore()
        .doc(`experiments/${event.params.experimentId}/stages/${event.params.stageId}`)
        .get()
    ).data() as StageConfig;

    // Don't send a message if the conversation has moved on.
    const numChatsBeforeMediator = chatMessages.length;
    const numChatsAfterMediator = (
      await app
        .firestore()
        .collection(
          `experiments/${event.params.experimentId}/cohorts/${event.params.cohortId}/publicStageData/${event.params.stageId}/chats`,
        )
        .count()
        .get()
    ).data().count;
    if (numChatsAfterMediator > numChatsBeforeMediator || stage.muteMediators) {
      return;
    }

    const chatMessage = createAgentMediatorChatMessage({
      profile: { name: mediator.name, avatar: mediator.avatar, pronouns: null },
      discussionId: data.discussionId,
      message,
      timestamp: Timestamp.now(),
      mediatorId: mediator.id,
      explanation: mediator.responseConfig.isJSON
        ? (parsed[mediator.responseConfig.explanationField] ?? '')
        : '',
    });
    const mediatorDocument = app
      .firestore()
      .collection('experiments')
      .doc(event.params.experimentId)
      .collection('cohorts')
      .doc(event.params.cohortId)
      .collection('publicStageData')
      .doc(event.params.stageId)
      .collection('chats')
      .doc(chatMessage.id);

    await app.firestore().runTransaction(async (transaction) => {
      transaction.set(mediatorDocument, chatMessage);
    });
  },
);
