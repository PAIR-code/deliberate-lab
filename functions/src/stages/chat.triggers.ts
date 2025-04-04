import {Timestamp} from 'firebase-admin/firestore';
import {
  onDocumentCreated,
  onDocumentUpdated,
} from 'firebase-functions/v2/firestore';
import {
  AgentChatResponse,
  AgentConfig,
  AgentGenerationConfig,
  ChatMessage,
  ChatMessageType,
  ChatStageConfig,
  ChatStagePublicData,
  ExperimenterData,
  ParticipantStatus,
  StageKind,
  awaitTypingDelay,
  createAgentChatPromptConfig,
  createMediatorChatMessage,
  createParticipantChatMessage,
  getDefaultChatPrompt,
  getTimeElapsed,
  getTypingDelayInMilliseconds,
} from '@deliberation-lab/utils';
import {getAgentResponse} from '../agent.utils';
import {getMediatorsInCohortStage} from '../mediator.utils';
import {updateParticipantNextStage} from '../participant.utils';
import {
  selectSingleAgentParticipantChatResponse,
  getChatMessages,
  getChatMessageCount,
  getChatStage,
  getChatStagePublicData,
  hasEndedChat,
  selectSingleAgentMediatorChatResponse,
} from './chat.utils';

import {app} from '../app';

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

    await app.firestore().runTransaction(async (transaction) => {
      // Use experiment config to get ChatStageConfig with agents.
      const stage = await getChatStage(
        event.params.experimentId,
        event.params.stageId,
      );
      if (!stage) {
        return;
      }

      const publicStageData = await getChatStagePublicData(
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
      const chatMessages = await getChatMessages(
        event.params.experimentId,
        event.params.cohortId,
        event.params.stageId,
      );

      // Get mediators for current cohort and stage
      const mediators = await getMediatorsInCohortStage(
        event.params.experimentId,
        event.params.cohortId,
        event.params.stageId,
      );

      // Select one agent's response
      const agentResponse = await selectSingleAgentMediatorChatResponse(
        event.params.experimentId,
        mediators,
        chatMessages,
        stage,
        experimenterData,
      );
      if (!agentResponse) return;

      // Don't send a message if the conversation has moved on
      const numChatsBeforeAgent = chatMessages.length;
      const numChatsAfterAgent = getChatMessageCount(
        event.params.experimentId,
        event.params.cohortId,
        event.params.stageId,
      );
      if (numChatsAfterAgent > numChatsBeforeAgent) {
        // TODO: Write log to Firestore
        return;
      }

      // Wait for typing delay
      // TODO: Decrease typing delay to account for LLM API call latencies?
      await awaitTypingDelay(
        agentResponse.message,
        agentResponse.promptConfig.chatSettings.wordsPerMinute,
      );

      // Write agent mediator message to conversation
      // TODO: Or write agent participant message to conversation
      const chatMessage = createMediatorChatMessage({
        profile: agentResponse.profile,
        discussionId: publicStageData.currentDiscussionId,
        message: agentResponse.message,
        timestamp: Timestamp.now(),
        senderId: agentResponse.profileId,
        agentId: agentResponse.agentId,
        explanation: agentResponse.promptConfig.responseConfig.isJSON
          ? (agentResponse.parsed[
              agentResponse.promptConfig.responseConfig.explanationField
            ] ?? '')
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

      transaction.set(agentDocument, chatMessage);
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

    await app.firestore().runTransaction(async (transaction) => {
      // Use experiment config to get ChatStageConfig with agents.
      const stage = await getChatStage(
        event.params.experimentId,
        event.params.stageId,
      );
      if (!stage) {
        return;
      }

      const publicStageData = await getChatStagePublicData(
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
      const chatMessages = await getChatMessages(
        event.params.experimentId,
        event.params.cohortId,
        event.params.stageId,
      );

      // Get agent participants for current cohort and stage
      // TODO: Create shared utils under /utils for isActiveParticipant
      const activeStatuses = [
        ParticipantStatus.IN_PROGRESS,
        ParticipantStatus.SUCCESS,
        ParticipantStatus.ATTENTION_CHECK,
      ];
      const activeParticipants = (
        await app
          .firestore()
          .collection('experiments')
          .doc(event.params.experimentId)
          .collection('participants')
          .where('currentCohortId', '==', event.params.cohortId)
          .get()
      ).docs
        .map((doc) => doc.data() as ParticipantProfileExtended)
        .filter(
          (participant) =>
            participant.agentConfig &&
            participant.currentStageId === event.params.stageId &&
            activeStatuses.find(
              (status) => status === participant.currentStatus,
            ),
        );

      // Select one agent's response
      const agentResponse = await selectSingleAgentParticipantChatResponse(
        event.params.experimentId,
        activeParticipants,
        chatMessages,
        stage,
        experimenterData,
      );
      if (!agentResponse) return;

      // Don't send a message if the conversation has moved on
      const numChatsBeforeAgent = chatMessages.length;
      const numChatsAfterAgent = getChatMessageCount(
        event.params.experimentId,
        event.params.cohortId,
        event.params.stageId,
      );
      if (numChatsAfterAgent > numChatsBeforeAgent) {
        // TODO: Write log to Firestore
        return;
      }

      // Wait for typing delay
      // TODO: Decrease typing delay to account for LLM API call latencies?
      await awaitTypingDelay(
        agentResponse.message,
        agentResponse.promptConfig.chatSettings.wordsPerMinute,
      );

      // Write agent participant message to conversation
      const chatMessage = createParticipantChatMessage({
        profile: agentResponse.profile,
        discussionId: publicStageData.currentDiscussionId,
        message: agentResponse.message,
        timestamp: Timestamp.now(),
        senderId: agentResponse.profileId,
        agentId: agentResponse.agentId,
        explanation: agentResponse.promptConfig.responseConfig.isJSON
          ? (agentResponse.parsed[
              agentResponse.promptConfig.responseConfig.explanationField
            ] ?? '')
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

      transaction.set(agentDocument, chatMessage);
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

    await app.firestore().runTransaction(async (transaction) => {
      // Use experiment config to get ChatStageConfig with agents.
      const stage = await getChatStage(
        event.params.experimentId,
        event.params.stageId,
      );
      if (!stage) {
        return;
      }

      const publicStageData = await getChatStagePublicData(
        event.params.experimentId,
        event.params.cohortId,
        event.params.stageId,
      );
      if (publicStageData.discussionId) {
        // TODO: Check if ready to end discussion before ready to end chat
      }

      // Fetch experiment creator's API key.
      // TODO: Add utils function for getting experiment creator's API key
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

      // Get experiment
      const experimentDoc = app
        .firestore()
        .collection('experiments')
        .doc(event.params.experimentId);
      const experiment = (await experimentDoc.get()).data() as Experiment;

      // Use chats in collection to build chat history for prompt, get num chats
      const chatMessages = await getChatMessages(
        event.params.experimentId,
        event.params.cohortId,
        event.params.stageId,
      );

      // Get agent participants for current cohort and stage
      // TODO: Create shared utils under /utils for isActiveParticipant
      const activeStatuses = [
        ParticipantStatus.IN_PROGRESS,
        ParticipantStatus.SUCCESS,
        ParticipantStatus.ATTENTION_CHECK,
      ];
      const activeParticipants = (
        await app
          .firestore()
          .collection('experiments')
          .doc(event.params.experimentId)
          .collection('participants')
          .where('currentCohortId', '==', event.params.cohortId)
          .get()
      ).docs
        .map((doc) => doc.data() as ParticipantProfileExtended)
        .filter(
          (participant) =>
            participant.currentStageId === event.params.stageId &&
            participant.agentConfig &&
            activeStatuses.find(
              (status) => status === participant.currentStatus,
            ),
        );

      // For each participant, check if ready to end chat
      const promptConfig = createAgentChatPromptConfig(
        event.params.stageId,
        StageKind.CHAT,
        {
          promptContext:
            'Are you ready to end the conversation and stop talking? Please consider whether you have met your goals and explicitly communicated this to other participants. If you have more to say or have yet to explicitly agree in the chat, you should not end the discussion yet. If so, respond YES and explain why. Otherwise, do not return anything.',
        },
      );

      for (const participant of activeParticipants) {
        const participantDoc = app
          .firestore()
          .doc(
            `experiments/${event.params.experimentId}/participants/${participant.privateId}`,
          );
        // Make sure participant has not already moved on
        // to a different stage
        const refreshedParticipant = (
          await participantDoc.get()
        ).data() as ParticipantProfileExtended;
        if (refreshedParticipant.currentStageId !== event.params.stageId) {
          break;
        }

        // TODO: Use regular participant decision-making prompt, not chat prompt
        const prompt = getDefaultChatPrompt(
          participant,
          participant.agentConfig,
          chatMessages,
          promptConfig,
          stage,
        );
        const response = await getAgentResponse(
          experimenterData,
          prompt,
          participant.agentConfig.modelSettings,
          promptConfig.generationConfig,
        );
        console.log(participant.publicId, 'ready to end discussion?', response);
        // TODO: Use structured output instead of checking for YES string
        if (response?.text.includes('YES')) {
          await updateParticipantNextStage(
            event.params.experimentId,
            participant,
            experiment.stageIds,
          );
          await transaction.set(participantDoc, participant);
        }
      } // end participant loop
    });
  },
);
