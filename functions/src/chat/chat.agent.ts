import {
  ChatMessage,
  ChatPromptConfig,
  MediatorProfileExtended,
  ModelResponseStatus,
  ParticipantProfileBase,
  ParticipantProfileExtended,
  ProfileAgentConfig,
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
} from '../utils/firestore';
import {app} from '../app';

// ****************************************************************************
// Functions for preparing, querying, and organizing agent chat responses.
// ****************************************************************************

/** Use persona chat prompt to create and send agent chat message. */
export async function createAgentChatMessageFromPrompt(
  experimentId: string,
  cohortId: string,
  stageId: string,
  triggerChatId: string, // ID of chat that is being responded to
  user: ParticipantProfileExtended | MediatorProfileExtended,
) {
  if (!user.agentConfig) return;

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

  const message = await getAgentChatMessage(
    experimentId,
    cohortId,
    stageId,
    user,
    user.publicId,
    user.privateId,
    user.agentConfig,
    promptConfig,
  );

  if (message) {
    // TODO: Account for both private/public chats
    sendAgentGroupChatMessage(
      experimentId,
      cohortId,
      stageId,
      triggerChatId,
      message,
      promptConfig.chatSettings,
    );
  }
}

/** Query for and return chat message for given agent and chat prompt configs. */
export async function getAgentChatMessage(
  experimentId: string,
  cohortId: string,
  stageId: string,
  userProfile: UserProfile, // profile of participant/mediator
  publicId: string, // public ID of participant/mediator
  privateId: string, // private ID of participant/mediator
  agentConfig: ProfileAgentConfig,
  promptConfig: ChatPromptConfig,
) {
  // Fetch experiment creator's API key.
  const experimenterData =
    await getExperimenterDataFromExperiment(experimentId);
  if (!experimenterData) return null;

  // Get chat messages
  // TODO: either from public data or private data
  const chatMessages = await getFirestorePublicStageChatMessages(
    experimentId,
    cohortId,
    stageId,
  );

  // Confirm that agent can send chat messages based on prompt config
  const chatSettings = promptConfig.chatSettings;
  if (!canSendAgentChatMessage(publicId, chatSettings, chatMessages)) {
    return null;
  }

  // Get prompt
  const prompt = await getStructuredPrompt(
    experimentId,
    cohortId,
    userProfile.type === UserType.PARTICIPANT ? privateId : null,
    stageId,
    agentConfig,
    promptConfig,
  );

  // Get response
  const response = await processModelResponse(
    experimentId,
    cohortId,
    stageId,
    userProfile,
    publicId,
    privateId,
    '', // description
    experimenterData.apiKeys,
    prompt,
    agentConfig.modelSettings,
    promptConfig.generationConfig,
    promptConfig.structuredOutputConfig,
  );

  // Process response
  if (response.status !== ModelResponseStatus.OK || !response.parsedResponse) {
    return null;
  }

  const structured = promptConfig.structuredOutputConfig;
  const shouldRespond = response.parsedResponse[structured.shouldRespondField];
  const message = response.parsedResponse[structured.messageField];
  const explanation = response.parsedResponse[structured.explanationField];
  const readyToEndChat = response.parsedResponse[structured.readyToEndField];

  if (readyToEndChat && userProfile.type === UserType.PARTICIPANT) {
    // Call ready to end chat update to stage public data
    updateParticipantReadyToEndChat(experimentId, stageId, privateId);
  }

  if (!shouldRespond) {
    return null;
  }

  return createChatMessage({
    type: userProfile.type,
    message,
    explanation,
    profile: createParticipantProfileBase(userProfile),
    senderId: publicId,
    agentId: agentConfig.agentId,
  });
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
  await awaitTypingDelay(chatMessage.message, chatSettings.wordsPerMinute);

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
    .doc(`${triggerChatId}-${chatMessage.type}`);
  const hasTriggerResponse = (await triggerResponseDoc.get()).exists;
  if (hasTriggerResponse) {
    console.log('Someone already responded');
    return;
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
