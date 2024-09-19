import { generateId } from '../shared';
import {
  BaseStageConfig,
  StageGame,
  StageKind,
  createStageTextConfig
} from './stage';

/** Payout stage types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

export interface PayoutStageConfig extends BaseStageConfig {
  kind: StageKind.PAYOUT;
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create payout stage. */
export function createPayoutStage(
  config: Partial<PayoutStageConfig> = {}
): PayoutStageConfig {
  return {
    id: generateId(),
    kind: StageKind.PAYOUT,
    game: config.game ?? StageGame.NONE,
    name: config.name ?? 'Payout',
    descriptions: config.descriptions ?? createStageTextConfig(),
  };
}
