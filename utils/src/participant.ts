import { UnifiedTimestamp, generateId } from './shared';

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
  currentCohortId: string;
  transferCohortId: string|null; // set if pending transfer, else null
  currentStatus: ParticipantStatus;
  timestamps: ProgressTimestamps;
}

/** Participant profile available in private participants collection. */
export interface ParticipantProfileExtended extends ParticipantProfile {
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
  // Actively participating in experiment
  IN_PROGRESS = 'IN_PROGRESS',
  // Completed experiment
  SUCCESS = 'SUCCESS',
  // Waiting for participant to accept transfer
  TRANSFER_PENDING = 'TRANSFER_PENDING',
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

export function generateParticipantPublicId(index: number) {
  return `participant-${index}`;
}

/** Create ProgressTimestamps config. */
export function createProgressTimestamps(
  config: Partial<ProgressTimestamps> = {},
): ProgressTimestamps {
  return {
    acceptedTOS: config.acceptedTOS ?? null,
    startExperiment: config.startExperiment ?? null,
    endExperiment: config.endExperiment ?? null,
    completedStages: config.completedStages ?? {},
    cohortTransfers: config.cohortTransfers ?? {},
  };
}

/** Create private participant config. */
export function createParticipantProfileExtended(
  config: Partial<ParticipantProfileExtended> = {},
): ParticipantProfileExtended {
  return {
    pronouns: config.pronouns ?? null,
    name: config.name ?? null,
    avatar: config.avatar ?? null,
    privateId: config.privateId ?? generateId(),
    publicId: config.publicId ?? '',
    prolificId: config.prolificId ?? null,
    currentStageId: config.currentStageId ?? '',
    currentCohortId: config.currentCohortId ?? '',
    transferCohortId: config.transferCohortId ?? null,
    currentStatus: config.currentStatus ?? ParticipantStatus.IN_PROGRESS,
    timestamps: config.timestamps ?? createProgressTimestamps(),
  }
}