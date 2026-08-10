import {ProfileAgentConfig} from './agent';
import {MediatorProfile} from './mediator';
import {UnifiedTimestamp, generateId} from './shared';
import {ProfileType} from './stages/profile_stage';
import {
  SECONDARY_PROFILE_SET_ID,
  TERTIARY_PROFILE_SET_ID,
  PROFILE_SET_ANIMALS_1,
  PROFILE_SET_ANIMALS_1_ID,
  PROFILE_SET_ANIMALS_2,
  PROFILE_SET_ANIMALS_2_ID,
  PROFILE_SET_NATURE,
  PROFILE_SET_NATURE_ID,
  PROFILE_SET_ANONYMOUS_PARTICIPANT_ID,
  PROFILE_SET_RANDOM_1_ID,
  PROFILE_SET_RANDOM_2_ID,
  PROFILE_SET_RANDOM_3_ID,
  getActiveProfileSetId,
} from './profile_sets';

/** Participant profile types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

/** Profile data that the participant can edit. */
// TODO: Rename?
export interface ParticipantProfileBase {
  pronouns: string | null;
  avatar: string | null; // emoji used as avatar
  name: string | null;
}

/** Profile. */
export type UserProfile = ParticipantProfile | MediatorProfile;

export interface UserProfileBase extends ParticipantProfileBase {
  type: UserType;
}

export enum UserType {
  PARTICIPANT = 'participant',
  MEDIATOR = 'mediator',
  EXPERIMENTER = 'experimenter', // if experimenter needs to intervene
  SYSTEM = 'system', // for automated messages (e.g., user left chat)
  UNKNOWN = 'unknown',
}

/** Participant profile available in publicParticipantData collection. */
export interface ParticipantProfile extends UserProfileBase {
  type: UserType.PARTICIPANT;
  publicId: string;
  prolificId: string | null;
  currentStageId: string;
  currentCohortId: string;
  transferCohortId: string | null; // set if pending transfer, else null
  currentStatus: ParticipantStatus;
  timestamps: ProgressTimestamps;
  anonymousProfiles: Record<string, AnonymousProfileMetadata>;
  connected: boolean | null;
  isObserver?: boolean; // Read-only observer participant type
  hasRepresentative?: boolean; // Whether the observer has a representative agent spawned
  isQuizzed?: boolean; // Whether this round's treatment includes the periodic group-chat quiz (hoisted from _isQuizzed at the transfer)
  otherAgentGeneration?: {
    numOtherAgents: number;
    // Number of inactive personas to spawn alongside numOtherAgents.
    // These generate a persona for prompt context but do not chat or take turns.
    numInactivePersonas?: number;
  };
  swapMediator?: string; // Name or ID of mediator to swap to when entering a group chat
  // Maps variable name to value assigned specifically for this participant
  // This overrides any variable values set at the cohort/experiment levels.
  variableMap?: Record<string, string>;
}

/** Anonymous profile data generated from profile set. */
export interface AnonymousProfileMetadata {
  name: string;
  repeat: number; // e.g., if 1, then profile is Cat 2; if 2, then Cat 3
  avatar: string;
}

/** Participant observation thought structure. */
export interface ParticipantThought {
  id: string;
  text: string;
  timestamp: UnifiedTimestamp;
}

/** Participant profile available in private participants collection. */
export interface ParticipantProfileExtended extends ParticipantProfile {
  privateId: string;
  // If null, operated by human (otherwise, specifies agent persona, model)
  agentConfig: ProfileAgentConfig | null;
}

export interface ProgressTimestamps {
  // Time participant accepted the terms of service
  acceptedTOS: UnifiedTimestamp | null;
  // Time participant joined the experiment (i.e., was created)
  startExperiment: UnifiedTimestamp | null;
  // Time participant completed the experiment
  endExperiment: UnifiedTimestamp | null;
  // Stage ID to time that stage was marked completed
  completedStages: Record<string, UnifiedTimestamp>;
  // Stage ID to time participant is ready to start it
  // (i.e., time previous stage was completed)
  readyStages: Record<string, UnifiedTimestamp>;
  // Cohort ID to time participant left that cohort
  cohortTransfers: Record<string, UnifiedTimestamp>;
}

export enum ParticipantStatus {
  // Paused by experimenter
  PAUSED = 'PAUSED',
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
  DELETED = 'DELETED',
}

// ************************************************************************* //
// CONSTANTS                                                                 //
// ************************************************************************* //
// Reserved for mediators when an experiment assigns observers; participant
// profiles must never be generated with it in those experiments.
export const MEDIATOR_OBSERVER_COLOR = 'blue';

