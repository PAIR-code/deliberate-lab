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

  const defaultText = 'Please wait while we transfer you to the next stage of the experiment. Some latency may occur as we wait for additional participants.';
  return {
    id: config.id ?? generateId(),
    kind: StageKind.TRANSFER,
    game: config.game ?? StageGame.NONE,
    name: config.name ?? 'Transfer',
    descriptions: config.descriptions ?? createStageTextConfig({primaryText : defaultText}),
    enableTimeout: config.enableTimeout ?? false,
    timeoutSeconds: config.timeoutSeconds ?? 600, // 10 minutes
  };
}
