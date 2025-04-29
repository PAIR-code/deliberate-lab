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

/** Builds prompt, checks settings, and returns parsed LLM response
 * for agent participant.
 */
export async function getAgentParticipantChatResponse(
  participant: ParticipantProfileExtended,
  chatMessages: ChatMessage[],
  experimentId: string,
  stageConfig: ChatStageConfig,
  experimenterData: ExperimenterData,
): AgentChatResponse | null {
  // Return null if status is not active or agent config doesn't exist
  if (
    participant.currentStatus !== ParticipantStatus.IN_PROGRESS ||
    !participant.agentConfig
  ) {
    return null;
  }

  // Get chat prompt
  const promptConfig =
    (await getAgentChatPrompt(
      experimentId,
      stageConfig.id,
      participant.agentConfig.agentId,
    )) ??
    createAgentChatPromptConfig(stageConfig.id, StageKind.CHAT, {
      promptContext:
        'You are a human participant playing as the avatar mentioned above. Respond in a quick sentence if you would like to say something. Make sure your response sounds like a human with the phrasing and punctuation people use when casually chatting and no animal sounds. Otherwise, do not respond.',
    });

  const chatSettings = promptConfig.chatSettings;
  if (
    !canSendAgentChatMessage(participant.publicId, chatSettings, chatMessages)
  ) {
    return null;
  }

  // Else, query API and return parsed response
  const response = await callChatAPI(
    experimentId,
    participant.privateId,
    participant.publicId,
    participant,
    participant.agentConfig,
    chatMessages,
    promptConfig,
    stageConfig,
    experimenterData,
  );
  if (response) {
    console.log(
      `\t${response.profile.name}: ${response.message} (WPM: ${chatSettings.wordsPerMinute})`,
    );
  }
  return response;
}

/** Selects agent response from set of relevant agents' responses
 *  (or null if none)
 */
export async function selectSingleAgentParticipantChatResponse(
  experimentId: string,
  participants: ParticipantProfileExtended[],
  chatMessages: ChatMessage[],
  stageConfig: ChatStageConfig,
  experimenterData: ExperimenterData,
): AgentChatResponse | null {
  const agentResponses: AgentChatResponse[] = [];
  // Generate responses for agent participants
  for (const participant of participants) {
    // TODO(vivcodes): Call agent participants asynchronously
    const response = await getAgentParticipantChatResponse(
      participant,
      chatMessages,
      experimentId,
      stageConfig,
      experimenterData,
    );
    if (response) {
      agentResponses.push(response);
    }
  }

  // If no responses, return
  if (agentResponses.length === 0) {
    console.log('No agent participants wish to speak');
    return null;
  }

  // TODO: Write logs to Firestore
  console.log('The following participants wish to speak:');
  agentResponses.forEach((response) => {
    const wpm = response.promptConfig.chatSettings.wordsPerMinute;
    console.log(
      `\t${response.profile.name}: ${response.message} (WPM: ${wpm})`,
    );
  });

  // Weighted sampling based on wordsPerMinute (WPM)
  const selectedResponse = selectAgentResponseByWPM(agentResponses);

  // TODO: Write log to Firestore
  console.log(
    `${selectedResponse?.profile.name} has been chosen out of ${agentResponses.length} agent participants with responses.`,
  );
  return selectedResponse ?? null;
}

/** Builds prompt, checks settings, and returns parsed LLM response
 * for agent mediator.
 */
export async function getAgentMediatorChatResponse(
  mediator: MediatorProfile,
  chatMessages: ChatMessage[],
  experimentId: string,
  stageConfig: ChatStageConfig,
  experimenterData: ExperimenterData,
): AgentChatResponse | null {
  // Return null if mediator status is not active or agent config doesn't exist
  if (
    mediator.currentStatus !== MediatorStatus.ACTIVE ||
    !mediator.agentConfig
  ) {
    return null;
  }

  // Get chat prompt
  const promptConfig = await getAgentChatPrompt(
    experimentId,
    stageConfig.id,
    mediator.agentConfig.agentId,
  );
  if (!promptConfig) {
    return null;
  }

  const chatSettings = promptConfig.chatSettings;
  if (!canSendAgentChatMessage(mediator.id, chatSettings, chatMessages)) {
    return null;
  }

  // Else, query API and return parsed response
  return await callChatAPI(
    experimentId,
    null,
    mediator.id,
    mediator,
    mediator.agentConfig,
    chatMessages,
    promptConfig,
    stageConfig,
    experimenterData,
  );
}

