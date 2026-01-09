import {
  AgentChatSettings,
  ChatMediatorStructuredOutputConfig,
  ChatMessage,
  ChatPromptConfig,
  ChatStagePublicData,
  extractChatMediatorStructuredFields,
  getStructuredOutput,
  MediatorProfileExtended,
  ModelResponseStatus,
  ParticipantProfileExtended,
  StageConfig,
  StageKind,
  UserType,
  awaitTypingDelay,
  createChatMessage,
  createParticipantProfileBase,
  sanitizeRawResponseForLogging,
} from '@deliberation-lab/utils';
import {Timestamp} from 'firebase-admin/firestore';
import {processModelResponse} from '../agent.utils';
import {
  getPromptFromConfig,
  getStructuredPromptConfig,
} from '../structured_prompt.utils';
import {resolveStringWithVariables} from '../variables.utils';
import {ModelMessage} from '../api/ai-sdk.api';
import {
  convertChatToMessages,
  shouldUseMessageFormat,
  MessageRole,
} from './message_converter.utils';
import {updateParticipantReadyToEndChat} from '../chat/chat.utils';
import {
  getExperimenterDataFromExperiment,
  getFirestorePublicStageChatMessages,
  getFirestorePrivateChatMessages,
  getFirestoreStage,
  getFirestoreStagePublicData,
  getFirestoreActiveMediators,
  getFirestoreActiveParticipants,
  getGroupChatTriggerLogRef,
  getPrivateChatTriggerLogRef,
  getFirestoreParticipantAnswerRef,
} from '../utils/firestore';
import {app} from '../app';
import {
  getChatMessageStoragePath,
  uploadModelResponseFiles,
} from '../utils/storage';
import {updateModelLogFiles} from '../log.utils';

// ****************************************************************************
// Functions for preparing, querying, and organizing agent chat responses.
// ****************************************************************************

