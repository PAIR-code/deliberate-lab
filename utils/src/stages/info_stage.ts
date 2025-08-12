import {generateId} from '../shared';
import {
  BaseStageConfig,
  StageKind,
  createStageTextConfig,
  createStageProgressConfig,
} from './stage';

/** Info stage types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

export interface InfoStageConfig extends BaseStageConfig {
  kind: StageKind.INFO;
  infoLines: string[];
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create info stage. */
export function createInfoStage(
  config: Partial<InfoStageConfig> = {},
): InfoStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.INFO,
    name: config.name ?? 'Info',
    descriptions: config.descriptions ?? createStageTextConfig(),
    progress: config.progress ?? createStageProgressConfig(),
    infoLines: config.infoLines ?? [],
  };
}