export async function callChatAPI(
  experimentId: string,
  privateId: string | null, // private participant ID or null if mediator
  profileId: string, // ID of participant or mediator
  profile: ParticipantProfileBase,
  agentConfig: ProfileAgentConfig,
  chatMessages: ChatMessage[],
  promptConfig: AgentChatPromptConfig,
  stageConfig: StageConfig,
  experimenterData: ExperimenterData,
) {
  try {
    const pastStageContext =
      promptConfig.promptSettings.includeStageHistory && privateId
        ? await getPastStagesPromptContext(
            experimentId,
            stageConfig.id,
            privateId,
            promptConfig.promptSettings.includeStageInfo,
          )
        : '';

    const prompt = getDefaultChatPrompt(
      profile,
      agentConfig,
      pastStageContext,
      chatMessages,
      promptConfig,
      stageConfig,
    );

    // Call LLM API with given modelCall info
    // TODO: Incorporate number of retries
    const response = await getAgentResponse(
      experimenterData,
      prompt,
      profile.agentConfig.modelSettings,
      promptConfig.generationConfig,
      promptConfig.structuredOutputConfig,
    );

    // Add agent message if non-empty
    let message = response.text;
    let parsed = '';

    if (promptConfig.responseConfig?.isJSON) {
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
        return null;
      }
      message = parsed[promptConfig.responseConfig?.messageField] ?? '';
    } else if (structuredOutputEnabled(promptConfig.structuredOutputConfig)) {
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
        return null;
      }
      if (
        parsed[promptConfig.structuredOutputConfig.shouldRespondField] ??
        true
      ) {
        message =
          parsed[promptConfig.structuredOutputConfig.messageField] ?? '';
      }
    }

    // Check if message is empty
    const trimmed = message.trim();
    if (trimmed === '' || trimmed === '""' || trimmed === "''") {
      return null;
    }

    const agentId = agentConfig.agentId;
    return {profile, profileId, agentId, promptConfig, parsed, message};
  } catch (error) {
    console.log(error); // TODO: Write log to backend
    return null;
  }
}

/** Selects agent response from set of relevant agents' responses
 *  (or null if none)
 */
export async function selectSingleAgentMediatorChatResponse(
  experimentId: string,
  mediators: MediatorProfile[],
  chatMessages: ChatMessage[],
  stageConfig: ChatStageConfig,
  experimenterData: ExperimenterData,
): AgentChatResponse | null {
  const agentResponses: AgentChatResponse[] = [];
  // Generate responses for agent mediators
  for (const mediator of mediators) {
    // TODO(vivcodes): Call agent mediators asynchronously
    const response = await getAgentMediatorChatResponse(
      mediator,
      chatMessages,
      experimentId,
      stageConfig,
      experimenterData,
    );
    if (response) {
      agentResponses.push(response);
    }
  }

  // If no responses, return
  if (agentResponses.length === 0) {
    console.log('No agent mediators wish to speak');
    return null;
  }

  // TODO: Write logs to Firestore
  console.log('The following participants wish to speak:');
  agentResponses.forEach((response) => {
    const wpm = response.promptConfig.chatSettings.wordsPerMinute;
    console.log(
      `\t${response.profile.name}: ${response.message} (WPM: ${wpm})`,
    );
  });

  // Weighted sampling based on wordsPerMinute (WPM)
  const selectedResponse = selectAgentResponseByWPM(agentResponses);

  // TODO: Write log to Firestore
  console.log(
    `${selectedResponse?.profile.name} has been chosen out of ${agentResponses.length} agent mediators with responses.`,
  );
  return selectedResponse ?? null;
}

/** Check if chat conversation has not yet been started
 * and if given agent participant should initiate the conversation.
 */
export async function initiateChatDiscussion(
  experimentId: string,
  cohortId: string,
  stageConfig: StageConfig,
  privateId: string,
  profileId: string,
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

    // Fetch experiment creator's API key.
    const experimenterData =
      await getExperimenterDataFromExperiment(experimentId);
    if (!experimenterData) return;

    // Get chat response
    const response = await callChatAPI(
      experimentId,
      privateId,
      profileId,
      profile,
      agentConfig,
      chatMessages,
      promptConfig,
      stageConfig,
      experimenterData,
    );

    const publicStageData = await getChatStagePublicData(
      experimentId,
      cohortId,
      stageId,
    );

    // Typing delay
    await awaitTypingDelay(
      response?.message ?? '',
      promptConfig.chatSettings.wordsPerMinute,
    );

    // If initial message has already been written, do not write initial
    // message
    const numChatsAfterAgent = await getChatMessageCount(
      experimentId,
      cohortId,
      stageConfig.id,
    );
    if (numChatsAfterAgent > 0) {
      return;
    }

    if (response) {
      // Write agent participant message to conversation
      const chatMessage = createParticipantChatMessage({
        profile,
        discussionId: publicStageData?.currentDiscussionId,
        message: response.message,
        timestamp: Timestamp.now(),
        senderId: profileId,
        agentId: agentConfig.agentId,
        explanation: response.promptConfig.responseConfig?.isJSON
          ? (response.parsed[
              response.promptConfig.responseConfig?.explanationField
            ] ?? '')
          : '',
      });
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

      transaction.set(agentDocument, chatMessage);
    }
  });
}
