import { UnifiedTimestamp } from './shared';

/** Participant profile types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

/** Profile data that the participant can edit. */
export interface ParticipantProfileBase {
  pronouns: string|null;
  avatar: string|null; // emoji used as avatar
  name: string|null;
}

/** Participant profile available in publicParticipantData collection. */
export interface ParticipantProfile extends ParticipantProfileBase {
  publicId: string;
  prolificId: string|null;
  currentStageId: string;
  currentCohort: string;
  currentStatus: ParticipantStatus;
  timestamps: ProgressTimestamps;
}

/** Participant profile available in private participants collection. */
export interface ParticipantProfileExtended {
  privateId: string;
}

export interface ProgressTimestamps {
  // Time participant accepted the terms of service
  acceptedTOS: UnifiedTimestamp|null;
  // Time participant joined the experiment (i.e., was created)
  startExperiment: UnifiedTimestamp|null;
  // Time participant completed the experiment
  endExperiment: UnifiedTimestamp|null;
  // Stage ID to time that stage was marked completed
  completedStages: Record<string, UnifiedTimestamp>;
  // Cohort ID to time participant joined or was transferred to that cohort
  cohortTransfers: Record<string, UnifiedTimestamp>;
}

export enum ParticipantStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  // Completed experiment
  SUCCESS = 'SUCCESS',
  // Failed to transfer to an assigned cohort within the designated time
  TRANSFER_FAILED = 'TRANSFER_FAIL',
  // Declined to be transferred to a new experiment
  TRANSFER_DECLINED = 'TRANSFER_DECLINED',
  // Failed to clear the attention check within the designated time
  ATTENTION_TIMEOUT = 'ATTENTION_FAIL',
  // Booted from the experiment by the experimenter
  BOOTED_OUT = 'BOOTED_OUT',
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

export const participantPublicId = (index: number) => `participant-${index}`;