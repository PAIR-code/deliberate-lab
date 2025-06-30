import {generateId} from '../shared';
import {
  BaseStageConfig,
  StageKind,
  StageGame,
  createStageTextConfig,
  createStageProgressConfig,
} from './stage';
import {
  ParticipantProfileBase,
  createParticipantProfileBase,
} from '../participant';

/** Private chat stage types and functions.
 *
 * NOTE: Private chat means current participant ONLY plus any cohort
 * mediators. For 1:1 participant chat, use other chat stage(s).
 */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

/**
 * PrivateChatStageConfig.
 *
 * This is saved as a stage doc under experiments/{experimentId}/stages
 */
export interface PrivateChatStageConfig extends BaseStageConfig {
  kind: StageKind.PRIVATE_CHAT;
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //
export function createPrivateChatStage(
  config: Partial<PrivateChatStageConfig> = {},
): PrivateChatStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.PRIVATE_CHAT,
    game: config.game ?? StageGame.NONE,
    name: config.name ?? 'Private chat',
    descriptions: config.descriptions ?? createStageTextConfig(),
    progress:
      config.progress ??
      createStageProgressConfig({waitForAllParticipants: true}),
  };
}
