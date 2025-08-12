import {
  ChatMessage,
  ChatPromptConfig,
  MediatorProfileExtended,
  ModelResponseStatus,
  ParticipantProfileBase,
  ParticipantProfileExtended,
  ProfileAgentConfig,
  StageConfig,
  StageKind,
  UserProfile,
  UserType,
  awaitTypingDelay,
  createChatMessage,
  createParticipantProfileBase,
} from '@deliberation-lab/utils';
import {Timestamp} from 'firebase-admin/firestore';
import {processModelResponse} from '../agent.utils';
import {getStructuredPrompt} from '../prompt.utils';
import {updateParticipantReadyToEndChat} from '../stages/group_chat.utils';
import {
  getExperimenterDataFromExperiment,
  getFirestorePublicStageChatMessages,
  getFirestorePrivateChatMessages,
  getFirestoreStage,
  getFirestoreStagePublicData,
} from '../utils/firestore';
import {app} from '../app';

// ****************************************************************************
// Functions for preparing, querying, and organizing agent chat responses.
// ****************************************************************************

/** Use persona chat prompt to create and send agent chat message. */
export async function createAgentChatMessageFromPrompt(
  experimentId: string,
  cohortId: string, // cohort triggering this message (group chat)
  participantId: string, // participant ID used for stageData
  stageId: string,
  triggerChatId: string, // ID of chat that is being responded to
  // Profile of agent who will be sending the chat message
  user: ParticipantProfileExtended | MediatorProfileExtended,
) {
  if (!user.agentConfig) return false;

  const promptConfig = (
    await app
      .firestore()
      .collection('experiments')
      .doc(experimentId)
      .collection(
        user.type === UserType.PARTICIPANT
          ? 'agentParticipants'
          : 'agentMediators',
      )
      .doc(user.agentConfig.agentId)
      .collection('prompts')
      .doc(stageId)
      .get()
  ).data() as ChatPromptConfig;

  // Stage (in order to determin stage kind)
  const stage = await getFirestoreStage(experimentId, stageId);

  const response = await getAgentChatMessage(
    experimentId,
    cohortId,
    participantId,
    stage,
    user,
    promptConfig,
  );

  const message = response.message;
  if (!message) {
    return response.success;
  }

  if (stage?.kind === StageKind.PRIVATE_CHAT) {
    sendAgentPrivateChatMessage(
      experimentId,
      participantId,
      stageId,
      triggerChatId,
      message,
      promptConfig.chatSettings,
    );
  } else {
    sendAgentGroupChatMessage(
      experimentId,
      cohortId,
      stageId,
      triggerChatId,
      message,
      promptConfig.chatSettings,
    );
  }

  return true;
}

/** Query for and return chat message for given agent and chat prompt configs. */
export async function getAgentChatMessage(
  experimentId: string,
  cohortId: string,
  participantId: string, // participant used for stageData
  stage: StageConfig,
  // Agent who will be sending the message
  user: ParticipantProfileExtended | MediatorProfileExtended,
  promptConfig: ChatPromptConfig,
): Promise<{message: ChatMessage | null; success: boolean}> {
  const stageId = stage.id;

  // Fetch experiment creator's API key.
  const experimenterData =
    await getExperimenterDataFromExperiment(experimentId);
  if (!experimenterData) return {message: null, success: false};

  // Get chat messages from private/public data based on stage kind
  const chatMessages =
    stage.kind === StageKind.PRIVATE_CHAT
      ? await getFirestorePrivateChatMessages(
          experimentId,
          participantId,
          stageId,
        )
      : await getFirestorePublicStageChatMessages(
          experimentId,
          cohortId,
          stageId,
        );

  // Confirm that agent can send chat messages based on prompt config
  const chatSettings = promptConfig.chatSettings;
  if (!canSendAgentChatMessage(user.publicId, chatSettings, chatMessages)) {
    return {message: null, success: true};
  }

  // Get prompt
  const prompt = await getStructuredPrompt(
    experimentId,
    cohortId,
    participantId ? [participantId] : [],
    stageId,
    user,
    user.agentConfig,
    promptConfig,
  );

  // Get response
  const response = await processModelResponse(
    experimentId,
    cohortId,
    participantId,
    stageId,
    user,
    user.publicId,
    user.privateId,
    '', // description
    experimenterData.apiKeys,
    prompt,
    user.agentConfig.modelSettings,
    promptConfig.generationConfig,
    promptConfig.structuredOutputConfig,
  );

  // Process response
  if (response.status !== ModelResponseStatus.OK || !response.parsedResponse) {
    return {message: null, success: false};
  }

  const structured = promptConfig.structuredOutputConfig;
  const shouldRespond = response.parsedResponse[structured.shouldRespondField];
  const message = response.parsedResponse[structured.messageField];
  const explanation = response.parsedResponse[structured.explanationField];
  const readyToEndChat = response.parsedResponse[structured.readyToEndField];

  // Only if agent participant is ready to end chat
  if (readyToEndChat && user.type === UserType.PARTICIPANT) {
    // Call ready to end chat update to stage public data
    updateParticipantReadyToEndChat(experimentId, stageId, user.privateId);
  }

  if (!shouldRespond) {
    return {message: null, success: true};
  }

  // If stage includes discussions, figure out what discussion ID should be
  // used
  let discussionId = null;
  if (stage.kind === StageKind.CHAT && stage.discussions.length > 0) {
    const publicData = await getFirestoreStagePublicData(
      experimentId,
      cohortId,
      stageId,
    );
    discussionId = publicData?.currentDiscussionId ?? null;
  }

  const chatMessage = createChatMessage({
    type: user.type,
    discussionId,
    message,
    explanation,
    profile: createParticipantProfileBase(user),
    senderId: user.publicId,
    agentId: user.agentConfig.agentId,
  });
  return {message: chatMessage, success: true};
}

