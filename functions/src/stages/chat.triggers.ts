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
  ExperimenterData,
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
} from '@deliberation-lab/utils';
import {getAgentResponse} from '../agent.utils';
import {getExperimenterDataFromExperiment} from '../utils/firestore';
import {updateCurrentDiscussionIndex} from './chat.utils';
import {getMediatorsInCohortStage} from '../mediator.utils';
import {updateParticipantNextStage} from '../participant.utils';
import {
  getFirestoreParticipant,
  getFirestoreParticipantRef,
  getFirestoreParticipantAnswer,
} from '../utils/firestore';
import {
  selectSingleAgentParticipantChatResponse,
  getChatMessages,
  getChatMessageCount,
  getChatStage,
  getChatStagePublicData,
  hasEndedChat,
  selectSingleAgentMediatorChatResponse,
} from './chat.utils';
import {getPastStagesPromptContext} from './stage.utils';

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

/** When chat participant answer is updated, check if all participants
 * are ready to move to next discussion. */
export const updateCurrentChatDiscussionId = onDocumentWritten(
  {
    document:
      'experiments/{experimentId}/participants/{participantId}/stageData/{stageId}',
    timeoutSeconds: 60,
  },
  async (event) => {
    const data = event.data.after.data() as StageParticipantAnswer | undefined;

    const stageDocument = app
      .firestore()
      .collection('experiments')
      .doc(event.params.experimentId)
      .collection('stages')
      .doc(event.params.stageId);
    const stage = (await stageDocument.get()).data() as StageConfig;
    if (stage.kind !== StageKind.CHAT) return;

    // Define participant document
    const participantDocument = app
      .firestore()
      .collection('experiments')
      .doc(event.params.experimentId)
      .collection('participants')
      .doc(event.params.participantId);

    const participant = (
      await participantDocument.get()
    ).data() as ParticipantProfileExtended;

    // Define public stage document reference
    const publicDocument = app
      .firestore()
      .collection('experiments')
      .doc(event.params.experimentId)
      .collection('cohorts')
      .doc(participant.currentCohortId)
      .collection('publicStageData')
      .doc(event.params.stageId);

    await app.firestore().runTransaction(async (transaction) => {
      // Update public stage data
      const publicStageData = (
        await publicDocument.get()
      ).data() as StagePublicData;
      const discussionStatusMap = data.discussionTimestampMap;

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
        event.params.experimentId,
        participant.currentCohortId,
        event.params.stageId,
        publicStageData,
      );

      transaction.set(publicDocument, publicStageData);
    });
  },
);

