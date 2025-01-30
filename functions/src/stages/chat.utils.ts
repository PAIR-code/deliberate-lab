import {
  ChatStageConfig,
  ChatStagePublicData,
  ParticipantProfile,
  ParticipantStatus,
} from '@deliberation-lab/utils';

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { onCall } from 'firebase-functions/v2/https';

import { app } from '../app';

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