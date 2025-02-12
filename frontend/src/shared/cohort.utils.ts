import {
  CohortConfig,
  ParticipantProfile,
  RankingStageConfig,
  RankingType,
} from '@deliberation-lab/utils';
import {isObsoleteParticipant} from './participant.utils';

/**
 * Cohort utils for frontend only.
 * For utils shared between frontend and backend, see @deliberation-lab/utils
 */

/** Get cohort name (or abbreviated ID if no name). */
export function getCohortName(cohort: CohortConfig) {
  const name = cohort.metadata.name;
  return name.length > 0 ? name : `Cohort ${cohort.id.slice(0, 6)}`;
}

/** Get cohort description (or empty if no description). */
export function getCohortDescription(cohort: CohortConfig) {
  return cohort.metadata.description;
}

/** Given list of participants, return ones in the given cohort. */
export function getCohortParticipants(
  participants: ParticipantProfile[],
  cohortId: string,
  countObsoleteParticipants = true, // participants who left the experiment
  includeParticipantsPendingTransferToCohort = true,
) {
  let participantList = participants;

  // If not counting obsolete, filter out participants
  // who left the experiment before completing
  if (!countObsoleteParticipants) {
    participantList = participants.filter(
      (participant) => !isObsoleteParticipant(participant),
    );
  }

  return participantList.filter((participant) => {
    if (
      includeParticipantsPendingTransferToCohort &&
      participant.transferCohortId
    ) {
      return participant.transferCohortId === cohortId;
    } else {
      return participant.currentCohortId === cohortId;
    }
  });
}

/** Determine if cohort is full given cohort config and all participants. */
export function hasMaxParticipantsInCohort(
  cohort: CohortConfig,
  participants: ParticipantProfile[],
) {
  if (!cohort.participantConfig.maxParticipantsPerCohort) return false;

  const numParticipants = getCohortParticipants(
    participants,
    cohort.id,
    cohort.participantConfig.includeAllParticipantsInCohortCount,
    true, // include participants pending transfer into this stage
  ).length;

  return (
    numParticipants >= Number(cohort.participantConfig.maxParticipantsPerCohort)
  );
}

/** Determine if cohort meets min participants requirement
 *  given cohort config and all participants.
 */
export function hasMinParticipantsInCohort(
  cohort: CohortConfig,
  participants: ParticipantProfile[],
) {
  if (!cohort.participantConfig.minParticipantsPerCohort) return true;

  const numParticipants = getCohortParticipants(
    participants,
    cohort.id,
    cohort.participantConfig.includeAllParticipantsInCohortCount,
    true, // include participants pending transfer into this stage
  ).length;

  return (
    numParticipants >= Number(cohort.participantConfig.minParticipantsPerCohort)
  );
}

/** Given cohort participants, return list of ranking items. */
export function getCohortRankingItems(
  participants: ParticipantProfile[],
  currentParticipantPublicId: string,
  stage: RankingStageConfig,
) {
  if (stage.rankingType === RankingType.ITEMS) {
    return stage.rankingItems;
  }

  if (stage.enableSelfVoting) {
    return participants;
  }

  return participants.filter(
    (profile) => profile.publicId !== currentParticipantPublicId,
  );
}
