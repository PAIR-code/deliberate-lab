import {
  ParticipantProfile,
  ParticipantStatus,
  ProfileType,
  StageConfig,
  StageKind,
  getHashIntegerFromString,
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
  includeParentheses = true
) {
  if (participant.pronouns) {
    return includeParentheses
      ? `(${participant.pronouns})`
      : participant.pronouns;
  }
  return '';
}

/** Returns the start timestamp of the current stage. */
export function getCurrentStageStartTime(
  participant: ParticipantProfile,
  stageIds: string[] // An ordered list of stages in the experiment.
) {
  // Get the index of this.participant.currentStageId in this.experimentService.stageIds.
  const index = stageIds.indexOf(participant.currentStageId);

  if (index === 0) {
    // If the participant is on the first stage, use the startExperiment timestamp.
    return participant.timestamps.startExperiment;
  }

  // Otherwise, get the previous stage's ID and use its completion timestamp.
  const prevStage = stageIds[index - 1];
  if (prevStage in participant.timestamps.completedStages) {
    return participant.timestamps.completedStages[prevStage];
  }

  return null;
}

/** Returns an explanation text about the participant status. */
export function getParticipantStatusDetailText(profile: ParticipantProfile) {
  if (profile.currentStatus === ParticipantStatus.BOOTED_OUT) {
    return '‼️  This participant has been booted from the experiment and can no longer participate.';
  } else if (profile.currentStatus === ParticipantStatus.ATTENTION_TIMEOUT) {
    return '‼️  This participant has failed an attention check and can no longer participate.';
  } else if (profile.currentStatus === ParticipantStatus.TRANSFER_DECLINED) {
    return '🛑 This participant declined a transfer and can no longer participate.';
  } else if (profile.currentStatus === ParticipantStatus.ATTENTION_CHECK) {
    return '⚠️ This participant has been sent an attention check.';
  }

  return '';
}

/** True if participating in experiment (not dropped out, not transfer pending)
 *  (note that participants who completed experiment are included here)
 */
export function isActiveParticipant(participant: ParticipantProfile) {
  return (
    participant.currentStatus === ParticipantStatus.IN_PROGRESS ||
    participant.currentStatus === ParticipantStatus.ATTENTION_CHECK ||
    participant.currentStatus === ParticipantStatus.SUCCESS
  );
}

/** If participant has left the experiment before completing it
 * (not active, not pending transfer)
 */
export function isObsoleteParticipant(participant: ParticipantProfile) {
  return (
    participant.currentStatus === ParticipantStatus.TRANSFER_FAILED ||
    participant.currentStatus === ParticipantStatus.TRANSFER_DECLINED ||
    participant.currentStatus === ParticipantStatus.TRANSFER_TIMEOUT ||
    participant.currentStatus === ParticipantStatus.ATTENTION_TIMEOUT ||
    participant.currentStatus === ParticipantStatus.BOOTED_OUT
  );
}

/** If successfully completed experiment. */
export function isSuccessParticipant(participant: ParticipantProfile) {
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
  return (
    participant.currentStatus === ParticipantStatus.TRANSFER_PENDING &&
    participant.transferCohortId === cohortId
  );
}

/** If ended experiment (either successfully or via leaving). */
export function isParticipantEndedExperiment(participant: ParticipantProfile) {
  return (
    participant.currentStatus !== ParticipantStatus.IN_PROGRESS &&
    participant.currentStatus !== ParticipantStatus.ATTENTION_CHECK &&
    participant.currentStatus !== ParticipantStatus.TRANSFER_PENDING
  );
}

/** If participant is on or past the given stage. */
export function isUnlockedStage(
  participant: ParticipantProfile,
  stageId: string
) {
  // The participant must start experiment to unlock stages
  if (!participant.timestamps.startExperiment) return false;

  // If the participant has a transfer pending for the current stage,
  // they are "locked" until they accept
  if (
    participant.currentStageId === stageId &&
    participant.currentStatus !== ParticipantStatus.TRANSFER_PENDING
  ) {
    return true;
  }
  return participant.timestamps.completedStages[stageId];
}

/** Return number of stages that participant completed. */
export function getParticipantProgress(
  participant: ParticipantProfile,
  stageIds: string[] // stages that count towards progress
) {
  let count = 0;
  stageIds.forEach((id) => {
    if (participant.timestamps.completedStages[id]) {
      count += 1;
    }
  });
  return count;
}

/** Returns true if stages include a profile stage with anon set. */
export function requiresAnonymousProfiles(stages: StageConfig[]): boolean {
  const profileStage = stages.find((stage) => stage.kind === StageKind.PROFILE);

  if (!profileStage || profileStage.kind !== StageKind.PROFILE) return false;
  return profileStage.profileType === ProfileType.ANONYMOUS_ANIMAL;
}

export function getAvatarBackgroundColor(emoji: string): string {
  const BACKGROUND_COLORS = [
    '#FF6F61',
    '#A0E8D5',
    '#FFD1A9',
    '#C3B1E1',
    '#B7E4C7',
    '#ADE8F4',
    '#F4D6A9',
    '#D8A7B1',
    '#A3B9D3',
    '#FFC1CC',
  ];
  const index = getHashIntegerFromString(emoji) % 10;
  return BACKGROUND_COLORS[index];
}
