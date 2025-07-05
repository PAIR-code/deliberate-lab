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
  ModelResponseStatus,
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

import {app} from '../app';
import {getAgentResponse} from '../agent.utils';
import {updateParticipantNextStage} from '../participant.utils';
import {
  getExperimenterDataFromExperiment,
  getFirestoreActiveParticipants,
  getFirestoreExperiment,
  getFirestoreParticipant,
  getFirestoreParticipantAnswer,
  getFirestoreParticipantAnswerRef,
  getFirestoreParticipantRef,
  getFirestoreStage,
  getFirestoreStagePublicData,
} from '../utils/firestore';
import {getPastStagesPromptContext} from './stage.utils';

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
  stageId: string,
  participantId: string,
) {
  const participant = await getFirestoreParticipant(
    experimentId,
    participantId,
  );

  const stage = await getFirestoreStage(experimentId, stageId);

  const publicStageData = await getFirestoreStagePublicData(
    experimentId,
    participant.currentCohortId,
    stage.id,
  );

  const participantAnswerDoc = getFirestoreParticipantAnswerRef(
    experimentId,
    participantId,
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
