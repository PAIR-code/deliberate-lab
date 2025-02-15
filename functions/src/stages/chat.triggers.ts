import {Timestamp} from 'firebase-admin/firestore';
import {
  onDocumentCreated,
  onDocumentUpdated,
} from 'firebase-functions/v2/firestore';
import {
  awaitTypingDelay,
  getTypingDelayInMs,
  ChatMessage,
  ChatMessageType,
  ChatStagePublicData,
  StageKind,
  addChatHistoryToPrompt,
  getPreface,
  getChatHistory,
  getTimeElapsed,
  createAgentMediatorChatMessage,
  AgentConfig,
  AgentGenerationConfig,
  ChatStageConfig,
  ExperimenterData,
} from '@deliberation-lab/utils';
import {getChatStage, getChatStagePublicData, hasEndedChat} from './chat.utils';

import {app} from '../app';
import {
  getAgentResponse,
  getGeminiResponse,
  getOllamaResponse,
} from '../agent.utils';

export interface AgentMessage {
  agent: AgentConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    const stage = await getChatStage(
      event.params.experimentId,
      event.params.stageId,
    );
    if (!stage) return;

    const publicStageData = await getChatStagePublicData(
      event.params.experimentId,
      event.params.cohortId,
      event.params.stageId,
    );
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
    document:
      'experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}/',
    timeoutSeconds: 360, // Maximum timeout of 6 minutes.
  },
  async (event) => {
    const publicStageData = await getChatStagePublicData(
      event.params.experimentId,
      event.params.cohortId,
      event.params.stageId,
    );
    if (!publicStageData) return;

    // Only update time if the conversation is in progress.
    if (
      !publicStageData.discussionStartTimestamp ||
      publicStageData.discussionEndTimestamp
    )
      return;

    const stage = await getChatStage(
      event.params.experimentId,
      event.params.stageId,
    );
    if (!stage || !stage.timeLimitInMinutes) return;
    // Maybe end the chat.
    if (
      await hasEndedChat(
        event.params.experimentId,
        event.params.cohortId,
        event.params.stageId,
        stage,
        publicStageData,
      )
    )
      return;

    // Calculate how long to wait.
    const elapsedMinutes = getTimeElapsed(
      publicStageData.discussionStartTimestamp,
      'm',
    );
    const maxWaitTimeInMinutes = 5;
    const remainingTime = stage.timeLimitInMinutes - elapsedMinutes;
    const intervalTime = Math.min(maxWaitTimeInMinutes, remainingTime);

    // Wait for the determined interval time, and then re-trigger the function.
    await new Promise((resolve) =>
      setTimeout(resolve, intervalTime * 60 * 1000),
    );
    await app
      .firestore()
      .doc(
        `experiments/${event.params.experimentId}/cohorts/${event.params.cohortId}/publicStageData/${event.params.stageId}`,
      )
      .update({discussionCheckpointTimestamp: Timestamp.now()});
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
    let stage = await getChatStage(
      event.params.experimentId,
      event.params.stageId,
    );
    if (!stage) {
      return;
    }

    let publicStageData = await getChatStagePublicData(
      event.params.experimentId,
      event.params.cohortId,
      event.params.stageId,
    );
    // Make sure the conversation hasn't ended.
    if (!publicStageData || Boolean(publicStageData.discussionEndTimestamp))
      return;

    // Fetch experiment creator's API key.
    const creatorId = (
      await app
        .firestore()
        .collection('experiments')
        .doc(event.params.experimentId)
        .get()
    ).data().metadata.creator;
    const creatorDoc = await app
      .firestore()
      .collection('experimenterData')
      .doc(creatorId)
      .get();
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
      const prompt = `${getPreface(agent, stage)}\n${getChatHistory(chatMessages, agent)}\n${agent.responseConfig.formattingInstructions}`;

      // Call LLM API with given modelCall info
      const response = await getAgentResponse(experimenterData, prompt, agent);

      // Add agent message if non-empty
      let message = response.text;
      let parsed = '';

      if (agent.responseConfig.isJSON) {
        // Reset message to empty before trying to fill with JSON response
        message = '';

        try {
          const cleanedText = response.text
            .replace(/```json\s*|\s*```/g, '')
            .trim();
          parsed = JSON.parse(cleanedText);
        } catch {
          // Response is already logged in console during Gemini API call
          console.log('Could not parse JSON!');
        }
        message = parsed[agent.responseConfig.messageField] ?? '';
      }

      const trimmed = message.trim();
      if (trimmed === '' || trimmed === '""' || trimmed === "''") continue;
      agentMessages.push({agent, parsed, message});
    }

    if (agentMessages.length === 0) return;

    // Show all of the potential messages.
    console.log('The following participants wish to speak:');
    agentMessages.forEach((message) => {
      console.log(
        `\t${message.agent.name}: ${message.message} (${message.agent.wordsPerMinute} WPM, ${getTypingDelayInMs(message.message, message.agent.wordsPerMinute) / 1000})`,
      );
    });

    // Weighted sampling based on wordsPerMinute (WPM)
    // TODO (#426): Refactor WPM logic into separate utils function
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
    const chosenIndex = cumulativeWeights.findIndex(
      (weight) => random <= weight,
    );
    const agentMessage = agentMessages[chosenIndex];
    // Randomly sample a message.
    const agent = agentMessage.agent;
    const message = agentMessage.message;
    const parsed = agentMessage.parsed;
    console.log(`${agent.name} has been chosen to speak.`);
    await awaitTypingDelay(message, agent.wordsPerMinute);

    // Refresh the stage to check if the conversation has ended.
    // TODO: Instead of doing this, run inside transaction?
    stage = await getChatStage(event.params.experimentId, event.params.stageId);
    publicStageData = await getChatStagePublicData(
      event.params.experimentId,
      event.params.cohortId,
      event.params.stageId,
    );

    if (
      !stage ||
      !publicStageData ||
      Boolean(publicStageData.discussionEndTimestamp) ||
      (await hasEndedChat(
        event.params.experimentId,
        event.params.cohortId,
        event.params.stageId,
        stage,
        publicStageData,
      ))
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

    const chatMessage = createAgentMediatorChatMessage({
      profile: {name: agent.name, avatar: agent.avatar, pronouns: null},
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
