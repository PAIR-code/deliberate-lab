import { Timestamp } from 'firebase-admin/firestore';
import {
  ParticipantProfileExtended,
  ParticipantStatus
} from '@deliberation-lab/utils';

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { onCall } from 'firebase-functions/v2/https';

import { app } from './app';

/** Update participant's current stage to next stage (or end experiment). */
export async function updateParticipantNextStage(
  experimentId: string,
  participant: ParticipantProfileExtended,
  stageIds: string[]
) {
  let response = { currentStageId: null, endExperiment: false };

  const currentStageId = participant.currentStageId;
  const currentStageIndex = stageIds.indexOf(currentStageId);

  // Mark current stage as completed
  const timestamp = Timestamp.now();
  participant.timestamps.completedStages[currentStageId] = timestamp;

  // If at end of experiment
  if (currentStageIndex + 1 === stageIds.length) {
    // Update end of experiment fields
    participant.timestamps.endExperiment = timestamp;
    participant.currentStatus = ParticipantStatus.SUCCESS;
    response.endExperiment = true;
  } else {
    // Else, progress to next stage
    const nextStageId = stageIds[currentStageIndex + 1];
    participant.currentStageId = nextStageId;
    response.currentStageId = nextStageId;

    // Mark next stage as reached
    // (NOTE: this currently uses the participants' "completedWaiting" map)
    participant.timestamps.completedWaiting[nextStageId] = timestamp;

    // If all active participants have reached the next stage,
    // unlock that stage in CohortConfig
    await updateCohortStageUnlocked(
      experimentId,
      participant.currentCohortId,
      participant.currentStageId
    );
  }

  return response;
}

/** If given stage in a cohort can be unlocked (all active participants
 *  are ready to start), set the stage as unlocked in CohortConfig.
 */
// TODO: Move to cohort.utils file?
export async function updateCohortStageUnlocked(
  experimentId: string,
  cohortId: string,
  stageId: string
) {
  await app.firestore().runTransaction(async (transaction) => {
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

    // Get current stage config
    const stage = (await app.firestore()
      .collection('experiments')
      .doc(experimentId)
      .collection('stages')
      .doc(stageId)
      .get()
    ).data() as StageConfig;

    // Check if min participants requirement is met
    const hasMinParticipants = () => {
      return stage.progress.minParticipants <= activeParticipants.length;
    };

    // If waitForAllParticipants, check if active participants are ready to
    // start stage ("completedWaiting" is currently used for readyToStart)
    // If not waitForAllParticipants, return true
    const isParticipantsReady = () => {
      if (!stage.progress.waitForAllParticipants) {
        return true;
      }

      for (const participant of activeParticipants) {
        if (!participant.timestamps.completedWaiting[stageId]) {
          return false;
        }
      }
      return true;
    }

    // If all active participants are ready to start
    // AND min participants requirement is met, unlock cohort
    if (!hasMinParticipants() || !isParticipantsReady()) {
      return;
    }

    const cohortDoc = app.firestore()
      .collection('experiments')
      .doc(experimentId)
      .collection('cohorts')
      .doc(cohortId);

    const cohortConfig = (await cohortDoc.get()).data() as CohortConfig;
    if (cohortConfig.stageUnlockMap[stageId]) {
      return; // already marked as true
    }

    cohortConfig.stageUnlockMap[stageId] = true;
    transaction.set(cohortDoc, cohortConfig);

    // TODO: Now that the given stage is unlocked, active any agent
    // participants that are ready to start (and have not yet completed)
    // the current stage
  });
}