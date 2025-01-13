import { UnifiedTimestamp, generateId } from './shared';
import {
  PROFILE_SET_ANIMALS_1,
  PROFILE_SET_ANIMALS_1_ID,
  PROFILE_SET_ANIMALS_2,
  PROFILE_SET_ANIMALS_2_ID,
  PROFILE_SET_NATURE,
  PROFILE_SET_NATURE_ID
} from './profile_sets';

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
  anonymousProfiles: Record<string, AnonymousProfileMetadata>;
}

/** Anonymous profile data generated from profile set. */
export interface AnonymousProfileMetadata {
  name: string;
  repeat: number; // e.g., if 1, then profile is Cat 2; if 2, then Cat 3
  avatar: string;
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
  // Stage ID to time that stage's waiting phase was marked completed
  completedWaiting: Record<string, UnifiedTimestamp>;
  // Cohort ID to time participant left that cohort
  cohortTransfers: Record<string, UnifiedTimestamp>;
}

export enum ParticipantStatus {
  // Attention check needs to be acknowledged
  ATTENTION_CHECK = 'ATTENTION_CHECK',
  // Actively participating in experiment
  IN_PROGRESS = 'IN_PROGRESS',
  // Completed experiment
  SUCCESS = 'SUCCESS',
  // Waiting for participant to accept transfer
  TRANSFER_PENDING = 'TRANSFER_PENDING',
  // Transfer timed out before experimenter could assign a transfer
  TRANSFER_TIMEOUT = 'TRANSFER_TIMEOUT',
  // Failed to transfer to an assigned cohort within the designated time
  TRANSFER_FAILED = 'TRANSFER_FAIL',
  // Declined to be transferred to a new experiment
  TRANSFER_DECLINED = 'TRANSFER_DECLINED',
  // Failed to clear the attention check within the designated time
  ATTENTION_TIMEOUT = 'ATTENTION_FAIL',
  // Booted from the experiment by the experimenter
  BOOTED_OUT = 'BOOTED_OUT',
  // Deleted (e.g., if cohort was deleted).
  // The participant will not be part of dashboard, data download, etc.
  DELETED = 'DELETED'
}

// ************************************************************************* //
// CONSTANTS                                                                 //
// ************************************************************************* //
export const COLORS: string[] = [
  'Red',
  'Orange',
  'Yellow',
  'Green',
  'Blue',
  'Purple',
  'Pink'
];

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create ProgressTimestamps config. */
export function createProgressTimestamps(
  config: Partial<ProgressTimestamps> = {},
): ProgressTimestamps {
  return {
    acceptedTOS: config.acceptedTOS ?? null,
    startExperiment: config.startExperiment ?? null,
    endExperiment: config.endExperiment ?? null,
    completedStages: config.completedStages ?? {},
    completedWaiting: config.completedWaiting ?? {},
    cohortTransfers: config.cohortTransfers ?? {},
  };
}

/** Create base participant config. */
export function createParticipantProfileBase(
  config: Partial<ParticipantProfileBase> = {},
): ParticipantProfileBase {
  return {
    name: config.name ?? null,
    avatar: config.avatar ?? null,
    pronouns: config.pronouns ?? null,
  }
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
    anonymousProfiles: {},
  }
}

/** Set profile fields based on participant number. */
export function setProfile(
  participantNumber: number,
  config: ParticipantProfileExtended,
  setAnonymousProfile = false,
) {
  const generateProfileFromSet = (
    profileSet: {name: string, avatar: string}[]
  ): AnonymousProfileMetadata => {
    // TODO: Randomly select from set
    const { name, avatar } = profileSet[participantNumber % profileSet.length];
    return {
      name,
      avatar,
      repeat: Math.floor(participantNumber / profileSet.length)
    };
  };

  // Set anonymous profiles
  const profileAnimal1 = generateProfileFromSet(PROFILE_SET_ANIMALS_1);
  const profileAnimal2 = generateProfileFromSet(PROFILE_SET_ANIMALS_2);
  const profileNature = generateProfileFromSet(PROFILE_SET_NATURE);

  config.anonymousProfiles[PROFILE_SET_ANIMALS_1_ID] = profileAnimal1;
  config.anonymousProfiles[PROFILE_SET_ANIMALS_2_ID] = profileAnimal2;
  config.anonymousProfiles[PROFILE_SET_NATURE_ID] = profileNature;

  // Define public ID (using anonymous animal 1 set)
  const mainProfile = profileAnimal1;
  const color = COLORS[Math.floor(Math.random() * COLORS.length)]
  const randomNumber = Math.floor(Math.random() * 10000);

  config.publicId = `${mainProfile.name}-${color}-${randomNumber}`.toLowerCase();

  if (setAnonymousProfile) {
    // Use, e.g., "Cat 2" if second time "Cat" is being used
    config.name = `${mainProfile.name}${mainProfile.repeat === 0 ? '' : ` ${mainProfile.repeat + 1}`}`;
    config.avatar = mainProfile.avatar;
    config.pronouns = '';
  }
}