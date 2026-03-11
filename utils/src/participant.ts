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
    variableMap: config.variableMap ?? {},
  };
}

/** Set profile fields based on participant number. */
export function setProfile(
  participantNumber: number,
  config: ParticipantProfileExtended,
  setAnonymousProfile = false,
  profileType: ProfileType = ProfileType.ANONYMOUS_ANIMAL,
) {
  const randomNumber = Math.floor(Math.random() * 10000);

  // Create anonymous profile from a named profile set.
  // Appends random number to name (e.g., "Bear 1002", "Participant 1002").
  const profileFromSet = (
    profileSet: {name: string; avatar: string}[],
  ): AnonymousProfileMetadata => {
    const {name, avatar} = profileSet[participantNumber % profileSet.length];
    return {
      name: `${name} ${randomNumber}`,
      avatar,
      repeat: Math.floor(participantNumber / profileSet.length),
    };
  };

  // Set anonymous profiles for each profile set
  config.anonymousProfiles = {
    [PROFILE_SET_ANIMALS_1_ID]: profileFromSet(PROFILE_SET_ANIMALS_1),
    [PROFILE_SET_ANIMALS_2_ID]: profileFromSet(PROFILE_SET_ANIMALS_2),
    [PROFILE_SET_NATURE_ID]: profileFromSet(PROFILE_SET_NATURE),
    [PROFILE_SET_ANONYMOUS_PARTICIPANT_ID]: {
      name: `Participant ${randomNumber}`,
      avatar: '👤',
      repeat: 0,
    },
    // Random hashes for ordering/randomization
    [PROFILE_SET_RANDOM_1_ID]: {name: generateId(), avatar: '', repeat: 0},
    [PROFILE_SET_RANDOM_2_ID]: {name: generateId(), avatar: '', repeat: 0},
    [PROFILE_SET_RANDOM_3_ID]: {name: generateId(), avatar: '', repeat: 0},
  };

  // Define public ID using base animal name (without number suffix)
  const baseName =
    PROFILE_SET_ANIMALS_1[participantNumber % PROFILE_SET_ANIMALS_1.length]
      .name;
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  config.publicId = `${baseName}-${color}-${randomNumber}`.toLowerCase();

  // Set display profile for anonymous participants
  if (setAnonymousProfile) {
    const profileSetMap: Partial<Record<ProfileType, string>> = {
      [ProfileType.ANONYMOUS_ANIMAL]: PROFILE_SET_ANIMALS_1_ID,
      [ProfileType.ANONYMOUS_PARTICIPANT]: PROFILE_SET_ANONYMOUS_PARTICIPANT_ID,
    };
    const profileSetId = profileSetMap[profileType];
    if (profileSetId) {
      const profile = config.anonymousProfiles[profileSetId];
      config.name = profile.name;
      config.avatar = profile.avatar;
    }
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