export const COLORS: string[] = [
  'Red',
  'Orange',
  'Yellow',
  'Green',
  'Blue',
  'Purple',
  'Pink',
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
    readyStages: config.readyStages ?? {},
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
  };
}

/**
 * Display profile (name + avatar) for an observer's AI representative.
 * The avatar defaults to a robot.
 */
export function getRepresentativeProfile(
  observerName: string,
  avatar = '🤖',
): {
  name: string;
  avatar: string;
} {
  return {name: `${observerName}'s Agent (yours)`, avatar};
}

/** Create private participant config. */
export function createParticipantProfileExtended(
  config: Partial<ParticipantProfileExtended> = {},
): ParticipantProfileExtended {
  return {
    type: UserType.PARTICIPANT,
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
    connected: config.agentConfig ? true : false,
    agentConfig: config.agentConfig ?? null,
    isObserver: config.isObserver ?? false,
    hasRepresentative: config.hasRepresentative ?? false,
    isQuizzed: config.isQuizzed ?? false,
    otherAgentGeneration: config.otherAgentGeneration ?? {
      numOtherAgents: 0,
    },
    swapMediator: config.swapMediator ?? '',
    variableMap: config.variableMap ?? {},
  };
}

/** Set profile fields based on participant number. */
export function setProfile(
  participantNumber: number,
  config: ParticipantProfileExtended,
  setAnonymousProfile = false,
  profileType: ProfileType = ProfileType.ANONYMOUS_ANIMAL,
  excludeColor?: string | string[],
) {
  const generateProfileFromSet = (
    profileSet: {name: string; avatar: string}[],
  ): AnonymousProfileMetadata => {
    // TODO: Randomly select from set
    const {name, avatar} = profileSet[participantNumber % profileSet.length];
    return {
      name,
      avatar,
      repeat: Math.floor(participantNumber / profileSet.length),
    };
  };

  const generateRandomHashProfile = (): AnonymousProfileMetadata => {
    return {
      name: generateId(),
      avatar: '',
      repeat: 0,
    };
  };

  // Generate random number for unique participant ID (used in publicID and anonymous participant profile)
  const randomNumber = Math.floor(Math.random() * 10000);

  const generateAnonymousParticipantProfile = (): AnonymousProfileMetadata => {
    return {
      name: `Participant ${randomNumber}`,
      avatar: '👤',
      repeat: 0,
    };
  };

  // Set anonymous profiles
  const profileAnimal1 = generateProfileFromSet(PROFILE_SET_ANIMALS_1);
  const profileAnimal2 = generateProfileFromSet(PROFILE_SET_ANIMALS_2);
  const profileNature = generateProfileFromSet(PROFILE_SET_NATURE);
  const profileAnonymousParticipant = generateAnonymousParticipantProfile();

  config.anonymousProfiles[PROFILE_SET_ANIMALS_1_ID] = profileAnimal1;
  config.anonymousProfiles[PROFILE_SET_ANIMALS_2_ID] = profileAnimal2;
  config.anonymousProfiles[PROFILE_SET_NATURE_ID] = profileNature;
  config.anonymousProfiles[PROFILE_SET_ANONYMOUS_PARTICIPANT_ID] =
    profileAnonymousParticipant;

  // Set random hashes (can be used for random ordering, etc.)
  config.anonymousProfiles[PROFILE_SET_RANDOM_1_ID] =
    generateRandomHashProfile();
  config.anonymousProfiles[PROFILE_SET_RANDOM_2_ID] =
    generateRandomHashProfile();
  config.anonymousProfiles[PROFILE_SET_RANDOM_3_ID] =
    generateRandomHashProfile();

  // Define public ID (using anonymous animal 1 set)
  const mainProfile = profileAnimal1;
  const excludedColors = (
    Array.isArray(excludeColor)
      ? excludeColor
      : excludeColor
        ? [excludeColor]
        : []
  ).map((c) => c.toLowerCase());
  const filteredPool = COLORS.filter(
    (c) => !excludedColors.includes(c.toLowerCase()),
  );
  const colorPool = filteredPool.length > 0 ? filteredPool : COLORS;
  const color = colorPool[Math.floor(Math.random() * colorPool.length)];

  config.publicId =
    `${mainProfile.name}-${color}-${randomNumber}`.toLowerCase();

  if (setAnonymousProfile) {
    if (profileType === ProfileType.ANONYMOUS_PARTICIPANT) {
      // Use participant number profile
      const participantProfile =
        config.anonymousProfiles[PROFILE_SET_ANONYMOUS_PARTICIPANT_ID];
      config.name = participantProfile.name;
      config.avatar = participantProfile.avatar;
    } else if (profileType === ProfileType.ANONYMOUS_ANIMAL) {
      // Use animal profile (default)
      config.name = `${mainProfile.name}${mainProfile.repeat === 0 ? '' : ` ${mainProfile.repeat + 1}`}`;
      config.avatar = mainProfile.avatar;
    }
    // Note: ProfileType.DEFAULT should not reach here as setAnonymousProfile would be false
    config.pronouns = '';
  }
}

