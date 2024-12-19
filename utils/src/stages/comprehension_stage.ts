import { generateId } from '../shared';
import {
  BaseStageConfig,
  StageGame,
  StageKind,
  createStageTextConfig,
  createStageProgressConfig,
} from './stage';

/** Comprehension stage types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

export interface ComprehensionStageConfig extends BaseStageConfig {
  kind: StageKind.COMPREHENSION;
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create info stage. */
export function createComprehensionStage(
  config: Partial<ComprehensionStageConfig> = {}
): ComprehensionStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.COMPREHENSION,
    game: config.game ?? StageGame.NONE,
    name: config.name ?? 'Info',
    descriptions: config.descriptions ?? createStageTextConfig(),
    progress: config.progress ?? createStageProgressConfig(),
  };
}