/** Sends agent chat message after typing delay and duplicate check. */
export async function sendAgentGroupChatMessage(
  experimentId: string,
  cohortId: string,
  stageId: string,
  triggerChatId: string, // ID of chat that is being responded to
  chatMessage: ChatMessage,
  chatSettings: AgentChatSettings,
) {
  // TODO: Decrease typing delay to account for LLM API call latencies?
  // TODO: Don't send message if conversation continues while agent is typing?
  if (chatSettings.wordsPerMinute) {
    await awaitTypingDelay(chatMessage.message, chatSettings.wordsPerMinute);
  }

  // Check if the conversation has moved on,
  // i.e., trigger chat ID is no longer that latest message
  const chatHistory = await getFirestorePublicStageChatMessages(
    experimentId,
    cohortId,
    stageId,
  );
  if (
    chatHistory.length > 0 &&
    chatHistory[chatHistory.length - 1].id !== triggerChatId
  ) {
    // TODO: Write chat log
    console.log('Conversation has moved on');
    return true; // expected outcome (TODO: return status enum)
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
    .doc(`${triggerChatId}-${chatMessage.type}`);
  const hasTriggerResponse = (await triggerResponseDoc.get()).exists;
  if (hasTriggerResponse) {
    console.log('Someone already responded');
    return true; // expected outcome (TODO: return status enum)
  }

  // Otherwise, log response ID as trigger message
  triggerResponseDoc.set({});

  // Send chat message
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

  chatMessage.timestamp = Timestamp.now();
  agentDocument.set(chatMessage);

  return true;
}

/** Sends agent chat message after typing delay and duplicate check. */
export async function sendAgentPrivateChatMessage(
  experimentId: string,
  participantId: string,
  stageId: string,
  triggerChatId: string, // ID of chat that is being responded to
  chatMessage: ChatMessage,
  chatSettings: AgentChatSettings,
) {
  // TODO: Decrease typing delay to account for LLM API call latencies?
  // TODO: Don't send message if conversation continues while agent is typing?
  if (chatSettings.wordsPerMinute) {
    await awaitTypingDelay(chatMessage.message, chatSettings.wordsPerMinute);
  }

  // Check if the conversation has moved on,
  // i.e., trigger chat ID is no longer that latest message
  const chatHistory = await getFirestorePrivateChatMessages(
    experimentId,
    participantId,
    stageId,
  );
  if (
    chatHistory.length > 0 &&
    chatHistory[chatHistory.length - 1].id !== triggerChatId
  ) {
    // TODO: Write chat log
    console.log('Conversation has moved on');
    return true; // expected outcome (TODO: return status enum)
  }

  // Don't send a message if the conversation already has a response
  // to the trigger message by the same type of agent (participant, mediator)
  const triggerResponseDoc = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('participants')
    .doc(participantId)
    .collection('stageData')
    .doc(stageId)
    .collection('triggerLogs')
    .doc(`${triggerChatId}-${chatMessage.type}`);
  const hasTriggerResponse = (await triggerResponseDoc.get()).exists;
  if (hasTriggerResponse) {
    console.log('Someone already responded');
    return true; // expected outcome (TODO: return status enum)
  }

  // Otherwise, log response ID as trigger message
  triggerResponseDoc.set({});

  // Send chat message
  const agentDocument = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('participants')
    .doc(participantId)
    .collection('stageData')
    .doc(stageId)
    .collection('privateChats')
    .doc(chatMessage.id);

  chatMessage.timestamp = Timestamp.now();
  agentDocument.set(chatMessage);

  return true;
}

/** Checks if current participant/mediator can send a chat message
 * (based on their agent config chat settings)
 */
export function canSendAgentChatMessage(
  id: string, // mediator public ID or participant public ID
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