/** When chat message is created, generate mediator agent response if relevant. */
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
      const experimenterData = await getExperimenterDataFromExperiment(
        event.params.experimentId,
      );
      if (!experimenterData) return;

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
      const numChatsAfterAgent = await getChatMessageCount(
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

      // Don't send a message if the conversation has moved on
      const newNumChatsAfterAgent = await getChatMessageCount(
        event.params.experimentId,
        event.params.cohortId,
        event.params.stageId,
      );
      if (newNumChatsAfterAgent > numChatsBeforeAgent) {
        // TODO: Write log to Firestore
        return;
      }

      // Don't send a message if the conversation already has a response
      // to the trigger message
      const triggerResponseDoc = app
        .firestore()
        .collection('experiments')
        .doc(event.params.experimentId)
        .collection('cohorts')
        .doc(event.params.cohortId)
        .collection('publicStageData')
        .doc(event.params.stageId)
        .collection('triggerLogs')
        .doc(`${event.params.chatId}-mediator`);
      const hasTriggerResponse = (await triggerResponseDoc.get()).exists;
      if (hasTriggerResponse) {
        return;
      }

      // Write agent mediator message to conversation
      let explanation = '';
      triggerResponseDoc.set({});
      if (agentResponse.promptConfig.responseConfig?.isJSON) {
        explanation =
          agentResponse.parsed[
            agentResponse.promptConfig.responseConfig.explanationField
          ] ?? '';
      } else if (
        structuredOutputEnabled(
          agentResponse.promptConfig.structuredOutputConfig,
        )
      ) {
        explanation =
          agentResponse.parsed[
            agentResponse.promptConfig.structuredOutputConfig.explanationField
          ] ?? '';
      }

      const chatMessage = createMediatorChatMessage({
        profile: agentResponse.profile,
        discussionId: publicStageData.currentDiscussionId,
        message: agentResponse.message,
        timestamp: Timestamp.now(),
        senderId: agentResponse.profileId,
        agentId: agentResponse.agentId,
        explanation,
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
      if (!stage || stage.kind !== StageKind.CHAT) {
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
      const experimenterData = await getExperimenterDataFromExperiment(
        event.params.experimentId,
      );
      if (!experimenterData) return;

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
      const numChatsAfterAgent = await getChatMessageCount(
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

      // Don't send a message if the conversation has moved on
      const newNumChatsAfterAgent = await getChatMessageCount(
        event.params.experimentId,
        event.params.cohortId,
        event.params.stageId,
      );
      if (newNumChatsAfterAgent > numChatsBeforeAgent) {
        // TODO: Write log to Firestore
        return;
      }

      // Don't send a message if the conversation already has a response
      // to the trigger message
      const triggerResponseDoc = app
        .firestore()
        .collection('experiments')
        .doc(event.params.experimentId)
        .collection('cohorts')
        .doc(event.params.cohortId)
        .collection('publicStageData')
        .doc(event.params.stageId)
        .collection('triggerLogs')
        .doc(`${event.params.chatId}-participant`);
      const hasTriggerResponse = (await triggerResponseDoc.get()).exists;
      if (hasTriggerResponse) {
        return;
      }

      // Write agent participant message to conversation
      let explanation = '';
      triggerResponseDoc.set({});
      if (agentResponse.promptConfig.responseConfig?.isJSON) {
        explanation =
          agentResponse.parsed[
            agentResponse.promptConfig.responseConfig.explanationField
          ] ?? '';
      } else if (
        structuredOutputEnabled(
          agentResponse.promptConfig.structuredOutputConfig,
        )
      ) {
        explanation =
          agentResponse.parsed[
            agentResponse.promptConfig.structuredOutputConfig.explanationField
          ] ?? '';
      }
      const chatMessage = createParticipantChatMessage({
        profile: agentResponse.profile,
        discussionId: publicStageData.currentDiscussionId,
        message: agentResponse.message,
        timestamp: Timestamp.now(),
        senderId: agentResponse.profileId,
        agentId: agentResponse.agentId,
        explanation,
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
      // TODO: Add separate readyToEndChat trigger for other stages with chat
      const stage = await getChatStage(
        event.params.experimentId,
        event.params.stageId,
      );
      if (!stage || stage?.kind !== StageKind.CHAT) {
        return;
      }

      const publicStageData = await getChatStagePublicData(
        event.params.experimentId,
        event.params.cohortId,
        event.params.stageId,
      );

      // Fetch experiment creator's API key.
      const experimenterData = await getExperimenterDataFromExperiment(
        event.params.experimentId,
      );
      if (!experimenterData) return;

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
            'Are you ready to end the conversation and stop talking? Please consider whether you have met your goals and explicitly communicated this to other participants. If you have more to say or have yet to explicitly agree in the chat, you should not end the discussion yet. If so, respond the exact word YES. Otherwise, do not return anything.',
        },
      );

      for (const participant of activeParticipants) {
        // Make sure participant has not already moved on
        // to a different stage
        const refreshedParticipant = await getFirestoreParticipant(
          event.params.experimentId,
          participant.privateId,
        );
        if (refreshedParticipant?.currentStageId !== event.params.stageId) {
          return;
        }

        // TODO: Use regular participant decision-making prompt, not chat prompt
        const pastStageContext = promptConfig.promptSettings.includeStageHistory
          ? await getPastStagesPromptContext(
              event.params.experimentId,
              event.params.stageId,
              participant.privateId,
              promptConfig.promptSettings.includeStageInfo,
            )
          : '';
        const prompt = getDefaultChatPrompt(
          participant,
          participant.agentConfig,
          pastStageContext,
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
        // If not ready to move on, do nothing
        if (!response?.text.includes('YES')) {
          break;
        }

        // If threaded discussion (and not last thread), move to next thread
        if (
          stage.discussions.length > 0 &&
          publicStageData.currentDiscussionId &&
          publicStageData.currentDiscussionId !==
            stage.discussions[stage.discussions.length - 1]
        ) {
          const chatAnswer = await getFirestoreParticipantAnswer(
            event.params.experimentId,
            participant.privateId,
            event.params.stageId,
          );
          const participantAnswer =
            chatAnswer?.kind === StageKind.CHAT
              ? (chatAnswer as ChatStageParticipantAnswer)
              : createChatStageParticipantAnswer({id: stage.id});

          // Set ready to end timestamp if not already set
          if (
            !participantAnswer.discussionTimestampMap[
              publicStageData.currentDiscussionId
            ]
          ) {
            participantAnswer.discussionTimestampMap[
              publicStageData.currentDiscussionId
            ] = Timestamp.now();
            await transaction.set(participantAnswerDoc, participantAnswer);
          }
        } else {
          // Otherwise, move to next stage
          await updateParticipantNextStage(
            event.params.experimentId,
            participant,
            experiment.stageIds,
          );

          const participantDoc = getFirestoreParticipantRef(
            event.params.experimentId,
            participant.privateId,
          );
          await transaction.set(participantDoc, participant);
        }
      } // end of active participants for loop
    });
  },
);
