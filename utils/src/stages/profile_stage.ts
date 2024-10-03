import { generateId } from '../shared';
import {
  BaseStageConfig,
  StageGame,
  StageKind,
  createStageProgressConfig,
  createStageTextConfig
} from './stage';

/** Profile stage types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //


export enum ProfileType {
  DEFAULT = 'DEFAULT', // Profiles are set by the participant.
  ANONYMOUS_ANIMAL = 'ANONYMOUS_ANIMAL', // Profiles are set to anonymous animals.
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
  config: Partial<ProfileStageConfig> = {}
): ProfileStageConfig {
  return {
    id: generateId(),
    kind: StageKind.PROFILE,
    game: config.game ?? StageGame.NONE,
    name: config.name ?? 'Set profile',
    descriptions: config.descriptions ?? createStageTextConfig(),
    progress: config.progress ?? createStageProgressConfig(),
    profileType: config.profileType ?? ProfileType.DEFAULT,
  };
}
