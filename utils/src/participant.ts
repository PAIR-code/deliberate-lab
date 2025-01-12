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

export const ANIMAL_PROFILES: {name: string, avatar: string}[] = [
  {name: 'Dog', avatar: '🐶'},
  {name: 'Cat', avatar: '🐱'},
  {name: 'Mouse', avatar: '🐭'},
  {name: 'Hamster', avatar: '🐹'},
  {name: 'Rabbit', avatar: '🐰'},
  {name: 'Fox', avatar: '🦊'},
  {name: 'Bear', avatar: '🐻'},
  {name: 'Panda', avatar: '🐼'},
  {name: 'Koala', avatar: '🐨'},
  {name: 'Lion', avatar: '🦁'},
  {name: 'Tiger', avatar: '🐯'},
  {name: 'Unicorn', avatar: '🦄'},
  {name: 'Zebra', avatar: '🦓'},
  {name: 'Giraffe', avatar: '🦒'},
  {name: 'Pig', avatar: '🐷'},
  {name: 'Cow', avatar: '🐮'},
  {name: 'Frog', avatar: '🐸'},
  {name: 'Chicken', avatar: '🐔'},
  {name: 'Penguin', avatar: '🐧'},
  {name: 'Owl', avatar: '🦉'},
  {name: 'Bird', avatar: '🐦'},
  {name: 'Eagle', avatar: '🦅'},
  {name: 'Lizard', avatar: '🦎'},
  {name: 'Butterfly', avatar: '🦋'},
  {name: 'Fish', avatar: '🐟'},
  {name: 'Shark', avatar: '🦈'},
  {name: 'Dolphin', avatar: '🐬'},
  {name: 'Turtle', avatar: '🐢'},
  {name: 'Parrot', avatar: '🦜'},
  {name: 'Kangaroo', avatar: '🦘'},
  {name: 'Rhinoceros', avatar: '🦏'},
  {name: 'Elephant', avatar: '🐘'},
  {name: 'Monkey', avatar: '🐒'},
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
  }
}

/** Set profile fields based on participant number. */
export function setProfile(
  participantNumber: number,
  config: ParticipantProfileExtended,
  setAnonymousProfile = false,
) {
  // Get name/avatar based on participant number
  const { name, avatar } = ANIMAL_PROFILES[
    participantNumber % ANIMAL_PROFILES.length
  ];

  const color = COLORS[Math.floor(Math.random() * COLORS.length)]
  const randomNumber = Math.floor(Math.random() * 10000);

  config.publicId = `${name}-${color}-${randomNumber}`.toLowerCase();

  if (setAnonymousProfile) {
    // Use, e.g., "Cat 2" if second time "Cat" is being used
    const animalNum = Math.floor(participantNumber / ANIMAL_PROFILES.length);
    config.name = `${name}${animalNum === 0 ? '' : ` ${animalNum + 1}`}`;

    config.avatar = avatar;
    config.pronouns = '';
  }
}