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

export interface ProfileStageConfig extends BaseStageConfig {
  kind: StageKind.PROFILE;
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
  };
}
