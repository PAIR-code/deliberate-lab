import {Timestamp} from 'firebase-admin/firestore';
import {
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentWritten,
} from 'firebase-functions/v2/firestore';
import {
  AgentChatResponse,
  AgentConfig,
  AgentGenerationConfig,
  ChatMessage,
  ChatMessageType,
  ChatStageConfig,
  ChatStageParticipantAnswer,
  ChatStagePublicData,
  ParticipantStatus,
  StageParticipantAnswer,
  StageKind,
  awaitTypingDelay,
  createAgentChatPromptConfig,
  createChatStageParticipantAnswer,
  createMediatorChatMessage,
  createParticipantChatMessage,
  getDefaultChatPrompt,
  getTimeElapsed,
  getTypingDelayInMilliseconds,
  structuredOutputEnabled,
  DEFAULT_AGENT_PARTICIPANT_CHAT_PROMPT,
} from '@deliberation-lab/utils';
import {checkAgentsReadyToEndChat} from './chat.agent';
import {updateCurrentDiscussionIndex} from './chat.utils';
import {getPastStagesPromptContext} from './stage.utils';
import {getMediatorsInCohortStage} from '../mediator.utils';
import {updateParticipantNextStage} from '../participant.utils';
import {
  getFirestoreActiveParticipants,
  getFirestoreParticipant,
  getFirestoreParticipantRef,
  getFirestoreParticipantAnswer,
  getFirestoreStage,
  getFirestoreStagePublicData,
} from '../utils/firestore';
import {
  getAgentChatAPIResponse,
  getAgentChatPrompt,
  getChatMessages,
  getChatMessageCount,
  getChatStage,
  getChatStagePublicData,
  sendAgentChatMessage,
} from './chat.utils';
import {getPastStagesPromptContext} from './stage.utils';
import {startTimeElapsed} from './chat.time';

import {app} from '../app';

// ************************************************************************* //
// TRIGGER FUNCTIONS                                                         //
// ************************************************************************* //

/** When a chat message is created */
export const onChatMessageCreated = onDocumentCreated(
  'experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}/chats/{chatId}',
  async (event) => {
    // TODO: Add agent chat response logic here

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

    // Start tracking elapsed time
    startTimeElapsed(
      event.params.experimentId,
      event.params.cohortId,
      publicStageData,
    );
  },
);

/** When chat message is created, generate mediator agent response if relevant. */
// TODO: Rename to createAgentMediatorMessage
export const createAgentMessage = onDocumentCreated(
  {
    document:
      'experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}/chats/{chatId}',
    timeoutSeconds: 60, // Maximum timeout of 1 minute for typing delay.
  },
  async (event) => {
    const data = event.data?.data() as ChatMessage | undefined;
    const experimentId = event.params.experimentId;
    const cohortId = event.params.cohortId;
    const stageId = event.params.stageId;

    // Use experiment config to get ChatStageConfig with agents.
    const stage = await getChatStage(experimentId, stageId);
    if (!stage) {
      return;
    }

    const publicStageData = await getChatStagePublicData(
      experimentId,
      cohortId,
      stageId,
    );
    // Make sure the conversation hasn't ended.
    if (!publicStageData || Boolean(publicStageData.discussionEndTimestamp))
      return;

    // Use chats in collection to build chat history for prompt, get num chats
    const chatMessages = await getChatMessages(experimentId, cohortId, stageId);

    // Get mediators for current cohort and stage
    const mediators = await getMediatorsInCohortStage(
      experimentId,
      cohortId,
      stageId,
    );

    // For each active agent mediator, attempt to create/send chat response
    mediators.forEach(async (mediator) => {
      const promptConfig = await getAgentChatPrompt(
        experimentId,
        stageId,
        mediator.agentConfig.agentId,
      );
      if (!promptConfig) return null;
      const response = await getAgentChatAPIResponse(
        mediator, // profile
        experimentId,
        mediator.id,
        '', // no past stage context
        chatMessages,
        mediator.agentConfig,
        promptConfig,
        stage,
      );
      if (!response) return null;

      // Build chat message to send
      const explanation =
        response.parsed[
          response.promptConfig.structuredOutputConfig?.explanationField
        ] ?? '';
      const chatMessage = createMediatorChatMessage({
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
        event.params.chatId,
      );
    });
  },
);

/** When chat message is created, generate agent participant response. */
export const createAgentParticipantMessage = onDocumentCreated(
  {
    document:
      'experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}/chats/{chatId}',
    timeoutSeconds: 60, // Maximum timeout of 1 minute for typing delay.
  },
  async (event) => {
    const data = event.data?.data() as ChatMessage | undefined;
    const experimentId = event.params.experimentId;
    const stageId = event.params.stageId;
    const cohortId = event.params.cohortId;

    // Use experiment config to get ChatStageConfig with agents.
    const stage = await getChatStage(experimentId, stageId);
    if (!stage || stage.kind !== StageKind.CHAT) {
      return;
    }

    const publicStageData = await getChatStagePublicData(
      experimentId,
      cohortId,
      stageId,
    );
    // Make sure the conversation hasn't ended.
    if (!publicStageData || Boolean(publicStageData.discussionEndTimestamp))
      return;

    // Use chats in collection to build chat history for prompt, get num chats
    const chatMessages = await getChatMessages(experimentId, cohortId, stageId);

    // Get agent participants for current cohort and stage
    const activeParticipants = await getFirestoreActiveParticipants(
      experimentId,
      cohortId,
      stageId,
      true, // must be agent
    );

    // For each active agent participant, attempt to create/send chat response
    activeParticipants.forEach(async (participant) => {
      const promptConfig =
        (await getAgentChatPrompt(
          experimentId,
          stageId,
          participant.agentConfig.agentId,
        )) ??
        createAgentChatPromptConfig(stageId, StageKind.CHAT, {
          promptContext: DEFAULT_AGENT_PARTICIPANT_PROMPT,
        });

      const pastStageContext = promptConfig.promptSettings.includeStageHistory
        ? await getPastStagesPromptContext(
            experimentId,
            stageId,
            participant.privateId,
            promptConfig.promptSettings.includeStageInfo,
          )
        : '';

      const response = await getAgentChatAPIResponse(
        participant, // profile
        experimentId,
        participant.publicId,
        pastStageContext,
        chatMessages,
        participant.agentConfig,
        promptConfig,
        stage,
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
        event.params.chatId,
      );
    });
  },
);

/** When chat message is created, check if agent participants are
 * ready to end chat.
 */
export const checkReadyToEndChat = onDocumentCreated(
  {
    document:
      'experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}/chats/{chatId}',
    timeoutSeconds: 60, // Maximum timeout of 1 minute for typing delay.
  },
  async (event) => {
    const data = event.data?.data() as ChatMessage | undefined;
    const publicStageData = await getFirestoreStagePublicData(
      event.params.experimentId,
      event.params.cohortId,
      event.params.stageId,
    );
    const stage = await getFirestoreStage(
      event.params.experimentId,
      event.params.stageId,
    );
    checkAgentsReadyToEndChat(
      event.params.experimentId,
      event.params.cohortId,
      stage,
      publicStageData,
    );
  },
);
