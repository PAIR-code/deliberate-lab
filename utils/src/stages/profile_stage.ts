import {generateId} from '../shared';
import {
  BaseStageConfig,
  StageKind,
  createStageProgressConfig,
  createStageTextConfig,
} from './stage';

/** Profile stage types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

export enum ProfileType {
  DEFAULT = 'DEFAULT', // Profiles are set by the participant.
  DEFAULT_GENDERED = 'DEFAULT_GENDERED', // Participants pick from default gendered set.
  ANONYMOUS_ANIMAL = 'ANONYMOUS_ANIMAL', // Profiles are set to anonymous animals.
  ANONYMOUS_PARTICIPANT = 'ANONYMOUS_PARTICIPANT', // Profiles are set to "Participant X" format.
}

export interface ProfileStageConfig extends BaseStageConfig {
  kind: StageKind.PROFILE;
  profileType: ProfileType;
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create profile stage. */
export function createProfileStage(
  config: Partial<ProfileStageConfig> = {},
): ProfileStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.PROFILE,
    name: config.name ?? 'Set profile',
    descriptions: config.descriptions ?? createStageTextConfig(),
    progress: config.progress ?? createStageProgressConfig(),
    profileType: config.profileType ?? ProfileType.DEFAULT,
  };
}
