import { Timestamp } from 'firebase-admin/firestore';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import {
  awaitTypingDelay,
  ChatMessage,
  ChatMessageType,
  ChatStagePublicData,
  StageKind,
  addChatHistoryToPrompt,
  getPreface,
  getChatHistory,
  getTimeElapsed,
  createAgentMediatorChatMessage,
  MediatorConfig,
  ChatStageConfig,
  ApiKeyType,
  ExperimenterData,
} from '@deliberation-lab/utils';

import { app } from '../app';
import { getGeminiAPIResponse } from '../api/gemini.api';
import { ollamaChat } from '../api/llama.api';

export interface MediatorMessage {
  mediator: MediatorConfig;
  parsed: any;
  message: string;
}

// Function to get the chat stage configuration based on the event.
async function getChatStage(event: any): Promise<ChatStageConfig | null> {
  const stageRef = app
    .firestore()
    .doc(`experiments/${event.params.experimentId}/stages/${event.params.stageId}`);

  const stageDoc = await stageRef.get();
  if (!stageDoc.exists) return null; // Return null if the stage doesn't exist.

  return stageDoc.data() as ChatStageConfig; // Return the stage data.
}

// Function to get the public data for the chat stage.
async function getChatStagePublicData(event: any): Promise<ChatStagePublicData | null> {
  const publicStageRef = app
    .firestore()
    .doc(
      `experiments/${event.params.experimentId}/cohorts/${event.params.cohortId}/publicStageData/${event.params.stageId}`,
    );

  const publicStageDoc = await publicStageRef.get();
  if (!publicStageDoc.exists) return null; // Return null if the public stage data doesn't exist.

  return publicStageDoc.data() as ChatStagePublicData; // Return the public stage data.
}

// Function to start tracking elapsed time when a chat is created
export const startTimeElapsed = onDocumentCreated(
  'experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}/chats/{chatId}',
  async (event) => {
    const stage = await getChatStage(event);
    if (!stage) return;

    const publicStageData = await getChatStagePublicData(event);
    if (!publicStageData) return;

    // Exit if discussion has already ended.
    if (publicStageData.discussionEndTimestamp) return;

    // Update the start timestamp and checkpoint timestamp if not set.
    if (publicStageData.discussionStartTimestamp === null) {
      await app
        .firestore()
        .doc(
          `experiments/${event.params.experimentId}/cohorts/${event.params.cohortId}/publicStageData/${event.params.stageId}`,
        )
        .update({
          discussionStartTimestamp: Timestamp.now(),
          discussionCheckpointTimestamp: Timestamp.now(),
        });
    }
  },
);

// Checks whether the chat has ended, returning true if ending chat.
async function hasEndedChat(
  event: any,
  stage: ChatStageConfig | null,
  stageData: ChatStagePublicData | null,
): Promise<boolean> {
  const chatStage = stage || (await getChatStage(event));
  const publicStageData = stageData || (await getChatStagePublicData(event));
  if (!chatStage || !publicStageData || !chatStage.timeLimitInMinutes) return false;

  const elapsedMinutes = getTimeElapsed(publicStageData.discussionStartTimestamp!, 'm');

  // Check if the elapsed time has reached or exceeded the time limit
  if (elapsedMinutes >= chatStage.timeLimitInMinutes) {
    await app
      .firestore()
      .doc(
        `experiments/${event.params.experimentId}/cohorts/${event.params.cohortId}/publicStageData/${event.params.stageId}`,
      )
      .update({ discussionEndTimestamp: Timestamp.now() });
    return true; // Indicate that the chat has ended.
  }
  return false;
}

// Function to update elapsed time and potentially end the discussion.
export const updateTimeElapsed = onDocumentUpdated(
  {
    document: 'experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}/',
    timeoutSeconds: 360, // Maximum timeout of 6 minutes.
  },
  async (event) => {
    const publicStageData = await getChatStagePublicData(event);
    if (!publicStageData) return;

    // Only update time if the conversation is in progress.
    if (!publicStageData.discussionStartTimestamp || publicStageData.discussionEndTimestamp) return;

    const stage = await getChatStage(event);
    if (!stage || !stage.timeLimitInMinutes) return;
    // Maybe end the chat.
    if (await hasEndedChat(event, stage, publicStageData)) return;

    // Calculate how long to wait.
    const elapsedMinutes = getTimeElapsed(publicStageData.discussionStartTimestamp!, 'm');
    const maxWaitTimeInMinutes = 5;
    const remainingTime = stage.timeLimitInMinutes - elapsedMinutes;
    const intervalTime = Math.min(maxWaitTimeInMinutes, remainingTime);

    // Wait for the determined interval time, and then re-trigger the function.
    await new Promise((resolve) => setTimeout(resolve, intervalTime * 60 * 1000));
    await app
      .firestore()
      .doc(
        `experiments/${event.params.experimentId}/cohorts/${event.params.cohortId}/publicStageData/${event.params.stageId}`,
      )
      .update({ discussionCheckpointTimestamp: Timestamp.now() });
  },
);

/** When chat message is created, generate mediator response if relevant. */
export const createMediatorMessage = onDocumentCreated(
  {
    document:
      'experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}/chats/{chatId}',
    timeoutSeconds: 60, // Maximum timeout of 1 minute for typing delay.
  },
  async (event) => {
    const data = event.data?.data() as ChatMessage | undefined;

    // Use experiment config to get ChatStageConfig with mediators.
    let stage = await getChatStage(event);
    if (!stage) {
      return;
    }

    let publicStageData = await getChatStagePublicData(event);
    // Make sure the conversation hasn't ended.
    if (!publicStageData || Boolean(publicStageData.discussionEndTimestamp)) return;

    // Fetch experiment creator's API key.
    const creatorId = (
      await app.firestore().collection('experiments').doc(event.params.experimentId).get()
    ).data().metadata.creator;
    const creatorDoc = await app.firestore().collection('experimenterData').doc(creatorId).get();
    if (!creatorDoc.exists) return;

    const experimenterData = creatorDoc.data() as ExperimenterData;

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

      // Call LLM API with given modelCall info
      const response = await getMediatorResponse(experimenterData, prompt);

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

    // Refresh the stage to check if the conversation has ended.
    stage = await getChatStage(event);
    publicStageData = await getChatStagePublicData(event);

    if (
      !stage ||
      !publicStageData ||
      Boolean(publicStageData.discussionEndTimestamp) ||
      (await hasEndedChat(event, stage, publicStageData))
    )
      return;

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
    if (numChatsAfterMediator > numChatsBeforeMediator) {
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

async function getMediatorResponse(data: ExperimenterData, prompt: string): Promise<ModelResponse> {
  const keyType = data.activeApiKeyType;
  let response;

  if (keyType === ApiKeyType.GEMINI_API_KEY) {
    response =  getGeminiResponse(data, prompt);
  } else if (keyType === ApiKeyType.LLAMA_CUSTOM_URL) {
    response = await getLlamaResponse(data, prompt);
  } else {
    console.log("Error: invalid apiKey type: ", keyType)
    response = {text: ""};
  }

  return response
}

async function getGeminiResponse(data: ExperimenterData, prompt: string): Promise<ModelResponse> {
  return await getGeminiAPIResponse(data.geminiApiKey, prompt);
}

async function getLlamaResponse(data: ExperimenterData, prompt: string): Promise<ModelResponse> {
  // TODO: make model_type field available to settings page (text field?)
  // keep in mind that any models need to be pulled and deployed on the server first
  return await ollamaChat([prompt], "llama3.2", data.llamaApiKey);
}