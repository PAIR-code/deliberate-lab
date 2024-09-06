import { generateId } from '../shared';
import {
  BaseStageConfig,
  StageGame,
  StageKind,
  createStageTextConfig,
} from './stage';

/** Transfer stage types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

export interface TransferStageConfig extends BaseStageConfig {
  kind: StageKind.TRANSFER;
  enableTimeout: boolean;
  timeoutSeconds: number;
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create transfer stage. */
export function createTransferStage(
  config: Partial<TransferStageConfig> = {}
): TransferStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.TRANSFER,
    game: config.game ?? StageGame.NONE,
    name: config.name ?? 'Transfer',
    descriptions: config.descriptions ?? createStageTextConfig(),
    enableTimeout: config.enableTimeout ?? false,
    timeoutSeconds: config.timeoutSeconds ?? 600, // 10 minutes
  };
}
