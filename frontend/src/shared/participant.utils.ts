import {
  ALTERNATE_PROFILE_SET_ID,
  PROFILE_SET_ANIMALS_2_ID,
  ParticipantProfile,
  ParticipantStatus,
  ProfileType,
  StageConfig,
  StageKind,
} from '@deliberation-lab/utils';

/**
 * Participant utils for frontend only.
 * For utils shared between frontend and backend, see @deliberation-lab/utils
 */

/** Get participant avatar/name string based on active profile. */
export function getParticipantInlineDisplay(
  participant: ParticipantProfile,
  showIsSelf = false, // add (you) to the end
  stageId = '',
) {
  if (
    stageId.includes(ALTERNATE_PROFILE_SET_ID) &&
    participant.anonymousProfiles[PROFILE_SET_ANIMALS_2_ID]
  ) {
    const anon = participant.anonymousProfiles[PROFILE_SET_ANIMALS_2_ID];
    return `${anon.avatar} ${anon.name}${showIsSelf ? ' (you)' : ''}`;
  }

  return `
    ${participant.avatar ?? ''} ${participant.name ?? participant.publicId}${
      showIsSelf ? ' (you)' : ''
    }
  `;
}

/** Returns the start timestamp of the current stage. */
export function getCurrentStageStartTime(
  participant: ParticipantProfile,
  stageIds: string[], // An ordered list of stages in the experiment.
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
export function getParticipantStatusDetailText(
  profile: ParticipantProfile,
  isStageInWaitingPhase = false,
  defaultText = '',
) {
  if (isStageInWaitingPhase && profile.connected) {
    return '⏸️ This participant currently sees a wait stage; they are waiting for others in the cohort to catch up.';
  }

  if (profile.currentStatus === ParticipantStatus.BOOTED_OUT) {
    return '‼️  This participant has been booted from the experiment and can no longer participate.';
  } else if (profile.currentStatus === ParticipantStatus.ATTENTION_TIMEOUT) {
    return '‼️  This participant has failed an attention check and can no longer participate.';
  } else if (profile.currentStatus === ParticipantStatus.TRANSFER_DECLINED) {
    return '🛑 This participant declined a transfer and can no longer participate.';
  } else if(isDisconnectedUnfinishedParticipant(profile)) {
    return '🔌 This participant is disconnected, and cannot continue until they reconnect.';
  } else if (profile.currentStatus === ParticipantStatus.ATTENTION_CHECK) {
    return '⚠️ This participant has been sent an attention check.';
  } else if (profile.currentStatus === ParticipantStatus.TRANSFER_PENDING) {
    return '⚠️ This participant has been sent a transfer invitation.';
  }

  return defaultText;
}

/** True if participating in experiment (online, not dropped out, not transfer pending)
 *  (note that participants who completed experiment are included here)
 */
export function isActiveParticipant(participant: ParticipantProfile) {
  return (
    participant.currentStatus === ParticipantStatus.SUCCESS ||
    (
      participant.connected === true &&
      (
        participant.currentStatus === ParticipantStatus.IN_PROGRESS ||
        participant.currentStatus === ParticipantStatus.ATTENTION_CHECK
      )
     )
  );
}

/** If participant has left the experiment before completing it
 * (not active, not pending transfer)
 */
export function isObsoleteParticipant(participant: ParticipantProfile) {
  return (
    isDisconnectedUnfinishedParticipant(participant) ||
    participant.currentStatus === ParticipantStatus.TRANSFER_FAILED ||
    participant.currentStatus === ParticipantStatus.TRANSFER_DECLINED ||
    participant.currentStatus === ParticipantStatus.TRANSFER_TIMEOUT ||
    participant.currentStatus === ParticipantStatus.ATTENTION_TIMEOUT ||
    participant.currentStatus === ParticipantStatus.BOOTED_OUT
  );
}

export function isDisconnectedUnfinishedParticipant(participant: ParticipantProfile) {
  return (
    participant.connected === false &&
    ! isParticipantEndedExperiment(participant)
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
  return participant.connected === true && participant.currentStatus === ParticipantStatus.TRANSFER_PENDING;
}

/** If pending transfer to given cohort ID. */
export function isParticipantPendingTransfer(
  participant: ParticipantProfile,
  cohortId: string,
) {
  return (
    participant.connected === true &&
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
// NOTE: "completedWaiting" map is now used to track when a participant reaches
// a stage
export function isUnlockedStage(
  participant: ParticipantProfile,
  stageId: string,
) {
  // If the participant has a transfer pending for the current stage,
  // they are "locked" until they accept
  if (
    participant.currentStageId === stageId &&
    participant.currentStatus === ParticipantStatus.TRANSFER_PENDING
  ) {
    return false;
  }

  // Backwards compatibility: If readyStages does not exist in timestamps,
  // return true
  if (!('readyStages' in participant.timestamps)) {
    return true;
  }

  return participant.timestamps.startExperiment &&
    participant.timestamps.readyStages[stageId];
}

/** Return number of stages that participant completed. */
export function getParticipantProgress(
  participant: ParticipantProfile,
  stageIds: string[], // stages that count towards progress
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
