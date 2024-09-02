import { generateId } from '../shared';
import {
  BaseStageConfig,
  StageGame,
  StageKind,
  createStageTextConfig
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
  config: Partial<TOSStageConfig> = {}
): TOSStageConfig {
  return {
    id: generateId(),
    kind: StageKind.TOS,
    game: config.game ?? StageGame.NONE,
    name: config.name ?? 'Terms of Service',
    descriptions: config.descriptions ?? createStageTextConfig(),
    tosLines: config.tosLines ?? [],
  };
}
