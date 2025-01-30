import {
  ChatStageConfig,
  ChatStagePublicData,
  ParticipantProfile,
  ParticipantStatus,
  getTimeElapsed
} from '@deliberation-lab/utils';

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { Timestamp } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/v2/https';

import { app } from '../app';

/** Get the chat stage configuration based on the event. */
export async function getChatStage(
  experimentId: string,
  stageId: string
): Promise<ChatStageConfig | null> {
  const stageRef = app
    .firestore()
    .doc(`experiments/${experimentId}/stages/${stageId}`);

  const stageDoc = await stageRef.get();
  if (!stageDoc.exists) return null; // Return null if the stage doesn't exist.

  return stageDoc.data() as ChatStageConfig; // Return the stage data.
}

/** Get public data for the given chat stage. */
export async function getChatStagePublicData(
  experimentId: string,
  cohortId: string,
  stageId: string,
): Promise<ChatStagePublicData | null> {
  const publicStageRef = app
    .firestore()
    .doc(
      `experiments/${experimentId}/cohorts/${cohortId}/publicStageData/${stageId}`,
    );

  const publicStageDoc = await publicStageRef.get();
  if (!publicStageDoc.exists) return null; // Return null if the public stage data doesn't exist.

  return publicStageDoc.data() as ChatStagePublicData; // Return the public stage data.
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
  // TODO: Create shared utils under /utils for isActiveParticipant
  const activeStatuses = [
    ParticipantStatus.IN_PROGRESS,
    ParticipantStatus.COMPLETED,
    ParticipantStatus.ATTENTION_CHECK
  ];
  const activeParticipants = (await app.firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('participants')
    .where('currentCohortId', '==', cohortId)
    .get()
  ).docs.map(doc => doc.data() as ParticipantProfile)
  .filter(participant => !(participant.currentStatus in activeStatuses));

  // Check if active participants are ready to end current discussion
  const currentDiscussionId = publicStageData.currentDiscussionId;
  const isReadyToEndDiscussion = () => {
    const timestampMap = publicStageData.discussionTimestampMap;

    for (const participant of activeParticipants) {
      if (!timestampMap[currentDiscussionId][participant.publicId]) {
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
  const stage = (await app.firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('stages')
    .doc(stageId)
    .get()
  ).data() as ChatStageConfig;
  const currentIndex = stage.discussions.findIndex(
    item => item.id === currentDiscussionId
  );
  if (currentIndex === stage.discussions.length - 1) {
    // If invalid or last discussion completed, set null
    publicStageData.currentDiscussionId = null;
  } else {
    publicStageData.currentDiscussionId = stage.discussions[currentIndex + 1].id;
  }

  return publicStageData;
}

/** Checks whether the chat has ended, returning true if ending chat. */
export async function hasEndedChat(
  chatStage: ChatStageConfig | null,
  publicStageData: ChatStagePublicData | null,
): Promise<boolean> {
  if (!chatStage || !publicStageData || !chatStage.timeLimitInMinutes) return false;

  const elapsedMinutes = getTimeElapsed(publicStageData.discussionStartTimestamp!, 'm');

  // Check if the elapsed time has reached or exceeded the time limit
  if (elapsedMinutes >= chatStage.timeLimitInMinutes) {
    await app
      .firestore()
      .doc(
        `experiments/${event.params.experimentId}/cohorts/${event.params.cohortId}/publicStageData/${event.params.stageId}`,
      )
      .update({ discussionEndTimestamp: Timestamp.now() });
    return true; // Indicate that the chat has ended.
  }
  return false;
}