/** Randomly sort participants using random hash anonymous profiles.
 * If random hash is not available, use public ID.
 */
export function sortParticipantsByRandomProfile(
  participants: ParticipantProfile[],
  stageId: string = '', // empty string will default to random 1 ID
) {
  participants.sort((p1: ParticipantProfile, p2: ParticipantProfile) => {
    let sortKey1 = '';
    let sortKey2 = '';
    // If secondary profile, use random 2 ID
    if (stageId.includes(SECONDARY_PROFILE_SET_ID)) {
      sortKey1 =
        p1.anonymousProfiles[PROFILE_SET_RANDOM_2_ID]?.name ?? p1.publicId;
      sortKey2 =
        p2.anonymousProfiles[PROFILE_SET_RANDOM_2_ID]?.name ?? p2.publicId;
    } else if (stageId.includes(TERTIARY_PROFILE_SET_ID)) {
      // If tertiary profile, use random 3 ID
      sortKey1 =
        p1.anonymousProfiles[PROFILE_SET_RANDOM_3_ID]?.name ?? p1.publicId;
      sortKey2 =
        p2.anonymousProfiles[PROFILE_SET_RANDOM_3_ID]?.name ?? p2.publicId;
    } else {
      // Else, use random 1 ID
      sortKey1 =
        p1.anonymousProfiles[PROFILE_SET_RANDOM_1_ID]?.name ?? p1.publicId;
      sortKey2 =
        p2.anonymousProfiles[PROFILE_SET_RANDOM_1_ID]?.name ?? p2.publicId;
    }
    return sortKey1.localeCompare(sortKey2);
  });
  return participants;
}

export function getNameFromPublicId(
  participants: ParticipantProfile[],
  publicId: string,
  profileSetId: string, // leave empty to use default profile
  includeAvatar = true,
  includePronouns = false,
) {
  const profile = participants.find((p) => p.publicId === publicId);
  if (!profile) return publicId;
  return getParticipantDisplayName(
    profile,
    profileSetId,
    includeAvatar,
    includePronouns,
  );
}

export function getParticipantDisplayName(
  profile: ParticipantProfile,
  profileSetId: string, // leave empty to use default profile
  includeAvatar = true,
  includePronouns = false,
) {
  // If profile set ID specified, use the corresponding anonymous profile
  const profileName = profileSetId
    ? profile?.anonymousProfiles[profileSetId]?.name
    : profile?.name;
  const profileAvatar = profileSetId
    ? profile?.anonymousProfiles[profileSetId]?.avatar
    : profile?.avatar;
  const profilePronouns = profile?.pronouns;

  if (profile && profileName) {
    const avatar = includeAvatar && profileAvatar ? `${profileAvatar} ` : '';
    const pronouns =
      includePronouns && profilePronouns ? ` (${profilePronouns})` : '';
    return `${avatar}${profileName}${pronouns}`;
  }
  return profile.publicId;
}

/**
 * Returns the identity (name/avatar/pronouns) to display for a participant in
 * a given stage.
 *
 * If the stage opts into an anonymous profile set — either explicitly via
 * `explicitProfileSetId` (from the stage config's `anonymousProfileSetId`) or,
 * for legacy experiments, inferred from the stage id via getActiveProfileSetId
 * — and the participant has that anonymous profile, it is returned. Otherwise
 * the participant's base identity is used. Callers that have the stage config
 * should pass `stage.anonymousProfileSetId` as `explicitProfileSetId`.
 */
export function getParticipantStageProfile(
  profile: ParticipantProfile,
  stageId = '',
  stageName = '',
  explicitProfileSetId?: string,
): {name: string; avatar: string; pronouns: string | null} {
  if (!profile) {
    return {name: '', avatar: '', pronouns: null};
  }
  const profileSetId =
    explicitProfileSetId || getActiveProfileSetId(stageId, stageName);
  if (profileSetId && profile.anonymousProfiles?.[profileSetId]) {
    const anon = profile.anonymousProfiles[profileSetId];
    return {
      name: anon.name ?? '',
      avatar: anon.avatar ?? '',
      pronouns: null,
    };
  }
  return {
    name: profile.name ?? profile.publicId,
    avatar: profile.avatar ?? '',
    pronouns: profile.pronouns ?? null,
  };
}
