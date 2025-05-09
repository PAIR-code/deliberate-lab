import {
  AgentChatPromptConfig,
  AgentChatResponse,
  AgentChatSettings,
  ChatMessage,
  ChatStageConfig,
  ChatStagePublicData,
  ExperimenterData,
  MediatorStatus,
  ParticipantProfile,
  ParticipantProfileExtended,
  ParticipantStatus,
  StageKind,
  awaitTypingDelay,
  createAgentChatPromptConfig,
  createParticipantChatMessage,
  getDefaultChatPrompt,
  getTimeElapsed,
  structuredOutputEnabled,
} from '@deliberation-lab/utils';

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {Timestamp} from 'firebase-admin/firestore';
import {onCall} from 'firebase-functions/v2/https';

import {app} from '../app';
import {getAgentResponse} from '../agent.utils';
import {
  getExperimenterDataFromExperiment,
  getFirestoreActiveParticipants,
  getFirestoreStagePublicData,
} from '../utils/firestore';
import {getPastStagesPromptContext} from './stage.utils';

/** Get the chat stage configuration based on the event. */
export async function getChatStage(
  experimentId: string,
  stageId: string,
): Promise<ChatStageConfig | null> {
  const stageRef = app
    .firestore()
    .doc(`experiments/${experimentId}/stages/${stageId}`);

  const stageDoc = await stageRef.get();
  if (!stageDoc.exists) return null; // Return null if the stage doesn't exist.

  return stageDoc.data() as ChatStageConfig; // Return the stage data.
}

/** Get public data for the given chat stage. */
export async function getChatStagePublicData(
  experimentId: string,
  cohortId: string,
  stageId: string,
): Promise<ChatStagePublicData | null> {
  const data = await getFirestoreStagePublicData(
    experimentId,
    cohortId,
    stageId,
  );
  if (data?.kind !== StageKind.CHAT) return null; // Return null if the public stage data doesn't exist.

  return data as ChatStagePublicData; // Return the public stage data.
}

/** Get chat messages for given cohort and stage ID. */
export async function getChatMessages(
  experimentId: string,
  cohortId: string,
  stageId: string,
): Promise<ChatMessage[]> {
  try {
    return (
      await app
        .firestore()
        .collection(
          `experiments/${experimentId}/cohorts/${cohortId}/publicStageData/${stageId}/chats`,
        )
        .orderBy('timestamp', 'asc')
        .get()
    ).docs.map((doc) => doc.data() as ChatMessage);
  } catch (error) {
    console.log(error);
    return [];
  }
}

/** Get number of chat messages for given cohort and stage ID. */
export async function getChatMessageCount(
  experimentId: string,
  cohortId: string,
  stageId: string,
): Promise<number> {
  try {
    return (
      await app
        .firestore()
        .collection(
          `experiments/${experimentId}/cohorts/${cohortId}/publicStageData/${stageId}/chats`,
        )
        .count()
        .get()
    ).data().count;
  } catch (error) {
    console.log(error);
    return 0;
  }
}

/**
 * If all active participants in cohort are ready to end current discussion,
 * set currentDiscussionId to ID of next discussion in chat config list.
 */
export async function updateCurrentDiscussionIndex(
  experimentId: string,
  cohortId: string,
  stageId: string,
  publicStageData: ChatStagePublicData,
) {
  // Get active participants for given cohort
  const activeParticipants = await getFirestoreActiveParticipants(
    experimentId,
    cohortId,
  );

  // Check if active participants are ready to end current discussion
  const currentDiscussionId = publicStageData.currentDiscussionId;
  const isReadyToEndDiscussion = () => {
    const timestampMap = publicStageData.discussionTimestampMap;

    for (const participant of activeParticipants) {
      if (
        !timestampMap[currentDiscussionId] ||
        !timestampMap[currentDiscussionId][participant.publicId]
      ) {
        return false;
      }
    }
    return true;
  };

  if (!isReadyToEndDiscussion()) {
    return;
  }

  // If ready, get next discussion ID from stage config
  // and update currentDiscussionId accordingly
  const stage = (
    await app
      .firestore()
      .collection('experiments')
      .doc(experimentId)
      .collection('stages')
      .doc(stageId)
      .get()
  ).data() as ChatStageConfig;
  const currentIndex = stage.discussions.findIndex(
    (item) => item.id === currentDiscussionId,
  );
  if (currentIndex === stage.discussions.length - 1) {
    // If invalid or last discussion completed, set null
    publicStageData.currentDiscussionId = null;
  } else {
    publicStageData.currentDiscussionId =
      stage.discussions[currentIndex + 1].id;
  }

  return publicStageData;
}

