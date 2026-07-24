import {
  ChatMessage,
  ChatStageConfig,
  ChatStagePublicData,
  ChatStageParticipantAnswer,
  StageKind,
  UpdateChatMessageReactionData,
  createChatMessage,
  createChatStageParticipantAnswer,
  createSystemChatMessage,
  getTimeElapsed,
} from '@deliberation-lab/utils';
import {
  DocumentReference,
  FieldPath,
  FieldValue,
  Timestamp,
} from 'firebase-admin/firestore';
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
import {updateParticipantNextStage} from '../participant.utils';

/** Thrown when a reaction targets a chat message that does not exist. */
export class ChatMessageNotFoundError extends Error {}

/**
 * Resolve the doc that a chat message is stored under.
 *
 * Private chat messages live under the participant, group chat messages under
 * the cohort's public stage data.
 */
export function getChatMessageRef(
  stageKind: StageKind,
  experimentId: string,
  cohortId: string,
  participantId: string, // private ID, used for private chats
  stageId: string,
  chatMessageId: string,
): DocumentReference {
  if (stageKind === StageKind.PRIVATE_CHAT) {
    return app
      .firestore()
      .collection('experiments')
      .doc(experimentId)
      .collection('participants')
      .doc(participantId)
      .collection('stageData')
      .doc(stageId)
      .collection('privateChats')
      .doc(chatMessageId);
  }

  return app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('cohorts')
    .doc(cohortId)
    .collection('publicStageData')
    .doc(stageId)
    .collection('chats')
    .doc(chatMessageId);
}

/**
 * Apply or remove a participant's reaction on a chat message.
 *
 * The reaction is stored as the list of participants who applied it (rather
 * than as a counter), so that a count can never disagree with who reacted.
 * arrayUnion/arrayRemove are applied atomically by Firestore, so simultaneous
 * reactions from different participants cannot overwrite each other, and
 * reacting twice cannot double-count.
 */
export async function updateChatMessageReaction(
  stageKind: StageKind,
  data: UpdateChatMessageReactionData,
) {
  const document = getChatMessageRef(
    stageKind,
    data.experimentId,
    data.cohortId,
    data.participantId,
    data.stageId,
    data.chatMessageId,
  );

  const reactors = data.add
    ? FieldValue.arrayUnion(data.senderId)
    : FieldValue.arrayRemove(data.senderId);

  await app.firestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(document);
    if (!snapshot.exists) {
      throw new ChatMessageNotFoundError(
        `Chat message ${data.chatMessageId} not found`,
      );
    }
    transaction.update(
      document,
      new FieldPath('reactionMap', data.reaction),
      reactors,
    );
  });
}

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

  await agentDocument.set(chatMessage);
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

  const minTime = (stage as ChatStageConfig).timeMinimumInMinutes;
  if (minTime != null && minTime > 0) {
    let startTimestamp = (publicStageData as ChatStagePublicData)
      .discussionStartTimestamp;

    // For private chats, fall back to the first message timestamp
    if (stage.kind === 'privateChat' && !startTimestamp) {
      const results = await app
        .firestore()
        .collection('experiments')
        .doc(experimentId)
        .collection('participants')
        .doc(participantId)
        .collection('stageData')
        .doc(stage.id)
        .collection('privateChats')
        .orderBy('timestamp', 'asc')
        .limit(1)
        .get();

      if (!results.empty) {
        startTimestamp = results.docs[0].data().timestamp as Timestamp;
      }
    }

    if (!startTimestamp) return;
    if (getTimeElapsed(startTimestamp, 'm') < minTime) return;
  }

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
    if (!experiment) return;
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
