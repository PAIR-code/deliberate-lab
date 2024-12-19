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
  createAgentAgentChatMessage,
  AgentConfig,
  ChatStageConfig,
  ApiKeyType,
  ExperimenterData,
} from '@deliberation-lab/utils';

import { app } from '../app';
import { getGeminiAPIResponse } from '../api/gemini.api';
import { ollamaChat } from '../api/ollama.api';

export interface AgentMessage {
  agent: AgentConfig;
  parsed: any;
  message: string;
}

// ************************************************************************* //
// TRIGGER FUNCTIONS                                                         //
// ************************************************************************* //

/** When a chat message is created, start tracking elapsed time. */
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

/**
 * When chat public stage data is updated, update elapsed time
 * and potentially end the discussion.
 */
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

/** When chat message is created, generate agent response if relevant. */
export const createAgentMessage = onDocumentCreated(
  {
    document:
      'experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}/chats/{chatId}',
    timeoutSeconds: 60, // Maximum timeout of 1 minute for typing delay.
  },
  async (event) => {
    const data = event.data?.data() as ChatMessage | undefined;

    // Use experiment config to get ChatStageConfig with agents.
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

    // Fetch messages from all agents
    const agentMessages: AgentMessage[] = [];
    for (const agent of stage.agents) {
      const prompt = `${getPreface(agent)}\n${getChatHistory(chatMessages, agent)}\n${agent.responseConfig.formattingInstructions}`;

      // Call LLM API with given modelCall info
      const response = await getAgentResponse(experimenterData, prompt);

      // Add agent message if non-empty
      let message = response.text;
      let parsed = '';

      if (agent.responseConfig.isJSON) {
        // Reset message to empty before trying to fill with JSON response
        message = '';

        try {
          const cleanedText = response.text.replace(/```json\s*|\s*```/g, '').trim();
          parsed = JSON.parse(cleanedText);
        } catch {
          // Response is already logged in console during Gemini API call
          console.log('Could not parse JSON!');
        }
        message = parsed[agent.responseConfig.messageField] ?? '';
      }

      const trimmed = message.trim();
      if (trimmed === '' || trimmed === '""' || trimmed === "''") continue;
      agentMessages.push({ agent, parsed, message });
    }

    if (agentMessages.length === 0) return;

    // Show all of the potential messages.
    console.log('The following participants wish to speak:');
    agentMessages.forEach((message) => {
      console.log(
        `\t${message.agent.name}: ${message.message} (${message.agent.wordsPerMinute} WPM)`,
      );
    });

    // Weighted sampling based on wordsPerMinute (WPM)
    const totalWPM = agentMessages.reduce(
      (sum, message) => sum + (message.agent.wordsPerMinute || 0),
      0,
    );
    const cumulativeWeights: number[] = [];
    let cumulativeSum = 0;
    for (const message of agentMessages) {
      cumulativeSum += message.agent.wordsPerMinute || 0;
      cumulativeWeights.push(cumulativeSum / totalWPM);
    }
    const random = Math.random();
    const chosenIndex = cumulativeWeights.findIndex((weight) => random <= weight);
    const agentMessage = agentMessages[chosenIndex];
    // Randomly sample a message.
    const agent = agentMessage.agent;
    const message = agentMessage.message;
    const parsed = agentMessage.parsed;
    console.log(`${agent.name} has been chosen to speak (p=${cumulativeWeights[chosenIndex]})`);
    await awaitTypingDelay(message, agent.wordsPerMinute);

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
    const numChatsBeforeAgent = chatMessages.length;
    const numChatsAfterAgent = (
      await app
        .firestore()
        .collection(
          `experiments/${event.params.experimentId}/cohorts/${event.params.cohortId}/publicStageData/${event.params.stageId}/chats`,
        )
        .count()
        .get()
    ).data().count;
    if (numChatsAfterAgent > numChatsBeforeAgent) {
      return;
    }

    const chatMessage = createAgentAgentChatMessage({
      profile: { name: agent.name, avatar: agent.avatar, pronouns: null },
      discussionId: data.discussionId,
      message,
      timestamp: Timestamp.now(),
      agentId: agent.id,
      explanation: agent.responseConfig.isJSON
        ? (parsed[agent.responseConfig.explanationField] ?? '')
        : '',
    });
    const agentDocument = app
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
      transaction.set(agentDocument, chatMessage);
    });
  },
);

// ************************************************************************* //
// HELPER FUNCTIONS                                                          //
// ************************************************************************* //

/** Get the chat stage configuration based on the event. */
async function getChatStage(event: any): Promise<ChatStageConfig | null> {
  const stageRef = app
    .firestore()
    .doc(`experiments/${event.params.experimentId}/stages/${event.params.stageId}`);

  const stageDoc = await stageRef.get();
  if (!stageDoc.exists) return null; // Return null if the stage doesn't exist.

  return stageDoc.data() as ChatStageConfig; // Return the stage data.
}

/** Get public data for the given chat stage. */
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

/** Checks whether the chat has ended, returning true if ending chat. */
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

async function getAgentResponse(data: ExperimenterData, prompt: string): Promise<ModelResponse> {
  const keyType = data.activeApiKeyType;
  let response;

  if (keyType === ApiKeyType.GEMINI_API_KEY) {
    response =  getGeminiResponse(data, prompt);
  } else if (keyType === ApiKeyType.LLAMA_CUSTOM_URL) {
    response = await getOllamaResponse(data, prompt);
  } else {
    console.error("Error: invalid apiKey type: ", keyType)
    response = {text: ""};
  }

  return response
}

async function getGeminiResponse(data: ExperimenterData, prompt: string): Promise<ModelResponse> {
  return await getGeminiAPIResponse(data.geminiApiKey, prompt);
}

async function getOllamaResponse(data: ExperimenterData, prompt: string): Promise<ModelResponse> {
  return await ollamaChat([prompt], data.llamaApiKey);
}