/** Checks whether the chat has ended, returning true if ending chat. */
export async function hasEndedChat(
  experimentId: string,
  cohortId: string,
  stageId: string,
  chatStage: ChatStageConfig | null,
  publicStageData: ChatStagePublicData | null,
): Promise<boolean> {
  if (!chatStage || !publicStageData || !chatStage.timeLimitInMinutes)
    return false;

  const elapsedMinutes = getTimeElapsed(
    publicStageData.discussionStartTimestamp!,
    'm',
  );

  // Check if the elapsed time has reached or exceeded the time limit
  if (elapsedMinutes >= chatStage.timeLimitInMinutes) {
    await app
      .firestore()
      .doc(
        `experiments/${experimentId}/cohorts/${cohortId}/publicStageData/${stageId}`,
      )
      .update({discussionEndTimestamp: Timestamp.now()});
    return true; // Indicate that the chat has ended.
  }
  return false;
}

/** Return chat prompt that corresponds to agent. */
export async function getAgentChatPrompt(
  experimentId: string,
  stageId: string,
  agentId: string,
): AgentChatPromptConfig | null {
  const prompt = await app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('agents')
    .doc(agentId)
    .collection('chatPrompts')
    .doc(stageId)
    .get();

  if (!prompt.exists) {
    return null;
  }
  return prompt.data() as AgentChatPromptConfig;
}

/** Uses weighted sampling based on WPM to choose agent response. */
export function selectAgentResponseByWPM(agentResponses: AgentChatResponse[]) {
  const totalWPM = agentResponses.reduce(
    (sum, response) =>
      sum + (response.promptConfig.chatSettings.wordsPerMinute || 0),
    0,
  );
  const cumulativeWeights: number[] = [];
  let cumulativeSum = 0;
  for (const response of agentResponses) {
    const wpm = response.promptConfig.chatSettings.wordsPerMinute;
    cumulativeSum += wpm || 0;
    cumulativeWeights.push(cumulativeSum / totalWPM);
  }
  const random = Math.random();
  const chosenIndex = cumulativeWeights.findIndex((weight) => random <= weight);
  return agentResponses[chosenIndex];
}

/** Checks if current participant/mediator can send a chat message
 * (based on their agent config chat settings)
 */
export function canSendAgentChatMessage(
  id: string, // mediator ID or participant public ID
  chatSettings: AgentChatSettings,
  chatMessages: ChatMessage[], // history of chat messges
): boolean {
  // Return null if agent's number of chat messages exceeds maxResponses
  const chatsByAgent = chatMessages.filter((chat) => chat.senderId === id);

  if (
    chatSettings.maxResponses !== null &&
    chatsByAgent.length >= chatSettings.maxResponses
  ) {
    return false;
  }
  // Return null if minMessageBeforeResponding not met
  if (chatMessages.length < chatSettings.minMessagesBeforeResponding) {
    return false;
  }
  // Return null if not canSelfTriggerCalls and latest message is agent's
  const latestMessage =
    chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;
  if (!chatSettings.canSelfTriggerCalls && latestMessage?.senderId === id) {
    return false;
  }

  return true;
}

/** Queries API for, then parses, agent chat response. */
export async function getAgentChatAPIResponse(
  profile: ParticipantProfileBase,
  experimentId: string,
  profileId: string, // participant public ID or mediator ID
  pastStageContext: string,
  chatMessages: ChatMessage[], // TODO: Get in current stage
  agentConfig: ProfileAgentConfig,
  promptConfig: AgentChatPromptConfig,
  stageConfig: StageConfig,
): AgentChatResponse | null {
  // Fetch experiment creator's API key.
  const experimenterData =
    await getExperimenterDataFromExperiment(experimentId);
  if (!experimenterData) return null;

  // Confirm that agent can send chat messages based on prompt config
  const chatSettings = promptConfig.chatSettings;
  if (!canSendAgentChatMessage(profileId, chatSettings, chatMessages)) {
    return null;
  }

  // Create prompt
  const prompt = getDefaultChatPrompt(
    profile,
    agentConfig,
    pastStageContext,
    chatMessages,
    promptConfig,
    stageConfig,
  );

  const response = await getAgentResponse(
    experimenterData,
    prompt,
    agentConfig.modelSettings,
    promptConfig.generationConfig,
    promptConfig.structuredOutputConfig,
  );

  if (message.status !== ModelResponseStatus.OK) {
    // TODO: Surface the error to the experimenter.
    return null;
  }

  // Add agent message if non-empty
  let message = response.text!;
  let parsed = '';

  if (promptConfig.responseConfig?.isJSON) {
    // Reset message to empty before trying to fill with JSON response
    message = '';

    try {
      const cleanedText = response.text!
        .replace(/```json\s*|\s*```/g, '')
        .trim();
      parsed = JSON.parse(cleanedText);
    } catch {
      // Response is already logged in console during Gemini API call
      console.log('Could not parse JSON!');
      return null;
    }
    message = parsed[promptConfig.responseConfig?.messageField] ?? '';
  } else if (structuredOutputEnabled(promptConfig.structuredOutputConfig)) {
    // Reset message to empty before trying to fill with JSON response
    message = '';

    try {
      const cleanedText = response.text!
        .replace(/```json\s*|\s*```/g, '')
        .trim();
      parsed = JSON.parse(cleanedText);
    } catch {
      // Response is already logged in console during Gemini API call
      console.log('Could not parse JSON!');
      return null;
    }
    if (
      parsed[promptConfig.structuredOutputConfig.shouldRespondField] ??
      true
    ) {
      message = parsed[promptConfig.structuredOutputConfig.messageField] ?? '';
    }
  }

  // Check if message is empty
  const trimmed = message.trim();
  if (trimmed === '' || trimmed === '""' || trimmed === "''") {
    return null;
  }

  return {
    profile,
    profileId,
    agentId: agentConfig.agentId,
    promptConfig,
    parsed,
    message,
  };
}

