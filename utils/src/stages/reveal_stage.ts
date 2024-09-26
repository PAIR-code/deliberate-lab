import { generateId } from '../shared';
import {
  BaseStageConfig,
  BaseStageParticipantAnswer,
  BaseStagePublicData,
  StageGame,
  StageKind,
  createStageProgressConfig,
  createStageTextConfig,
} from './stage';

/** Reveal stage types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

/**
 * RevealStageConfig.
 *
 * This is saved as a stage doc under experiments/{experimentId}/stages
 */
export interface RevealStageConfig extends BaseStageConfig {
  kind: StageKind.REVEAL;
  stageIds: string[]; // ordered list of stages to reveal
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create reveal stage. */
export function createRevealStage(
  config: Partial<RevealStageConfig> = {}
): RevealStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.REVEAL,
    game: config.game ?? StageGame.NONE,
    name: config.name ?? 'Reveal',
    descriptions: config.descriptions ?? createStageTextConfig(),
    progress: config.progress ?? createStageProgressConfig(),
    stageIds: config.stageIds ?? [],
  };
}
