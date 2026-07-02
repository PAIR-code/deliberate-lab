import {
  AgentChatSettings,
  ChatMediatorStructuredOutputConfig,
  ChatMessage,
  ChatPromptConfig,
  ChatStageConfig,
  ChatStagePublicData,
  PrivateChatStageConfig,
  extractChatMediatorStructuredFields,
  getStructuredOutput,
  getTurnCycleInfo,
  getTurnCycleStatusForPrompt,
  MediatorProfileExtended,
  ModelResponse,
  ModelResponseStatus,
  ParticipantProfileExtended,
  StageConfig,
  StageKind,
  UserType,
  awaitTypingDelay,
  createChatMessage,
  createParticipantProfileBase,
  createSystemChatMessage,
  getRepresentativeProfile,
  sanitizeRawResponseForLogging,
  shuffleWithSeed,
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
  getFirestoreExperiment,
  getFirestoreParticipant,
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
import {
  getRoundTreatmentIndex,
  treatmentAtIndexHasRepresentative,
} from '../treatment.utils';
import {app} from '../app';
import {
  getChatMessageStoragePath,
  uploadModelResponseFiles,
} from '../utils/storage';
import {updateModelLogFiles} from '../log.utils';

// ****************************************************************************
// Functions for preparing, querying, and organizing agent chat responses.
// ****************************************************************************

// 300s cloud function timeout minus 10s buffer for skip handler.
const TURN_BASED_AGENT_RETRY_TIMEOUT_MS = 290000;

/**
 * For a private chat in a `_hasRepresentative` round, the mediator is shown
 * as the participant's representative. Returns that display profile, or null
 * when it doesn't apply (not a private chat, not a mediator, or the round's
 * treatment lacks `_hasRepresentative`). Read from the round's treatment
 * because hoisting only happens later, at the transfer.
 */
async function getPrivateChatRepProfileOverride(
  experimentId: string,
  stage: StageConfig,
  participantIds: string[],
  user: ParticipantProfileExtended | MediatorProfileExtended,
): Promise<{name: string; avatar: string} | null> {
  if (stage.kind !== StageKind.PRIVATE_CHAT) return null;
  if (user.type !== UserType.MEDIATOR) return null;
  const humanId = participantIds[0];
  if (!humanId) return null;
  const human = await getFirestoreParticipant(experimentId, humanId);
  if (!human?.variableMap) return null;
  const experiment = await getFirestoreExperiment(experimentId);
  const stageIds = experiment?.stageIds ?? [];
  const stageIndex = stageIds.indexOf(stage.id);
  if (stageIndex < 0) return null;
  const roundIndex = await getRoundTreatmentIndex(
    experimentId,
    stageIds,
    stageIndex,
  );
  if (roundIndex === null) return null;
  if (!treatmentAtIndexHasRepresentative(human.variableMap, roundIndex)) {
    return null;
  }
  return getRepresentativeProfile(String(human.name || human.publicId));
}

// Fast-failing transient gRPC status codes for which a Firestore write is worth
// retrying: UNKNOWN(2), DEADLINE_EXCEEDED(4), ABORTED(10), INTERNAL(13),
// UNAVAILABLE(14). Under load the local emulator intermittently fails a commit
// with "2 UNKNOWN" or blows the ~60s client deadline ("4 DEADLINE_EXCEEDED");
// without a retry that surfaces as an unhandled error that kills the function
// and stalls the turn-based chat (the message is never written, the turn never
// advances). A fresh commit on retry typically succeeds once the load clears,
// so retrying beats letting the chat go silent.
const TRANSIENT_FIRESTORE_CODES = new Set([2, 4, 10, 13, 14]);
async function firestoreWriteWithRetry<T>(
  op: () => Promise<T>,
  attempts = 4,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await op();
    } catch (error) {
      lastError = error;
      const code = (error as {code?: number})?.code;
      if (
        !TRANSIENT_FIRESTORE_CODES.has(code as number) ||
        i === attempts - 1
      ) {
        throw error;
      }
      console.warn(
        `[chat.agent] Transient Firestore write error (code ${code}); retry ${i + 1}/${attempts - 1}`,
      );
      await new Promise((resolve) => setTimeout(resolve, 250 * (i + 1)));
    }
  }
  throw lastError;
}

