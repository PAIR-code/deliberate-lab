import {
  ChatMessage,
  createChatMessage,
  createSystemChatMessage,
} from '@deliberation-lab/utils';
import {Timestamp} from 'firebase-admin/firestore';
import {app} from '../app';
import {
  getFirestoreParticipant,
  getFirestoreStage,
  getFirestoreStagePublicData,
  getFirestoreParticipantAnswerRef,
  getFirestoreParticipantAnswer,
  getFirestoreExperiment,
  getFirestoreParticipantRef,
} from '../utils/firestore';
import {
  ChatStageConfig,
  ChatStagePublicData,
  ChatStageParticipantAnswer,
  createChatStageParticipantAnswer,
} from '@deliberation-lab/utils';
import {updateParticipantNextStage} from '../participant.utils';

/** Used for private chats if model response fails. */
export async function sendErrorPrivateChatMessage(
  experimentId: string,
  participantId: string,
  stageId: string,
  config: Partial<ChatMessage> = {},
) {
  const chatMessage = createChatMessage({
    ...config,
    timestamp: Timestamp.now(),
    isError: true,
  });

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

  agentDocument.set(chatMessage);
}

/** Update participant answer ready to end private chat discussion. */
export async function updateParticipantReadyToEndChat(
  experimentId: string,
  stageId: string,
  participantId: string,
) {
  const participant = await getFirestoreParticipant(
    experimentId,
    participantId,
  );
  if (!participant) return;

  const stage = await getFirestoreStage(experimentId, stageId);
  if (!stage) return;

  const publicStageData = await getFirestoreStagePublicData(
    experimentId,
    participant.currentCohortId,
    stage.id,
  );
  if (!publicStageData) return;

  const participantAnswerDoc = getFirestoreParticipantAnswerRef(
    experimentId,
    participantId,
    stage.id,
  );
  const participantAnswer =
    ((await getFirestoreParticipantAnswer(
      experimentId,
      participant.privateId,
      stage.id,
    )) as ChatStageParticipantAnswer | undefined) ??
    createChatStageParticipantAnswer({id: stage.id});

  // If threaded discussion (and not last thread), move to next thread
  if (
    (stage as ChatStageConfig).discussions.length > 0 &&
    (publicStageData as ChatStagePublicData).currentDiscussionId &&
    (publicStageData as ChatStagePublicData).currentDiscussionId !==
      (stage as ChatStageConfig).discussions[
        (stage as ChatStageConfig).discussions.length - 1
      ].id
  ) {
    const chatPublicData = publicStageData as ChatStagePublicData;
    const currentDiscussionId = chatPublicData.currentDiscussionId!;

    // Set ready to end timestamp if not already set
    if (!participantAnswer.discussionTimestampMap?.[currentDiscussionId]) {
      if (!participantAnswer.discussionTimestampMap) {
        participantAnswer.discussionTimestampMap = {};
      }
      participantAnswer.discussionTimestampMap[currentDiscussionId] =
        Timestamp.now();

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
/** Send system chat message to public chat. */
export async function sendSystemChatMessage(
  experimentId: string,
  cohortId: string,
  stageId: string,
  message: string,
  // Include sender ID if the system message is related to an
  // agent participant moving on. This allows us to prevent the system message
  // from triggering an API query from that same participant.
  senderId = '',
) {
  const chatMessage = createSystemChatMessage({
    message,
    timestamp: Timestamp.now(),
    senderId,
  });

  const systemDocument = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('cohorts')
    .doc(cohortId)
    .collection('publicStageData')
    .doc(stageId)
    .collection('chats')
    .doc(chatMessage.id);

  await systemDocument.set(chatMessage);
}
