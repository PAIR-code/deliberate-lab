import {
  AgentChatSettings,
  ChatMediatorStructuredOutputConfig,
  ChatMessage,
  ChatPromptConfig,
  ChatStageConfig,
  DEFAULT_AGENT_TIMEOUT_SECONDS,
  ChatStagePublicData,
  extractChatMediatorStructuredFields,
  getStructuredOutput,
  MediatorProfileExtended,
  ModelResponseStatus,
  ParticipantProfileExtended,
  ParticipantStatus,
  StageConfig,
  StageKind,
  UserType,
  awaitTypingDelay,
  createChatMessage,
  NEUTRAL_TIMEOUT_RESPONSES,
  TIMEOUT_ERROR_RESPONSE,
  createParticipantProfileBase,
  createSystemChatMessage,
  sanitizeRawResponseForLogging,
  shuffleWithSeed,
  Experiment,
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
  getFirestorePublicStageChatMessages,
  getFirestorePrivateChatMessages,
  getFirestoreStage,
  getFirestoreStagePublicData,
  getFirestoreActiveMediators,
  getFirestoreActiveParticipants,
  getFirestoreParticipantRef,
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
  turnBasedRetryDeadlineMs?: number,
) {
  if (!user.agentConfig) {
    console.log(`[chat.agent] User ${user.publicId} has no agentConfig`);
    return false;
  }

  // Stage (in order to determine stage kind)
  const stage = await getFirestoreStage(experimentId, stageId);
  if (!stage) {
    console.log(`[chat.agent] Stage ${stageId} not found`);
    return false;
  }

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
    (stage as {isTurnBasedChatGroupStyle?: boolean}).isTurnBasedChatGroupStyle;
  const agentTimeoutMs =
    ((stage as {agentTimeoutSeconds?: number}).agentTimeoutSeconds ??
      DEFAULT_AGENT_TIMEOUT_SECONDS) * 1000;
  const retryDeadlineMs =
    turnBasedRetryDeadlineMs ??
    (isTurnBasedGroupChat || isTurnBasedPrivateChat
      ? Date.now() + agentTimeoutMs
      : undefined);

  // An unexpected error on the turn-based path would otherwise kill the
  // trigger silently (nothing re-fires it). Retry the pipeline until the
  // stage's response deadline, like model errors; only once the deadline has
  // elapsed fall through to the fallback message/pop-up.
  const throwRetryDelayMs = 5000;
  for (;;) {
    try {
      return await runAgentChatMessagePipeline();
    } catch (error) {
      if (!isTurnBasedGroupChat && !isTurnBasedPrivateChat) {
        throw error;
      }
      console.error(
        `[chat.agent] Turn-based message pipeline failed for ${user.publicId}:`,
        error,
      );
      // Release the initial-message lock so a retry can re-enter.
      if (triggerChatId === '') {
        const triggerLogId = `initial-${user.publicId}`;
        const triggerLogRef = isPrivateChat
          ? getPrivateChatTriggerLogRef(
              experimentId,
              participantIds[0],
              stageId,
              triggerLogId,
            )
          : getGroupChatTriggerLogRef(
              experimentId,
              cohortId,
              stageId,
              triggerLogId,
            );
        await triggerLogRef.delete().catch(() => {});
      }
      if (retryDeadlineMs !== undefined && Date.now() < retryDeadlineMs) {
        await new Promise((resolve) => setTimeout(resolve, throwRetryDelayMs));
        continue;
      }
    }
    break;
  }
  {
    const outcome = await handleTurnBasedDeadEnd(
      experimentId,
      cohortId,
      stage,
      participantIds,
      user,
      triggerChatId,
    );
    if (outcome === null) {
      return true;
    }
    if (stage.kind === StageKind.PRIVATE_CHAT) {
      const privateChatParticipantId = participantIds[0];
      if (!privateChatParticipantId) {
        return false;
      }
      await sendAgentPrivateChatMessage(
        experimentId,
        privateChatParticipantId,
        stageId,
        triggerChatId,
        outcome,
        promptConfig.chatSettings,
      );
    } else {
      await sendAgentGroupChatMessage(
        experimentId,
        cohortId,
        stageId,
        triggerChatId,
        outcome,
        promptConfig.chatSettings,
      );
    }
    return true;
  }

  // Unreachable: every path above returns.

  async function runAgentChatMessagePipeline(): Promise<boolean> {
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
        // `deadlineReached` is set only when the model call hit the stage's
        // response deadline (see getAgentChatMessage / processModelResponse).
        // It is not set for other "no message" outcomes (empty response,
        // non-OK status, shouldRespond=false); those keep retrying as before.
        const deadlineReached = response.deadlineReached;
        // An empty/unusable response that exhausted its retry budget is, on the
        // turn-based path, also a dead end that must surface the restart pop-up:
        // otherwise the turn-holder stays set, no message re-fires the trigger,
        // and the chat freezes silently with no pop-up. Treat it like the
        // deadline here (the human can then restart).
        const emptyResponse = response.emptyResponse;
        // A permanent failure (no API key, no agent config) is the same dead
        // end: raise the pop-up immediately (no fallback message would help).
        const permanentFailure = response.permanentFailure;
        if (
          (isTurnBasedGroupChat || isTurnBasedPrivateChat) &&
          (deadlineReached || emptyResponse || permanentFailure)
        ) {
          const outcome = await handleTurnBasedDeadEnd(
            experimentId,
            cohortId,
            stage,
            participantIds,
            user,
            triggerChatId,
            permanentFailure === true,
          );
          if (outcome === null) {
            return true;
          }
          message = outcome;
        }

        if (!message && triggerChatId === '') {
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
        if (!message) {
          return response.success;
        }
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
}

/** On the turn-based path, a dead end (deadline, empty response, permanent
 * failure, or unexpected error) must not leave the turn silently stuck.
 * Claims a timeout response and returns it as the fallback chat message; when
 * none remains, raises the blocking API-failure pop-up (cleaning up the
 * initial trigger-log lock so a restart can retry) and returns null. */
async function handleTurnBasedDeadEnd(
  experimentId: string,
  cohortId: string,
  stage: StageConfig,
  participantIds: string[],
  user: ParticipantProfileExtended | MediatorProfileExtended,
  triggerChatId: string,
  // Permanent failures (bad key, invalid config) cannot improve on later
  // turns, so no fallback message is posted: raise the pop-up right away.
  permanent = false,
): Promise<ChatMessage | null> {
  const isTurnBasedGroupChat =
    stage.kind === StageKind.CHAT && (stage as ChatStageConfig).isTurnBased;
  const experiment = await getFirestoreExperiment(experimentId);
  const timeoutResponse = permanent
    ? null
    : await claimTimeoutResponse(
        experimentId,
        cohortId,
        stage,
        participantIds,
        experiment ?? undefined,
      );
  if (timeoutResponse === null) {
    // Clean up the initial trigger log lock so the agent can be retried
    // if the study is restarted (group chat owns this lock).
    if (isTurnBasedGroupChat && triggerChatId === '') {
      const triggerLogId = `initial-${user.publicId}`;
      const triggerLogRef = getGroupChatTriggerLogRef(
        experimentId,
        cohortId,
        stage.id,
        triggerLogId,
      );
      await triggerLogRef.delete();
    }

    // Do not skip or advance the turn. Surface a blocking pop-up to the
    // human participant(s) so they can restart the study.
    await markTurnBasedApiFailure(
      experimentId,
      cohortId,
      stage,
      participantIds,
    );
    return null;
  }

  // The agent sends the timeout message, so the turn completes and the
  // conversation continues.
  return createChatMessage({
    message: timeoutResponse,
    senderId: user.publicId,
    type: user.type,
    profile: createParticipantProfileBase(user),
    timestamp: Timestamp.now(),
  });
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
  // True ONLY when the genuine 120s RetryTimeoutError deadline was reached
  // (model never returned a usable response in time). Used to trigger the
  // turn-based "restart the study" pop-up. Not set for other null-message
  // outcomes (empty response, non-OK status, shouldRespond=false).
  deadlineReached: boolean;
  // True when the model returned an empty/unusable response after exhausting
  // its retry budget. On the turn-based path the caller treats this like the
  // deadline (surfaces the restart pop-up); other (non-turn-based) callers
  // ignore it.
  emptyResponse?: boolean;
  // True when the call can never succeed (no API key configured, no agent
  // config). On the turn-based path the caller treats this like the deadline,
  // immediately: waiting out the timeout would add no information.
  permanentFailure?: boolean;
}> {
  const stageId = stage.id;

  // Fetch experiment creator's API key.
  const experimenterData =
    await getExperimenterDataFromExperiment(experimentId);
  if (!experimenterData) {
    return {
      message: null,
      success: false,
      retryTimedOut: false,
      deadlineReached: false,
      permanentFailure: true,
    };
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
    (stage as {isTurnBasedChatGroupStyle?: boolean}).isTurnBasedChatGroupStyle;
  if (isTurnBasedGroupChat) {
    const publicStageData = await getFirestoreStagePublicData(
      experimentId,
      cohortId,
      stageId,
    );
    const chatPublicData = publicStageData as ChatStagePublicData;
    if (
      chatPublicData &&
      chatPublicData.currentTurnParticipantId !== user.publicId
    ) {
      return {
        message: null,
        success: true,
        retryTimedOut: false,
        deadlineReached: false,
      };
    }
  }

  // Confirm that agent can send chat messages based on prompt config
  const chatSettings = promptConfig.chatSettings;
  if (!canSendAgentChatMessage(user.publicId, chatSettings, chatMessages)) {
    return {
      message: null,
      success: true,
      retryTimedOut: false,
      deadlineReached: false,
    };
  }

  // Ensure user has agent config
  if (!user.agentConfig) {
    return {
      message: null,
      success: false,
      retryTimedOut: false,
      deadlineReached: false,
      permanentFailure: true,
    };
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
    // A non-OK status after exhausting the retry budget. If the retry
    // deadline was hit, flag it for the turn-based caller. Any other non-OK
    // escape is a status the retry loop deliberately fails fast on (e.g. a
    // bad API key or invalid config): deterministic, so nothing will improve
    // without intervention. Flag it as permanent so the turn-based caller
    // falls back immediately instead of leaving the turn silently stuck.
    return {
      message: null,
      success: false,
      retryTimedOut,
      deadlineReached: retryTimedOut,
      permanentFailure: !retryTimedOut,
    };
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

  // No text and no files = an empty/unusable response (status was OK) after
  // the empty-retry budget was already exhausted. This is NOT the genuine
  // 120s deadline, but on the turn-based path it is still a dead end: the
  // trigger does not re-fire on its own, so returning here silently freezes
  // the chat with no pop-up. Flag it so the turn-based caller surfaces the
  // restart pop-up instead of stalling. Non-turn-based callers ignore
  // emptyResponse.
  if (!response.text && (!response.files || response.files.length === 0)) {
    return {
      message: null,
      success: false,
      retryTimedOut,
      deadlineReached: false,
      emptyResponse: true,
    };
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
    return {
      message: null,
      success: true,
      retryTimedOut,
      deadlineReached: false,
    };
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

  return {
    message: chatMessage,
    success: true,
    retryTimedOut,
    deadlineReached: false,
  };
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
                `${cohortId}-${stage.id}-new-mediators-${cycleIndex}`,
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
            `${cohortId}-${stage.id}-${cycleIndex}`,
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

/**
 * Surfaces the blocking "restart the study" pop-up to the relevant HUMAN
 * (non-agent) participant(s) when a turn-based agent's model call reaches the
 * genuine 120s retry deadline still failing.
 *
 * Sets ParticipantStatus.API_FAILURE on:
 *   - group chat (StageKind.CHAT): all active non-agent participants in the cohort.
 *   - group-chat-style private chat (StageKind.PRIVATE_CHAT): participantIds[0].
 *
 * Only transitions participants whose currentStatus is an active/in-progress
 * state (IN_PROGRESS); never overwrites terminal/transfer states such as
 * BOOTED_OUT, SUCCESS, DELETED, or TRANSFER_*.
 */
/**
 * Reserve the next timeout message for the human participants in the failing
 * chat. Returns the error message, or a neutral response drawn without
 * replacement when the experiment opts into those. Once a participant has
 * reached the experiment's timeout message limit, returns null so the caller
 * ends the study instead. Unset limit means the chat continues indefinitely.
 */
async function claimTimeoutResponse(
  experimentId: string,
  cohortId: string,
  stage: StageConfig,
  participantIds: string[], // private participant IDs (private chat uses [0])
  experiment?: Experiment,
): Promise<string | null> {
  const targetPrivateIds = await resolveTimeoutTargetPrivateIds(
    experimentId,
    cohortId,
    stage,
    participantIds,
  );
  if (targetPrivateIds.length === 0) {
    console.error(
      `[chat.agent] Timeout message: no human targets resolved in stage ${stage.id}; ending the study instead.`,
    );
    return null;
  }
  // Undefined defaults to 2; an explicit null means no limit.
  const limit =
    experiment?.timeoutMessageLimit === undefined
      ? 2
      : experiment.timeoutMessageLimit;
  const useNeutral = experiment?.useNeutralTimeoutResponses === true;

  const refs = targetPrivateIds.map((privateId) =>
    getFirestoreParticipantRef(experimentId, privateId),
  );
  // Read, pick, and record atomically so concurrent claims for the same
  // failure cannot double-spend or overwrite each other's records.
  const pick = await app.firestore().runTransaction(async (transaction) => {
    const snapshots = await transaction.getAll(...refs);
    const participants = snapshots.map(
      (snapshot) => snapshot.data() as ParticipantProfileExtended | undefined,
    );
    const count = Math.max(
      0,
      ...participants.map((p) => p?.timeoutMessageCount ?? 0),
    );
    if (limit !== null && count >= limit) return null;

    let choice = TIMEOUT_ERROR_RESPONSE;
    let usedNeutral: Set<string> | null = null;
    if (useNeutral) {
      usedNeutral = new Set<string>();
      for (const participant of participants) {
        for (const response of participant?.neutralTimeoutResponses ?? []) {
          usedNeutral.add(response);
        }
      }
      const remaining = NEUTRAL_TIMEOUT_RESPONSES.filter(
        (r) => !usedNeutral!.has(r),
      );
      if (remaining.length > 0) {
        choice = remaining[Math.floor(Math.random() * remaining.length)];
        usedNeutral.add(choice);
      }
    }
    for (const [i, ref] of refs.entries()) {
      const update: Record<string, unknown> = {
        timeoutMessageCount: (participants[i]?.timeoutMessageCount ?? 0) + 1,
      };
      if (usedNeutral && choice !== TIMEOUT_ERROR_RESPONSE) {
        update.neutralTimeoutResponses = [...usedNeutral];
      }
      transaction.set(ref, update, {merge: true});
    }
    return choice;
  });
  console.log(
    `[chat.agent] Timeout message in stage ${stage.id}: ` +
      (pick === null ? 'limit reached, ending the study' : `posting "${pick}"`),
  );
  return pick;
}

/**
 * Resolve the human participants a turn-based failure should address:
 * the private chat participant, or every active human in the cohort for a
 * group chat. Observers count; they experience the failure like any other
 * human in the chat.
 */
async function resolveTimeoutTargetPrivateIds(
  experimentId: string,
  cohortId: string,
  stage: StageConfig,
  participantIds: string[],
): Promise<string[]> {
  if (stage.kind === StageKind.PRIVATE_CHAT) {
    const privateId = participantIds[0];
    return privateId ? [privateId] : [];
  }
  const activeParticipants = await getFirestoreActiveParticipants(
    experimentId,
    cohortId,
    stage.id,
    false,
    true, // include observers
  );
  return activeParticipants
    .filter((p) => !p.agentConfig)
    .map((p) => p.privateId);
}

export async function markTurnBasedApiFailure(
  experimentId: string,
  cohortId: string,
  stage: StageConfig,
  participantIds: string[], // private participant IDs (private chat uses [0])
) {
  const targetPrivateIds = await resolveTimeoutTargetPrivateIds(
    experimentId,
    cohortId,
    stage,
    participantIds,
  );

  if (targetPrivateIds.length === 0) return;

  await Promise.all(
    targetPrivateIds.map(async (privateId) => {
      const participantRef = getFirestoreParticipantRef(
        experimentId,
        privateId,
      );
      // Guard against overwriting terminal/transfer states inside a transaction.
      await app.firestore().runTransaction(async (transaction) => {
        const snapshot = await transaction.get(participantRef);
        const participant = snapshot.data() as
          | ParticipantProfileExtended
          | undefined;
        if (!participant) return;
        // Only transition active/in-progress participants.
        if (participant.currentStatus !== ParticipantStatus.IN_PROGRESS) {
          return;
        }
        // Don't touch agent participants.
        if (participant.agentConfig) return;
        transaction.set(
          participantRef,
          {currentStatus: ParticipantStatus.API_FAILURE},
          {merge: true},
        );
      });
    }),
  );

  console.error(
    `[chat.agent] Turn-based model call hit its response deadline in stage ${stage.id}; surfaced API_FAILURE restart pop-up to ${targetPrivateIds.length} participant(s).`,
  );
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
      getFirestoreActiveMediators(experimentId, cohortId, stage.id, true),
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
    await triggerResponseDoc.set({});
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
  await agentDocument.set(chatMessage);

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
    await triggerResponseDoc.set({});
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
  await agentDocument.set(chatMessage);

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

  const stage = await getFirestoreStage(experimentId, stageId);
  const chatStage = stage as ChatStageConfig;

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
      const allPublicParticipantIds = allParticipants.map((p) => p.publicId);
      const allMediatorIds = agentMediators.map((m) => m.publicId);

      // Shuffle participants with seed
      const seedString = `${cohortId}-${stageId}-0`;
      const shuffledParticipants = shuffleWithSeed(
        allPublicParticipantIds,
        seedString,
      );

      // Shuffle mediator order when conversation begins (only if multiple)
      const shuffledMediators =
        allMediatorIds.length > 1
          ? shuffleWithSeed(allMediatorIds, `${cohortId}-${stageId}-mediators`)
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