/** Use persona chat prompt to create and send agent chat message. */
export async function createAgentChatMessageFromPrompt(
  experimentId: string,
  cohortId: string, // cohort triggering this message (group chat)
  participantIds: string[], // participant IDs for context and stageData access
  stageId: string,
  triggerChatId: string, // ID of chat that is being responded to (empty string for initial message)
  // Profile of agent who will be sending the chat message
  user: ParticipantProfileExtended | MediatorProfileExtended,
  turnBasedRetryDeadlineMs?: number,
) {
  if (!user.agentConfig) {
    console.log(`[chat.agent] User ${user.publicId} has no agentConfig`);
    return false;
  }

  // Inactive personas supply persona context to other agents'
  // prompts but never post chat messages themselves.
  if (
    user.type === UserType.PARTICIPANT &&
    user.agentConfig.isInactivePersona
  ) {
    return false;
  }

  // Stage (in order to determine stage kind)
  const stage = await getFirestoreStage(experimentId, stageId);
  if (!stage) {
    console.log(`[chat.agent] Stage ${stageId} not found`);
    return false;
  }

  // Cosmetic: in `_hasRepresentative` conditions the private chat is
  // presented as conducted by the participant's representative. Computed once;
  // null unless this is a private-chat mediator message in such a condition.
  const repProfileOverride = await getPrivateChatRepProfileOverride(
    experimentId,
    stage,
    participantIds,
    user,
  );

  // Fetches stored (else default) prompt config for given stage
  const promptConfig = (await getStructuredPromptConfig(
    experimentId,
    stage,
    user,
  )) as ChatPromptConfig | undefined;

  if (!promptConfig) {
    console.log(
      `[chat.agent] PromptConfig not found for user ${user.publicId} in stage ${stageId}`,
    );
    return false;
  }

  const isPrivateChat = stage.kind === StageKind.PRIVATE_CHAT;
  const isTurnBasedGroupChat =
    stage.kind === StageKind.CHAT && (stage as ChatStageConfig).isTurnBased;
  // Group-style turn-based private chats retry transient model errors until
  // the deadline too: the participant is blocked waiting on the mediator, so
  // we mirror the group-chat turn-based behavior rather than erroring out.
  const isTurnBasedPrivateChat =
    stage.kind === StageKind.PRIVATE_CHAT &&
    (stage as PrivateChatStageConfig).isTurnBasedChatGroupStyle;
  const retryDeadlineMs =
    turnBasedRetryDeadlineMs ??
    (isTurnBasedGroupChat || isTurnBasedPrivateChat
      ? Date.now() + TURN_BASED_AGENT_RETRY_TIMEOUT_MS
      : undefined);

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

    const shouldSendInitialMessage = await app
      .firestore()
      .runTransaction(async (transaction) => {
        const triggerLog = await transaction.get(triggerLogRef);
        if (triggerLog.exists) return false;

        transaction.create(triggerLogRef, {timestamp: Timestamp.now()});
        return true;
      });

    if (!shouldSendInitialMessage) {
      return false; // Already sent initial message
    }
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
      retryDeadlineMs,
    );
    message = response.message;
    if (!message) {
      if (isTurnBasedGroupChat && response.retryTimedOut) {
        // Clean up the initial trigger log lock if it timed out and we are skipping the agent
        if (triggerChatId === '') {
          const triggerLogId = `initial-${user.publicId}`;
          const triggerLogRef = getGroupChatTriggerLogRef(
            experimentId,
            cohortId,
            stageId,
            triggerLogId,
          );
          await triggerLogRef.delete();
        }

        await skipTimedOutTurnBasedAgentTurn(
          experimentId,
          cohortId,
          stage,
          triggerChatId,
          user,
        );
        return true;
      }

      if (triggerChatId === '') {
        const triggerLogId = `initial-${user.publicId}`;
        console.log(
          `[chat.agent] getAgentChatMessage failed for initial message. Deleting trigger log: ${triggerLogId}`,
        );
        const isTurnBased =
          stage?.kind === StageKind.CHAT &&
          (stage as ChatStageConfig).isTurnBased;

        let triggerLogRef;
        if (isTurnBased) {
          triggerLogRef = getGroupChatTriggerLogRef(
            experimentId,
            cohortId,
            stageId,
            triggerLogId,
          );
        } else {
          triggerLogRef = app
            .firestore()
            .collection('experiments')
            .doc(experimentId)
            .collection('cohorts')
            .doc(cohortId)
            .collection('publicStageData')
            .doc(stageId)
            .collection('agentInitialTriggerLog')
            .doc(triggerLogId);
        }
        await triggerLogRef.delete();
      }
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
    if (repProfileOverride && message) {
      // Present the mediator as the participant's representative.
      message.profile = {
        ...message.profile,
        name: repProfileOverride.name,
        avatar: repProfileOverride.avatar,
      };
    }
    await sendAgentPrivateChatMessage(
      experimentId,
      privateChatParticipantId,
      stageId,
      triggerChatId,
      message,
      promptConfig.chatSettings,
    );
  } else {
    await sendAgentGroupChatMessage(
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
  turnBasedRetryDeadlineMs?: number,
): Promise<{
  message: ChatMessage | null;
  success: boolean;
  retryTimedOut: boolean;
}> {
  const stageId = stage.id;

  // Fetch experiment creator's API key.
  const experimenterData =
    await getExperimenterDataFromExperiment(experimentId);
  if (!experimenterData) {
    return {message: null, success: false, retryTimedOut: false};
  }

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

  // For turn-based conversation, ensure it is the agent's turn
  const isTurnBasedGroupChat =
    stage.kind === StageKind.CHAT && (stage as ChatStageConfig).isTurnBased;
  const isTurnBasedPrivateChat =
    stage.kind === StageKind.PRIVATE_CHAT &&
    (stage as PrivateChatStageConfig).isTurnBasedChatGroupStyle;
  let chatPublicData: ChatStagePublicData | undefined;
  if (isTurnBasedGroupChat) {
    chatPublicData = (await getFirestoreStagePublicData(
      experimentId,
      cohortId,
      stageId,
    )) as ChatStagePublicData;
    if (
      chatPublicData &&
      chatPublicData.currentTurnParticipantId !== user.publicId
    ) {
      return {message: null, success: true, retryTimedOut: false};
    }
  }

  // Confirm that agent can send chat messages based on prompt config
  const chatSettings = promptConfig.chatSettings;
  if (!canSendAgentChatMessage(user.publicId, chatSettings, chatMessages)) {
    return {message: null, success: true, retryTimedOut: false};
  }

  // Ensure user has agent config
  if (!user.agentConfig) {
    return {message: null, success: false, retryTimedOut: false};
  }

  // Use provided participant IDs for prompt context
  // Get structured prompt
  let structuredPrompt = await getPromptFromConfig(
    experimentId,
    cohortId,
    stageId,
    user,
    promptConfig,
    participantIds, // Pass participant IDs to limit context scope (e.g., for private chats)
  );

  // For a turn-based group chat with a fixed message cap, tell the agent
  // (participant or mediator) which cycle it is in and how many remain, so it
  // can pace its contribution. No-op when not turn-based or there is no cap.
  if (isTurnBasedGroupChat) {
    const cycleInfo = getTurnCycleInfo(
      chatPublicData,
      stage as ChatStageConfig,
    );
    if (cycleInfo) {
      structuredPrompt += `\n\n${getTurnCycleStatusForPrompt(
        cycleInfo.currentCycle,
        cycleInfo.totalCycles,
      )}`;
    }
  }

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
      stage,
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

  const retryDurationMs =
    (isTurnBasedGroupChat || isTurnBasedPrivateChat) &&
    turnBasedRetryDeadlineMs !== undefined
      ? Math.max(0, turnBasedRetryDeadlineMs - Date.now())
      : null;

  // In turn-based mode the agent always responds when called — strip shouldRespond
  // from the API-level schema constraint so the model isn't forced to output a
  // field whose "stay silent" path would freeze the turn. The prompt text is
  // already filtered in structured_prompt.utils.ts; this keeps the two in sync.
  const effectiveStructuredOutputConfig = (() => {
    const config = promptConfig.structuredOutputConfig as
      | ChatMediatorStructuredOutputConfig
      | undefined;
    if (!isTurnBasedGroupChat || !config?.schema?.properties) return config;
    const shouldRespondFieldName = config.shouldRespondField || 'shouldRespond';
    return {
      ...config,
      schema: {
        ...config.schema,
        properties: config.schema.properties.filter(
          (p) => p.name !== shouldRespondFieldName,
        ),
      },
      shouldRespondField: '',
    } as ChatMediatorStructuredOutputConfig;
  })();

  const {response, logId, retryTimedOut} = await processModelResponse(
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
    effectiveStructuredOutputConfig,
    isTurnBasedGroupChat || isTurnBasedPrivateChat
      ? null
      : (promptConfig.numRetries ?? 0),
    retryDurationMs,
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
    return {message: null, success: false, retryTimedOut};
  }

  const structured = effectiveStructuredOutputConfig as
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
    return {message: null, success: false, retryTimedOut};
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
    return {message: null, success: true, retryTimedOut};
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

  return {message: chatMessage, success: true, retryTimedOut};
}

async function getNextTurnBasedSpeakerAfterSkippedAgent(
  experimentId: string,
  cohortId: string,
  stage: ChatStageConfig,
  publicStageData: ChatStagePublicData,
  skippedPublicId: string,
  activeParticipants: ParticipantProfileExtended[],
  activeMediators: MediatorProfileExtended[],
  chatMessages: ChatMessage[],
): Promise<{
  currentTurnParticipantId: string;
  turnOrder: string[];
  cycleIndex: number;
  agent: ParticipantProfileExtended | MediatorProfileExtended | null;
} | null> {
  const participantIds = activeParticipants.map((p) => p.publicId);
  const mediatorIds = activeMediators.map((m) => m.publicId);
  const activeIds = new Set([...mediatorIds, ...participantIds]);

  let turnOrder = (publicStageData.turnOrder ?? []).filter((id) =>
    activeIds.has(id),
  );
  let cycleIndex = publicStageData.cycleIndex ?? 0;
  let nextIndex = turnOrder.indexOf(skippedPublicId);
  let attempts = 0;

  while (attempts < turnOrder.length) {
    if (nextIndex === -1 || nextIndex === turnOrder.length - 1) {
      cycleIndex += 1;

      let nextTurnOrder = [...turnOrder];
      if (mediatorIds.length > 0) {
        const currentMediators = turnOrder.filter((id) =>
          mediatorIds.includes(id),
        );
        const missingMediators = mediatorIds.filter(
          (id) => !turnOrder.includes(id),
        );
        const shuffledMissingMediators =
          missingMediators.length > 1
            ? shuffleWithSeed(
                missingMediators,
                `${cohortId}-new-mediators-${cycleIndex}`,
              )
            : missingMediators;
        const nextMediators = [
          ...currentMediators,
          ...shuffledMissingMediators,
        ];

        const hadMediators = turnOrder.some((id) => mediatorIds.includes(id));
        if (hadMediators) {
          const shuffledParticipants = shuffleWithSeed(
            participantIds,
            `${cohortId}-${cycleIndex}`,
          );
          nextTurnOrder = [...nextMediators, ...shuffledParticipants];
        } else {
          const currentParticipants = turnOrder.filter((id) =>
            participantIds.includes(id),
          );
          nextTurnOrder = [...nextMediators, ...currentParticipants];
        }
      }

      turnOrder = nextTurnOrder;
      nextIndex = 0;
    } else {
      nextIndex += 1;
    }

    const nextPublicId = turnOrder[nextIndex];
    const candidate =
      activeParticipants.find((p) => p.publicId === nextPublicId) ??
      activeMediators.find((m) => m.publicId === nextPublicId);

    if (
      !candidate ||
      candidate.publicId === skippedPublicId ||
      !activeIds.has(candidate.publicId)
    ) {
      attempts++;
      continue;
    }

    if (candidate.agentConfig) {
      const promptConfig = (await getStructuredPromptConfig(
        experimentId,
        stage,
        candidate,
      )) as ChatPromptConfig | undefined;

      if (
        promptConfig &&
        !canSendAgentChatMessage(
          candidate.publicId,
          promptConfig.chatSettings,
          chatMessages,
        )
      ) {
        attempts++;
        continue;
      }
    }

    return {
      currentTurnParticipantId: candidate.publicId,
      turnOrder,
      cycleIndex,
      agent: candidate.agentConfig ? candidate : null,
    };
  }

  return null;
}

export async function skipTimedOutTurnBasedAgentTurn(
  experimentId: string,
  cohortId: string,
  stage: ChatStageConfig,
  triggerChatId: string,
  user: ParticipantProfileExtended | MediatorProfileExtended,
  skipReason = 'a model error',
) {
  const [publicStageData, activeParticipants, activeMediators, chatMessages] =
    await Promise.all([
      getFirestoreStagePublicData(experimentId, cohortId, stage.id) as Promise<
        ChatStagePublicData | undefined
      >,
      getFirestoreActiveParticipants(experimentId, cohortId, stage.id, false),
      getFirestoreActiveMediators(
        experimentId,
        cohortId,
        stage.id,
        true,
        stage,
      ),
      getFirestorePublicStageChatMessages(experimentId, cohortId, stage.id),
    ]);

  if (publicStageData?.currentTurnParticipantId !== user.publicId) return;

  const nextSpeaker = await getNextTurnBasedSpeakerAfterSkippedAgent(
    experimentId,
    cohortId,
    stage,
    publicStageData,
    user.publicId,
    activeParticipants,
    activeMediators,
    chatMessages,
  );
  if (!nextSpeaker) return;

  const publicStageDataRef = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('cohorts')
    .doc(cohortId)
    .collection('publicStageData')
    .doc(stage.id);

  const didAdvance = await app
    .firestore()
    .runTransaction(async (transaction) => {
      const snapshot = await transaction.get(publicStageDataRef);
      const currentPublicStageData = snapshot.data() as
        | ChatStagePublicData
        | undefined;
      if (currentPublicStageData?.currentTurnParticipantId !== user.publicId) {
        return false;
      }

      transaction.set(
        publicStageDataRef,
        {
          currentTurnParticipantId: nextSpeaker.currentTurnParticipantId,
          turnOrder: nextSpeaker.turnOrder,
          cycleIndex: nextSpeaker.cycleIndex,
        },
        {merge: true},
      );
      return true;
    });

  if (!didAdvance) return;

  console.warn(
    `[chat.agent] Skipped timed-out turn for ${user.publicId}; next turn is ${nextSpeaker.currentTurnParticipantId}`,
  );

  const skipMessage = createSystemChatMessage({
    message: `${user.name ?? user.publicId} was skipped due to ${skipReason}.`,
    // Use the firebase-admin Timestamp for this backend write: the util's
    // default timestamp is a client-SDK (firebase/firestore) Timestamp, which
    // firebase-admin cannot serialize (crashes the write, stalling the chat).
    timestamp: Timestamp.now(),
  });
  await app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('cohorts')
    .doc(cohortId)
    .collection('publicStageData')
    .doc(stage.id)
    .collection('chats')
    .doc(skipMessage.id)
    .set(skipMessage);

  if (!nextSpeaker.agent) return;

  // The skip system message is now the latest message; use its id as the
  // trigger so the downstream "conversation has moved on" check in
  // sendAgentGroupChatMessage doesn't bail on the stale pre-skip id.
  const nextTriggerChatId = skipMessage.id;
  await createAgentChatMessageFromPrompt(
    experimentId,
    cohortId,
    nextSpeaker.agent.type === UserType.MEDIATOR
      ? activeParticipants.map((p) => p.privateId)
      : [nextSpeaker.agent.privateId],
    stage.id,
    nextTriggerChatId,
    nextSpeaker.agent,
  );
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
  const capStage = await getFirestoreStage(experimentId, stageId);
  const isTurnBasedGroup =
    capStage?.kind === StageKind.CHAT &&
    (capStage as ChatStageConfig).isTurnBased === true;

  // TODO: Decrease typing delay to account for LLM API call latencies?
  // TODO: Don't send message if conversation continues while agent is typing?
  if (chatSettings.wordsPerMinute) {
    // A turn-based chat's first message posts immediately.
    const isFirstMessage =
      isTurnBasedGroup &&
      triggerChatId === '' &&
      (
        await getFirestorePublicStageChatMessages(
          experimentId,
          cohortId,
          stageId,
        )
      ).every((m) => m.type === UserType.SYSTEM);
    if (!isFirstMessage) {
      await awaitTypingDelay(chatMessage.message, chatSettings.wordsPerMinute);
    }
  }

  // Read the live cohort state once for both the cap guard and the
  // conversation-moved-on check (avoids reading the chat history twice).
  const [capPublicData, chatHistory] = await Promise.all([
    getFirestoreStagePublicData(experimentId, cohortId, stageId) as Promise<
      ChatStagePublicData | undefined
    >,
    getFirestorePublicStageChatMessages(experimentId, cohortId, stageId),
  ]);

  // Hard cap: never append a message past the effective message limit. The
  // turn trigger ends the chat once the cap is reached, but an agent that began
  // generating beforehand (or a slow/duplicate call) must not post its now-stale
  // message past the limit. Drop it if the discussion already ended or the
  // cohort is already at the cap. The count excludes the message we are
  // about to write, so a message that itself reaches the cap is allowed.
  if (capPublicData?.discussionEndTimestamp) {
    console.log(
      'Discussion already ended; dropping message to respect the cap',
    );
    return true;
  }
  const effectiveCap =
    capPublicData?.effectiveMaxNumberOfMessages ??
    (capStage?.kind === StageKind.CHAT
      ? (capStage as ChatStageConfig).maxNumberOfMessages
      : null);
  if (effectiveCap != null) {
    const capCount = chatHistory.filter(
      (m) =>
        m.type !== UserType.SYSTEM &&
        !m.isError &&
        !(m as {isReasoningOnly?: boolean}).isReasoningOnly,
    ).length;
    if (capCount >= effectiveCap) {
      console.log(
        'Cohort at message cap; dropping message to respect the limit',
      );
      return true;
    }
  }

  // Check if the conversation has moved on,
  // i.e., trigger chat ID is no longer that latest message.
  // Skip this check for initial messages (empty triggerChatId).
  // Also skip it entirely for turn-based group chats: the turn order is
  // deterministic, so a newer message never means this agent's turn was
  // superseded. Dropping here would stall the whole turn-based chat.
  if (triggerChatId !== '' && !isTurnBasedGroup) {
    const nonSystemHistory = chatHistory.filter(
      (m) => m.type !== UserType.SYSTEM,
    );
    if (
      nonSystemHistory.length > 0 &&
      nonSystemHistory[nonSystemHistory.length - 1].id !== triggerChatId
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
    await firestoreWriteWithRetry(() => triggerResponseDoc.set({}));
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
  await firestoreWriteWithRetry(() => agentDocument.set(chatMessage));

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
  const privateStage = await getFirestoreStage(experimentId, stageId);
  const isTurnBasedPrivate =
    privateStage?.kind === StageKind.PRIVATE_CHAT &&
    (privateStage as PrivateChatStageConfig).isTurnBasedChatGroupStyle === true;

  // TODO: Decrease typing delay to account for LLM API call latencies?
  // TODO: Don't send message if conversation continues while agent is typing?
  if (chatSettings.wordsPerMinute) {
    // A turn-based chat's first message posts immediately.
    const isFirstMessage =
      isTurnBasedPrivate &&
      triggerChatId === '' &&
      (
        await getFirestorePrivateChatMessages(
          experimentId,
          participantId,
          stageId,
        )
      ).every((m) => m.type === UserType.SYSTEM);
    if (!isFirstMessage) {
      await awaitTypingDelay(chatMessage.message, chatSettings.wordsPerMinute);
    }
  }

  // Check if the conversation has moved on,
  // i.e., trigger chat ID is no longer that latest message.
  // Skip this check for initial messages (empty triggerChatId).
  // Also skip it entirely for group-style turn-based private chats: the turn
  // order is deterministic, so a newer message never means this agent's turn
  // was superseded. Dropping here would stall the whole turn-based chat.
  if (triggerChatId !== '' && !isTurnBasedPrivate) {
    const chatHistory = await getFirestorePrivateChatMessages(
      experimentId,
      participantId,
      stageId,
    );
    const nonSystemHistory = chatHistory.filter(
      (m) => m.type !== UserType.SYSTEM,
    );
    if (
      nonSystemHistory.length > 0 &&
      nonSystemHistory[nonSystemHistory.length - 1].id !== triggerChatId
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
    await firestoreWriteWithRetry(() => triggerResponseDoc.set({}));
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
  await firestoreWriteWithRetry(() => agentDocument.set(chatMessage));

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

  const stage = await getFirestoreStage(experimentId, stageId);
  const chatStage = stage as ChatStageConfig;

  // Send initial messages from agent mediators
  const agentMediators = await getFirestoreActiveMediators(
    experimentId,
    cohortId,
    stageId,
    true, // checkIsAgent = true
    stage ?? null,
  );

  if (chatStage.isTurnBased) {
    const publicStageData = await getFirestoreStagePublicData(
      experimentId,
      cohortId,
      stageId,
    );
    const chatPublicData = publicStageData as ChatStagePublicData;

    // If already initialized, append any new participants to the end of the
    // current turn order, and any new mediators to the end of the mediator
    // phase (after existing mediators, before participants). Never touch
    // currentTurnParticipantId — the in-flight onPublicChatMessageCreated
    // trigger already owns turn advancement.
    if (chatPublicData && chatPublicData.currentTurnParticipantId) {
      const publicStageDataRef = app
        .firestore()
        .collection('experiments')
        .doc(experimentId)
        .collection('cohorts')
        .doc(cohortId)
        .collection('publicStageData')
        .doc(stageId);

      await app.firestore().runTransaction(async (transaction) => {
        const snapshot = await transaction.get(publicStageDataRef);
        const currentData = snapshot.data() as ChatStagePublicData | undefined;
        if (!currentData || !currentData.currentTurnParticipantId) return;

        const turnOrder = currentData.turnOrder ?? [];
        const existingIds = new Set(turnOrder);
        const allMediatorIds = new Set(agentMediators.map((m) => m.publicId));

        const newMediatorIds = agentMediators
          .map((m) => m.publicId)
          .filter((id) => !existingIds.has(id));
        const newParticipantIds = allParticipants
          .filter((p) => !p.isObserver && !p.agentConfig?.isInactivePersona)
          .map((p) => p.publicId)
          .filter((id) => !existingIds.has(id));

        if (newMediatorIds.length === 0 && newParticipantIds.length === 0) {
          return;
        }

        // New mediators go after the last existing mediator (end of the
        // mediator phase); new participants go at the very end.
        const lastMediatorIdx = turnOrder.reduce(
          (last, id, i) => (allMediatorIds.has(id) ? i : last),
          -1,
        );

        const updatedTurnOrder = [
          ...turnOrder.slice(0, lastMediatorIdx + 1),
          ...newMediatorIds,
          ...turnOrder.slice(lastMediatorIdx + 1),
          ...newParticipantIds,
        ];

        transaction.set(
          publicStageDataRef,
          {turnOrder: updatedTurnOrder},
          {merge: true},
        );
      });

      return;
    }

    // If uninitialized
    if (!chatPublicData || !chatPublicData.currentTurnParticipantId) {
      const allPublicParticipantIds = allParticipants
        .filter((p) => !p.isObserver && !p.agentConfig?.isInactivePersona)
        .map((p) => p.publicId);
      const allMediatorIds = agentMediators.map((m) => m.publicId);

      // Shuffle participants with seed
      const seedString = `${cohortId}-0`;
      const shuffledParticipants = shuffleWithSeed(
        allPublicParticipantIds,
        seedString,
      );

      // Shuffle mediator order when conversation begins (only if multiple)
      const shuffledMediators =
        allMediatorIds.length > 1
          ? shuffleWithSeed(allMediatorIds, `${cohortId}-mediators`)
          : allMediatorIds;

      const turnOrder = [...shuffledMediators, ...shuffledParticipants];

      // Find the first eligible initial turn holder, skipping agents that
      // can't send yet (e.g., minMessagesBeforeResponding > 0).
      let currentTurnParticipantId: string | null = null;
      for (const id of turnOrder) {
        const mediatorCandidate = agentMediators.find((m) => m.publicId === id);
        const participantCandidate = allParticipants.find(
          (p) => p.publicId === id,
        );
        const candidate = mediatorCandidate ?? participantCandidate;
        if (!candidate) continue;

        if (candidate.agentConfig) {
          const candidatePromptConfig = (await getStructuredPromptConfig(
            experimentId,
            chatStage,
            candidate,
          )) as ChatPromptConfig | undefined;
          if (
            candidatePromptConfig &&
            !canSendAgentChatMessage(
              id,
              candidatePromptConfig.chatSettings,
              [], // no messages yet
            )
          ) {
            continue; // not eligible yet, try next
          }
        }

        currentTurnParticipantId = id;
        break;
      }
      if (!currentTurnParticipantId && turnOrder.length > 0) {
        currentTurnParticipantId = turnOrder[0];
      }

      // Update Firestore publicStageData
      const publicStageDataRef = app
        .firestore()
        .collection('experiments')
        .doc(experimentId)
        .collection('cohorts')
        .doc(cohortId)
        .collection('publicStageData')
        .doc(stageId);

      await publicStageDataRef.set(
        {
          currentTurnParticipantId,
          turnOrder,
          cycleIndex: 0,
        },
        {merge: true},
      );

      // Trigger an initial message if the first turn holder is an agent.
      if (currentTurnParticipantId) {
        const mediator = agentMediators.find(
          (m) => m.publicId === currentTurnParticipantId,
        );
        const participant = allParticipants.find(
          (p) => p.publicId === currentTurnParticipantId,
        );
        const agent =
          mediator ?? (participant?.agentConfig ? participant : null);

        if (agent) {
          await createAgentChatMessageFromPrompt(
            experimentId,
            cohortId,
            mediator ? allParticipantIds : [agent.privateId],
            stageId,
            '', // empty triggerChatId
            agent,
          );
        }
      }
      return; // Return so we don't run the default broadcast below!
    }
  }

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
  const agentParticipants = allParticipants.filter(
    (p) => p.agentConfig && !p.agentConfig.isInactivePersona,
  );

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
    true, // includeObservers = true
  );

  const stage = await getFirestoreStage(experimentId, stageId);

  // Get agent mediators
  const agentMediators = await getFirestoreActiveMediators(
    experimentId,
    cohortId,
    stageId,
    true, // checkIsAgent = true
    stage ?? null,
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
  const agentParticipants = allParticipants.filter(
    (p) => p.agentConfig && !p.agentConfig.isInactivePersona,
  );

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