export async function sendAgentChatMessage(
  chatMessage: ChatMessage,
  agentResponse: AgentChatResponse,
  numChatsBeforeAgent: number,
  experimentId: string,
  cohortId: string,
  stageId: string,
  chatId: string, // ID of chat that is being responded to
) {
  // Don't send a message if the conversation has moved on
  const numChatsAfterAgent = await getChatMessageCount(
    experimentId,
    cohortId,
    stageId,
  );
  if (numChatsAfterAgent > numChatsBeforeAgent) {
    // TODO: Write log to Firestore
    return;
  }

  // Wait for typing delay
  // TODO: Decrease typing delay to account for LLM API call latencies?
  // TODO: Don't send message if conversation continues while agent is typing?
  await awaitTypingDelay(
    agentResponse.message,
    agentResponse.promptConfig.chatSettings.wordsPerMinute,
  );

  // Don't send a message if the conversation already has a response
  // to the trigger message by the same type of agent (participant, mediator)
  const triggerResponseDoc = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('cohorts')
    .doc(cohortId)
    .collection('publicStageData')
    .doc(stageId)
    .collection('triggerLogs')
    .doc(`${chatId}-${chatMessage.type}`);
  const hasTriggerResponse = (await triggerResponseDoc.get()).exists;
  if (hasTriggerResponse) {
    return;
  }

  // Otherwise, log response to trigger message and send chat message
  triggerResponseDoc.set({});

  const agentDocument = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('cohorts')
    .doc(cohortId)
    .collection('publicStageData')
    .doc(stageId)
    .collection('chats')
    .doc(chatMessage.id);
  agentDocument.set(chatMessage);
}

/** Check if chat conversation has not yet been started
 * and if given agent participant should initiate the conversation.
 */
export async function initiateChatDiscussion(
  experimentId: string,
  cohortId: string,
  stageConfig: StageConfig,
  privateId: string,
  publicId: string,
  profile: ParticipantProfileBase,
  agentConfig: ProfileAgentConfig,
) {
  await app.firestore().runTransaction(async (transaction) => {
    const stageId = stageConfig.id;

    const numMessages = await getChatMessageCount(
      experimentId,
      cohortId,
      stageId,
    );
    if (numMessages > 0) return;

    const promptConfig =
      (await getAgentChatPrompt(experimentId, stageId, agentConfig.agentId)) ??
      createAgentChatPromptConfig(stageId, StageKind.CHAT, {
        promptContext:
          'You are a participant. Respond in a quick sentence if you would like to say something. Otherwise, do not respond.',
      });

    const chatMessages: ChatMessage[] = [];
    const publicStageData = await getChatStagePublicData(
      experimentId,
      cohortId,
      stageId,
    );

    const pastStageContext = promptConfig.promptSettings.includeStageHistory
      ? await getPastStagesPromptContext(
          experimentId,
          stageId,
          privateId,
          promptConfig.promptSettings.includeStageInfo,
        )
      : '';

    const response = await getAgentChatAPIResponse(
      profile, // profile
      experimentId,
      publicId,
      pastStageContext,
      chatMessages,
      agentConfig,
      promptConfig,
      stageConfig,
    );
    if (!response) return null;

    // Build chat message to send
    const explanation =
      response.parsed[
        response.promptConfig.structuredOutputConfig?.explanationField
      ] ?? '';
    const chatMessage = createParticipantChatMessage({
      profile: response.profile,
      discussionId: publicStageData.currentDiscussionId,
      message: response.message,
      timestamp: Timestamp.now(),
      senderId: response.profileId,
      agentId: response.agentId,
      explanation,
    });
    sendAgentChatMessage(
      chatMessage,
      response,
      chatMessages.length,
      experimentId,
      cohortId,
      stageId,
      '', // not responding to any chat ID because first message
    );
  });
}
