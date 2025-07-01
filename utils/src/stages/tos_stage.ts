import {generateId} from '../shared';
import {
  BaseStageConfig,
  StageKind,
  createStageTextConfig,
  createStageProgressConfig,
} from './stage';

/** Terms of Service (TOS) stage types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

export interface TOSStageConfig extends BaseStageConfig {
  kind: StageKind.TOS;
  tosLines: string[];
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create TOS stage. */
export function createTOSStage(
  config: Partial<TOSStageConfig> = {},
): TOSStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.TOS,
    name: config.name ?? 'Terms of Service',
    descriptions: config.descriptions ?? createStageTextConfig(),
    progress: config.progress ?? createStageProgressConfig(),
    tosLines: config.tosLines ?? [],
  };
}
