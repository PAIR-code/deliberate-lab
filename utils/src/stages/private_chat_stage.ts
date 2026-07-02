import {generateId} from '../shared';
import {
  BaseStageConfig,
  StageKind,
  createStageTextConfig,
  createStageProgressConfig,
} from './stage';

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
  // TODO: Migrate to seconds for internal storage to avoid fractional-minute ambiguity.
  // If defined, ends chat after specified time limit (integer minutes)
  // (starting from when the first message is sent)
  timeLimitInMinutes: number | null;
  // Minimum amount of time a participant must spend in chat (integer minutes)
  timeMinimumInMinutes: number | null;
  // If true, requires participant to go back and forth with mediator(s)
  // (rather than being able to send multiple messages at once)
  isTurnBasedChat: boolean;
  // If true, displays the group-chat-style turn UI: an "It's your
  // turn"/"Waiting for ..." banner, an inline typing indicator with the
  // mediator's avatar, and mediator-goes-first ordering. Mutually exclusive
  // with isTurnBasedChat (the private chat editor disables one when the
  // other is checked). When neither is true, the legacy private-chat turn UX
  // is used (input disabled while waiting, with a per-message spinner and
  // cancel button).
  isTurnBasedChatGroupStyle: boolean;
  // Minimum number of messages participant must send to move on
  minNumberOfTurns: number;
  // If turn based chat set to true, this specifies the max
  // number of messages the participant can send (since the participant
  // can only send one message per turn)
  // If not set, there is no limit
  maxNumberOfTurns: number | null;
  // If true, prevents participants from cancelling pending requests
  // while waiting for a response (to prevent gaming minimum message counts)
  preventCancellation: boolean;
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
    name: config.name ?? 'Private chat',
    descriptions: config.descriptions ?? createStageTextConfig(),
    progress:
      config.progress ??
      createStageProgressConfig({waitForAllParticipants: true}),
    timeLimitInMinutes: config.timeLimitInMinutes ?? null,
    timeMinimumInMinutes: config.timeMinimumInMinutes ?? null,
    isTurnBasedChat: config.isTurnBasedChat ?? true,
    isTurnBasedChatGroupStyle: config.isTurnBasedChatGroupStyle ?? false,
    minNumberOfTurns: config.minNumberOfTurns ?? 0,
    maxNumberOfTurns: config.maxNumberOfTurns ?? null,
    preventCancellation: config.preventCancellation ?? false,
  };
}
