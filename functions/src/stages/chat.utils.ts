import {
  AgentChatResponse,
  AgentChatSettings,
  ChatMessage,
  ChatPromptConfig,
  ChatStageConfig,
  ChatStageParticipantAnswer,
  ChatStagePublicData,
  ExperimenterData,
  MediatorStatus,
  ParticipantProfile,
  ParticipantProfileExtended,
  ParticipantStatus,
  StageKind,
  awaitTypingDelay,
  createChatPromptConfig,
  createChatStageParticipantAnswer,
  createParticipantChatMessage,
  createDefaultPromptFromText,
  getDefaultChatPrompt,
  getTimeElapsed,
  structuredOutputEnabled,
} from '@deliberation-lab/utils';

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {Timestamp} from 'firebase-admin/firestore';
import {onCall} from 'firebase-functions/v2/https';

import {ModelResponseStatus} from '../api/model.response';
import {app} from '../app';
import {getAgentResponse} from '../agent.utils';
import {updateParticipantNextStage} from '../participant.utils';
import {
  getExperimenterDataFromExperiment,
  getFirestoreActiveParticipants,
  getFirestoreExperiment,
  getFirestoreParticipantAnswer,
  getFirestoreParticipantAnswerRef,
  getFirestoreParticipantRef,
  getFirestoreStagePublicData,
} from '../utils/firestore';
import {getPastStagesPromptContext} from './stage.utils';

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

/** Return chat prompt that corresponds to agent. */
export async function getAgentChatPrompt(
  experimentId: string,
  stageId: string,
  agentId: string,
): ChatPromptConfig | null {
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
  return prompt.data() as ChatPromptConfig;
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
  promptConfig: ChatPromptConfig,
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
    experimenterData.apiKeys,
    prompt,
    agentConfig.modelSettings,
    promptConfig.generationConfig,
    promptConfig.structuredOutputConfig,
  );

  if (response.status !== ModelResponseStatus.OK) {
    // TODO: Surface the error to the experimenter.
    return null;
  }

  // Add agent message if non-empty
  let message = response.text!;
  let parsed = '';

  if (structuredOutputEnabled(promptConfig.structuredOutputConfig)) {
    // Reset message to empty before trying to fill with JSON response
    message = '';

    try {
      const cleanedText = response
        .text!.replace(/```json\s*|\s*```/g, '')
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
  // Wait for typing delay
  // TODO: Decrease typing delay to account for LLM API call latencies?
  // TODO: Don't send message if conversation continues while agent is typing?
  await awaitTypingDelay(
    agentResponse.message,
    agentResponse.promptConfig.chatSettings.wordsPerMinute,
  );

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
      createChatPromptConfig(stageId, {
        prompt: createDefaultPromptFromText(
          'You are a participant. Respond in a quick sentence if you would like to say something. Otherwise, do not respond.',
        ),
      });

    const chatMessages: ChatMessage[] = [];
    const publicStageData = await getFirestoreStagePublicData(
      experimentId,
      cohortId,
      stageId,
    );
    if (publicStageData?.kind !== StageKind.CHAT) {
      return;
    }

    // TODO: Check prompt items for whether to include history
    const pastStageContext = '';

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

/** Move on to next chat discussion if all participants are ready. */
export async function updateCurrentChatDiscussionId(
  experimentId: string,
  stage: ChatStageConfig,
  participant: ParticipantProfileExtended,
  answer: ChatStageParticipantAnswer,
) {
  // Define public stage document reference
  const publicDocument = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('cohorts')
    .doc(participant.currentCohortId)
    .collection('publicStageData')
    .doc(stage.id);

  await app.firestore().runTransaction(async (transaction) => {
    // Update public stage data
    const publicStageData = (
      await publicDocument.get()
    ).data() as StagePublicData;
    const discussionStatusMap = answer.discussionTimestampMap;

    for (const discussionId of Object.keys(discussionStatusMap)) {
      if (!publicStageData.discussionTimestampMap[discussionId]) {
        publicStageData.discussionTimestampMap[discussionId] = {};
      }
      publicStageData.discussionTimestampMap[discussionId][
        participant.publicId
      ] = discussionStatusMap[discussionId];
    }

    // Update current discussion ID if applicable
    await updateCurrentDiscussionIndex(
      experimentId,
      participant.currentCohortId,
      stage.id,
      publicStageData,
    );

    transaction.set(publicDocument, publicStageData);
  });
}

/** Update participant answer ready to end chat discussion. */
export async function updateParticipantReadyToEndChat(
  experimentId: string,
  stage: ChatStageConfig,
  publicStageData: ChatStagePublicData,
  participant: ParticipantProfileExtended,
) {
  const participantAnswerDoc = getFirestoreParticipantAnswerRef(
    experimentId,
    participant.privateId,
    stage.id,
  );
  const participantAnswer =
    (await getFirestoreParticipantAnswer(
      experimentId,
      participant.privateId,
      stage.id,
    )) ?? createChatStageParticipantAnswer({id: stage.id});

  // If threaded discussion (and not last thread), move to next thread
  if (
    stage.discussions.length > 0 &&
    publicStageData.currentDiscussionId &&
    publicStageData.currentDiscussionId !==
      stage.discussions[stage.discussions.length - 1]
  ) {
    // Set ready to end timestamp if not already set
    if (
      !participantAnswer.discussionTimestampMap[
        publicStageData.currentDiscussionId
      ]
    ) {
      participantAnswer.discussionTimestampMap[
        publicStageData.currentDiscussionId
      ] = Timestamp.now();

      await app.firestore().runTransaction(async (transaction) => {
        await transaction.set(participantAnswerDoc, participantAnswer);
      });
    }
  } else {
    // Otherwise, move to next stage
    const experiment = await getFirestoreExperiment(experimentId);
    await updateParticipantNextStage(
      experimentId,
      participant,
      experiment.stageIds,
    );

    const participantDoc = getFirestoreParticipantRef(
      experimentId,
      participant.privateId,
    );
    await app.firestore().runTransaction(async (transaction) => {
      await transaction.set(participantDoc, participant);
    });
  }
}
