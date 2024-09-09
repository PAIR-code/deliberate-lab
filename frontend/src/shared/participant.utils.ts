import {
  ParticipantProfile,
  ParticipantStatus,
} from '@deliberation-lab/utils';

/**
 * Participant utils for frontend only.
 * For utils shared between frontend and backend, see @deliberation-lab/utils
 */

/** Returns profile name if exists, else public ID. */
export function getParticipantName(participant: ParticipantProfile) {
  return participant.name ?? participant.publicId;
}

/** Returns pronouns if exists, else empty. */
export function getParticipantPronouns(
  participant: ParticipantProfile,
  includeParentheses = true,
) {
  if (participant.pronouns !== null) {
    return `(${participant.pronouns})`;
  }
  return '';
}


/** True if participating in experiment (not dropped out, not transfer pending)
 *  (note that participants who completed experiment are included here)
 */
export function isActiveParticipant(participant: ParticipantProfile) {
  return participant.currentStatus === ParticipantStatus.IN_PROGRESS
    || participant.currentStatus === ParticipantStatus.SUCCESS;
}

/** If participant has left the experiment before completing it
 * (not active, not pending transfer)
 */
export function isObsoleteParticipant(participant: ParticipantProfile) {
  return participant.currentStatus === ParticipantStatus.TRANSFER_FAILED
    || participant.currentStatus === ParticipantStatus.TRANSFER_DECLINED
    || participant.currentStatus === ParticipantStatus.TRANSFER_TIMEOUT
    || participant.currentStatus === ParticipantStatus.ATTENTION_TIMEOUT
    || participant.currentStatus === ParticipantStatus.BOOTED_OUT;
}

/** If successfully completed experiment. */
export function isSuccessParticipant(
  participant: ParticipantProfile
) {
  return participant.currentStatus === ParticipantStatus.SUCCESS;
}

/** If participant is in a waiting state (and thus not "active")
 * (e.g., while pending transfer, not currently in the experiment but also
 * has not left yet)
 */
export function isPendingParticipant(participant: ParticipantProfile) {
  return participant.currentStatus === ParticipantStatus.TRANSFER_PENDING;
}

/** If pending transfer to given cohort ID. */
export function isParticipantPendingTransfer(
  participant: ParticipantProfile,
  cohortId: string
) {
  return participant.currentStatus === ParticipantStatus.TRANSFER_PENDING
    && participant.transferCohortId === cohortId;
}

/** If ended experiment (either successfully or via leaving). */
export function isParticipantEndedExperiment(
  participant: ParticipantProfile
) {
  return participant.currentStatus !== ParticipantStatus.IN_PROGRESS
    && participant.currentStatus !== ParticipantStatus.TRANSFER_PENDING
}

/** If participant is on or past the given stage. */
export function isUnlockedStage(
  participant: ParticipantProfile,
  stageId: string,
) {
  // The participant must start experiment to unlock stages
  if (!participant.timestamps.startExperiment) return false;

  // If the participant has a transfer pending for the current stage,
  // they are "locked" until they accept
  if (participant.currentStageId === stageId
    && participant.currentStatus !== ParticipantStatus.TRANSFER_PENDING
  ) {
    return true;
  }
  return participant.timestamps.completedStages[stageId];
}

/** Return number of stages that participant completed. */
export function getParticipantProgress(
  participant: ParticipantProfile,
  stageIds: string[], // stages that count towards progress
) {
  let count = 0;
  stageIds.forEach(id => {
    if (participant.timestamps.completedStages[id]) {
      count += 1
    }
  });
  return count;
}