/** Use persona chat prompt to create and send agent chat message. */
export async function createAgentChatMessageFromPrompt(
  experimentId: string,
  cohortId: string, // cohort triggering this message (group chat)
  participantIds: string[], // participant IDs for context and stageData access
  stageId: string,
  triggerChatId: string, // ID of chat that is being responded to (empty string for initial message)
  // Profile of agent who will be sending the chat message
  user: ParticipantProfileExtended | MediatorProfileExtended,
) {
  if (!user.agentConfig) return false;

  // Stage (in order to determine stage kind)
  const stage = await getFirestoreStage(experimentId, stageId);
  if (!stage) return false;

  // Fetches stored (else default) prompt config for given stage
  const promptConfig = (await getStructuredPromptConfig(
    experimentId,
    stage,
    user,
  )) as ChatPromptConfig | undefined;

  if (!promptConfig) {
    return false;
  }

  const isPrivateChat = stage.kind === StageKind.PRIVATE_CHAT;

  // Check if this is an initial message request (empty triggerChatId)
  if (triggerChatId === '') {
    // Check if we've already sent an initial message for this user

    // Build the appropriate trigger log reference based on chat type
    const triggerLogId = `initial-${user.publicId}`;
    const triggerLogRef = isPrivateChat
      ? getPrivateChatTriggerLogRef(
          experimentId,
          participantIds[0], // Use the first participant ID as the storage location
          stageId,
          triggerLogId,
        )
      : getGroupChatTriggerLogRef(
          experimentId,
          cohortId,
          stageId,
          triggerLogId,
        );

    const hasAlreadySent = (await triggerLogRef.get()).exists;
    if (hasAlreadySent) {
      return false; // Already sent initial message
    }

    // Mark that we're sending the initial message
    await triggerLogRef.set({timestamp: Timestamp.now()});
  }

  // Get the chat message (either initial or response)
  let message: ChatMessage | null = null;

  // For initial messages, check if there's a configured initial message
  if (triggerChatId === '') {
    const initialMessage = promptConfig.chatSettings?.initialMessage;
    if (initialMessage && initialMessage.trim() !== '') {
      // Resolve template variables in the initial message.
      // Only use participant variables for private chats.
      const resolvedMessage = await resolveStringWithVariables(
        initialMessage,
        experimentId,
        cohortId,
        isPrivateChat ? participantIds[0] : undefined,
      );

      message = createChatMessage({
        message: resolvedMessage,
        senderId: user.publicId,
        type: user.type,
        profile: createParticipantProfileBase(user),
        timestamp: Timestamp.now(),
      });
    }
  }

  // If no configured initial message or this is a regular response, query the API
  if (!message) {
    const response = await getAgentChatMessage(
      experimentId,
      cohortId,
      participantIds,
      stage,
      user,
      promptConfig,
    );
    message = response.message;
    if (!message) {
      return response.success;
    }
  }

  if (stage.kind === StageKind.PRIVATE_CHAT) {
    // For private chat, use the first participant's ID for storage location
    const privateChatParticipantId = participantIds[0];
    if (!privateChatParticipantId) {
      console.error(
        'No participant ID provided for private chat message storage',
      );
      return false;
    }
    sendAgentPrivateChatMessage(
      experimentId,
      privateChatParticipantId,
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
  participantIds: string[], // participant IDs for context and stageData access
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
          participantIds[0] || '', // Use first participant ID for private chat storage
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

  // Ensure user has agent config
  if (!user.agentConfig) {
    return {message: null, success: false};
  }

  // Use provided participant IDs for prompt context
  // Get structured prompt
  const structuredPrompt = await getPromptFromConfig(
    experimentId,
    cohortId,
    stageId,
    user,
    promptConfig,
    participantIds, // Pass participant IDs to limit context scope (e.g., for private chats)
  );

  // Check if we should use message-based format
  // Only for private chat with exactly one participant AND one mediator
  const isPrivateChat = stage.kind === StageKind.PRIVATE_CHAT;
  // Count active mediators for this stage
  let mediatorCount = 0;
  if (isPrivateChat) {
    const mediators = await getFirestoreActiveMediators(
      experimentId,
      cohortId,
      stageId,
      false, // checkIsAgent = false to get all mediators
    );
    mediatorCount = mediators.length;
  }

  const useMessageFormat = shouldUseMessageFormat(
    isPrivateChat,
    true, // allowMessageFormat, always true for now.
    participantIds.length,
    mediatorCount,
  );

  // Prepare prompt - either message-based or traditional string
  let prompt: string | ModelMessage[];
  if (useMessageFormat && isPrivateChat) {
    prompt = await convertToMessageFormat(
      experimentId,
      participantIds,
      stageId,
      user,
      structuredPrompt,
    );
  } else {
    prompt = structuredPrompt;
  }

  const {response, logId} = await processModelResponse(
    experimentId,
    cohortId,
    participantIds[0] || '', // Use first participant ID for logging/tracking
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
    promptConfig.numRetries ?? 0, // Pass numRetries from config
  );

  // Log response with sanitized rawResponse and files to avoid overwhelming console with file/image data
  const loggableResponse = {
    ...response,
    rawResponse: response.rawResponse
      ? sanitizeRawResponseForLogging(response.rawResponse)
      : undefined,
    files: response.files
      ? response.files.map((file) => ({
          mediaType: file.mediaType,
          base64: '[FILE DATA]',
        }))
      : undefined,
  };
  console.log(
    'getAgentChatMessage ModelResponse:',
    JSON.stringify(loggableResponse, null, 2),
  );

  // Process response
  if (response.status !== ModelResponseStatus.OK) {
    return {message: null, success: false};
  }

  const structured = promptConfig.structuredOutputConfig as
    | ChatMediatorStructuredOutputConfig
    | undefined;

  let message = response.text || ''; // Use response.text as the default message
  let explanation = ''; // From structured output schema field only
  const reasoning = response.reasoning || undefined; // From model's internal thinking
  let shouldRespond = true;
  let readyToEndChat = false;

  // Extract fields from structured output if enabled
  if (structured?.enabled) {
    const parsed = getStructuredOutput(response);
    if (parsed) {
      const fields = extractChatMediatorStructuredFields(parsed, structured);
      shouldRespond = fields.shouldRespond;
      if (fields.message !== null) {
        message = fields.message;
      }
      if (fields.explanation !== null) {
        explanation = fields.explanation;
      }
      readyToEndChat = fields.readyToEndChat;
    }
  }

  // No text and no files = failure
  if (!response.text && (!response.files || response.files.length === 0)) {
    return {message: null, success: false};
  }

  if (!shouldRespond) {
    // Logic for not responding (handled below)
  }

  // Only if agent participant is ready to end chat
  if (readyToEndChat && user.type === UserType.PARTICIPANT) {
    // Ensure we don't end chat on the very first message
    if (chatMessages.length > 0) {
      // Call ready to end chat update to stage public data
      if (stage.kind === StageKind.PRIVATE_CHAT) {
        const participantAnswerDoc = getFirestoreParticipantAnswerRef(
          experimentId,
          user.privateId,
          stageId,
        );
        await participantAnswerDoc.set({readyToEndChat: true}, {merge: true});
      } else {
        updateParticipantReadyToEndChat(experimentId, stageId, user.privateId);
      }
    }
  }

  if (!shouldRespond) {
    // If agent decides not to respond in private chat, they are ready to end
    if (
      stage.kind === StageKind.PRIVATE_CHAT &&
      user.type === UserType.PARTICIPANT &&
      chatMessages.length > 0
    ) {
      const participantAnswerDoc = getFirestoreParticipantAnswerRef(
        experimentId,
        user.privateId,
        stageId,
      );
      await participantAnswerDoc.set({readyToEndChat: true}, {merge: true});
    }
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
    // Type guard to ensure we have ChatStagePublicData
    if (publicData && 'currentDiscussionId' in publicData) {
      discussionId =
        (publicData as ChatStagePublicData).currentDiscussionId ?? null;
    }
  }

  // Generate chat message ID first so we can use it in the image storage path
  const chatMessage = createChatMessage({
    type: user.type,
    discussionId,
    message,
    explanation,
    reasoning,
    profile: createParticipantProfileBase(user),
    senderId: user.publicId,
    agentId: user.agentConfig.agentId,
    timestamp: Timestamp.now(),
  });

  // Upload files to GCS
  if (response.files && response.files.length > 0) {
    try {
      const storagePath = getChatMessageStoragePath(
        experimentId,
        stageId,
        chatMessage.id,
      );
      const storedFiles = await uploadModelResponseFiles(
        response.files,
        storagePath,
      );
      chatMessage.files = storedFiles;
      await updateModelLogFiles(experimentId, logId, storedFiles);
    } catch (error) {
      console.error('Error uploading files to GCS:', error);
    }
  }

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
  // Skip this check for initial messages (empty triggerChatId)
  if (triggerChatId !== '') {
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
  }

  // Don't send a message if the conversation already has a response
  // to the trigger message by the same type of agent (participant, mediator)
  // For initial messages (empty triggerChatId), skip this check as it's handled earlier
  if (triggerChatId !== '') {
    const triggerResponseDoc = getGroupChatTriggerLogRef(
      experimentId,
      cohortId,
      stageId,
      `${triggerChatId}-${chatMessage.type}`,
    );
    const hasTriggerResponse = (await triggerResponseDoc.get()).exists;
    if (hasTriggerResponse) {
      console.log('Someone already responded');
      return true; // expected outcome (TODO: return status enum)
    }

    // Otherwise, log response ID as trigger message
    triggerResponseDoc.set({});
  }

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
  // Skip this check for initial messages (empty triggerChatId)
  if (triggerChatId !== '') {
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
  }

  // Don't send a message if the conversation already has a response
  // to the trigger message by the same type of agent (participant, mediator)
  // For initial messages (empty triggerChatId), skip this check as it's handled earlier
  if (triggerChatId !== '') {
    const triggerResponseDoc = getPrivateChatTriggerLogRef(
      experimentId,
      participantId,
      stageId,
      `${triggerChatId}-${chatMessage.type}`,
    );
    const hasTriggerResponse = (await triggerResponseDoc.get()).exists;
    if (hasTriggerResponse) {
      console.log('Someone already responded');
      return true; // expected outcome (TODO: return status enum)
    }

    // Otherwise, log response ID as trigger message
    triggerResponseDoc.set({});
  }

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

/**
 * Convert chat history to message-based format for private chats.
 * Includes system prompt as the first message.
 */
async function convertToMessageFormat(
  experimentId: string,
  participantIds: string[],
  stageId: string,
  user: ParticipantProfileExtended | MediatorProfileExtended,
  systemPrompt: string,
): Promise<ModelMessage[]> {
  // Get chat history for private chat
  const chatHistory = await getFirestorePrivateChatMessages(
    experimentId,
    participantIds[0],
    stageId,
  );

  // Convert chat history to message format
  const messages = convertChatToMessages(chatHistory, user.type, {
    isPrivateChat: true,
    mediatorId: user.type === UserType.MEDIATOR ? user.publicId : undefined,
    participantId: participantIds[0],
    includeSystemPrompt: true,
  });

  // Add system prompt as first message
  if (systemPrompt) {
    messages.unshift({
      role: MessageRole.SYSTEM,
      content: systemPrompt,
    });
  }

  return messages;
}

/** Helper function to send initial chat messages when participants enter a chat stage */
export async function sendInitialChatMessages(
  experimentId: string,
  cohortId: string,
  stageId: string,
  triggeringParticipantId: string, // The participant who triggered this by entering the stage
) {
  const stage = await getFirestoreStage(experimentId, stageId);
  if (!stage) return;

  // Only handle chat stages
  if (stage.kind !== StageKind.CHAT && stage.kind !== StageKind.PRIVATE_CHAT) {
    return;
  }

  // Handle GROUP CHAT stages
  if (stage.kind === StageKind.CHAT) {
    await sendInitialGroupChatMessages(experimentId, cohortId, stageId);
    return;
  }

  // Handle PRIVATE CHAT stages
  if (stage.kind === StageKind.PRIVATE_CHAT) {
    await sendInitialPrivateChatMessages(
      experimentId,
      cohortId,
      stageId,
      triggeringParticipantId,
    );
    return;
  }
}

/** Send initial messages for group chat stages */
async function sendInitialGroupChatMessages(
  experimentId: string,
  cohortId: string,
  stageId: string,
) {
  // In group chat, participantId is not used for private data access
  // But we still need participant IDs for including stage context (e.g., survey answers)

  // Get all participants to provide context
  const allParticipants = await getFirestoreActiveParticipants(
    experimentId,
    cohortId,
    stageId,
    false, // checkIsAgent = false to get ALL participants
  );

  const allParticipantIds = allParticipants.map((p) => p.privateId);

  // Send initial messages from agent mediators
  const agentMediators = await getFirestoreActiveMediators(
    experimentId,
    cohortId,
    stageId,
    true, // checkIsAgent = true
  );

  for (const mediator of agentMediators) {
    await createAgentChatMessageFromPrompt(
      experimentId,
      cohortId,
      allParticipantIds, // Pass all participant IDs for full context
      stageId,
      '', // empty triggerChatId indicates initial message
      mediator,
    );
  }

  // Send initial messages from agent participants
  const agentParticipants = allParticipants.filter((p) => p.agentConfig);

  for (const participant of agentParticipants) {
    await createAgentChatMessageFromPrompt(
      experimentId,
      cohortId,
      [participant.privateId], // Pass agent's own ID as array
      stageId,
      '', // empty triggerChatId indicates initial message
      participant,
    );
  }
}

/** Send initial messages for private chat stages */
async function sendInitialPrivateChatMessages(
  experimentId: string,
  cohortId: string,
  stageId: string,
  triggeringParticipantId: string, // eslint-disable-line @typescript-eslint/no-unused-vars
) {
  // In private chat, each participant has their own private chat data
  // We need to send initial messages for each participant's private chat

  // Get all participants in this stage
  const allParticipants = await getFirestoreActiveParticipants(
    experimentId,
    cohortId,
    stageId,
    false, // checkIsAgent = false to get all participants
  );

  // Get agent mediators
  const agentMediators = await getFirestoreActiveMediators(
    experimentId,
    cohortId,
    stageId,
    true, // checkIsAgent = true
  );

  // For each participant (human or agent), send initial messages from agent mediators
  for (const participant of allParticipants) {
    for (const mediator of agentMediators) {
      await createAgentChatMessageFromPrompt(
        experimentId,
        cohortId,
        [participant.privateId], // Use each participant's ID as array for their private chat data
        stageId,
        '', // empty triggerChatId indicates initial message
        mediator,
      );
    }
  }

  // Also send initial messages from agent participants if they exist
  const agentParticipants = allParticipants.filter((p) => p.agentConfig);

  for (const agentParticipant of agentParticipants) {
    await createAgentChatMessageFromPrompt(
      experimentId,
      cohortId,
      [agentParticipant.privateId], // Use agent participant's own ID as array for their private chat
      stageId,
      '', // empty triggerChatId indicates initial message
      agentParticipant,
    );
  }
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
  // Return null if latest message is a system message about the agent leaving
  // TODO(#867):
  // Right now, these message are always sent from a matching public ID.
  // In the future, we should set up a system message that specifically records
  // "the given agent ID is ready to move on" rather than assuming any
  // system message with a matching ID message means the agent has left
  if (
    latestMessage?.type === UserType.SYSTEM &&
    latestMessage?.senderId === id
  ) {
    return false;
  }

  return true;
}
