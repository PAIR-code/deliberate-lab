import {generateId, UnifiedTimestamp} from '../shared';
import {
  BaseStageConfig,
  BaseStageParticipantAnswer,
  BaseStagePublicData,
  StageKind,
  createStageTextConfig,
  createStageProgressConfig,
} from './stage';

/** Group chat stage types and functions. */
// TODO: Rename file to group_chat_stage.ts

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

/**
 * ChatStageConfig.
 *
 * This is saved as a stage doc under experiments/{experimentId}/stages
 */
export interface ChatStageConfig extends BaseStageConfig {
  kind: StageKind.CHAT;
  discussions: ChatDiscussion[]; // ordered list of discussions
  // TODO: Migrate to seconds for internal storage to avoid fractional-minute ambiguity.
  timeLimitInMinutes: number | null; // Maximum duration in minutes (integer), or null if no limit.
  timeMinimumInMinutes: number | null; // Minimum time participants must stay in minutes (integer), or null if no minimum.
  isTurnBased?: boolean; // Whether the conversation is turn-based
  // When agents are spawned into this stage with generated personas, this
  // optional prompt elicits each persona's position (appended after the
  // persona text in a single generation). Empty/unset = persona only.
  personaPositionPrompt?: string;
  // Extra instructions appended to spawned agent-participants' chat prompt for
  // this stage (shapes how they engage, e.g. push for changes). Unset = none.
  additionalParticipantInstructions?: string;
  // Minimum total messages from all participants/mediators combined before
  // a participant is eligible to advance. 0 = no minimum.
  minNumberOfMessages?: number;
  // Maximum total messages from all participants/mediators combined; the
  // discussion ends globally for the whole cohort once reached. null = no cap.
  maxNumberOfMessages?: number | null;
}

/** Chat discussion. */
export interface BaseChatDiscussion {
  id: string;
  type: ChatDiscussionType;
  description: string;
}

/** Types of chat discussions. */
export enum ChatDiscussionType {
  DEFAULT = 'DEFAULT',
  COMPARE = 'COMPARE', // compare items
}

/** Default chat discussion (description only). */
export interface DefaultChatDiscussion extends BaseChatDiscussion {
  type: ChatDiscussionType.DEFAULT;
}

/** Compare chat discussion (list of items to compare). */
export interface CompareChatDiscussion extends BaseChatDiscussion {
  type: ChatDiscussionType.COMPARE;
  items: DiscussionItem[];
}

/** Discussion item to compare. */
export interface DiscussionItem {
  id: string;
  imageId: string; // or empty if no image provided
  name: string;
}

export type ChatDiscussion = DefaultChatDiscussion | CompareChatDiscussion;

/**
 * ChatStageParticipantAnswer.
 *
 * This is saved as a stage doc (with stage ID as doc ID) under
 * experiments/{experimentId}/participants/{participantPrivateId}/stageData
 */
export interface ChatStageParticipantAnswer extends BaseStageParticipantAnswer {
  kind: StageKind.CHAT;
  // discussion ID --> readyToEndDiscussion timestamp (or null if not ready)
  discussionTimestampMap: Record<string, UnifiedTimestamp | null>;
}

/**
 * ChatStagePublicData.
 *
 * This is saved as a stage doc (with stage ID as doc ID) under
 * experiments/{experimentId}/cohorts/{cohortId}/publicStageData
 */
export interface ChatStagePublicData extends BaseStagePublicData {
  kind: StageKind.CHAT;
  // null if no current discussion (e.g., all discussions over or 0 discussions)
  currentDiscussionId: string | null;
  // discussionId --> map of participant public ID to readyToEndDiscussion timestamp
  discussionTimestampMap: Record<
    string,
    Record<string, UnifiedTimestamp | null>
  >;
  // The timestamp of the first message, or null if not started.
  discussionStartTimestamp: UnifiedTimestamp | null;
  // A timestamp used for in progress checkpoint.
  discussionCheckpointTimestamp: UnifiedTimestamp | null;
  // If the end timestamp is not null, the conversation has ended.
  discussionEndTimestamp: UnifiedTimestamp | null;
  currentTurnParticipantId?: string | null; // ID of the participant whose turn it is
  turnOrder?: string[]; // Array of participant IDs defining the turn order
  cycleIndex?: number; // Counter to track turn cycles for seeded random
  // Id of the last chat message the turn logic processed. The holder shown in
  // this data is current only when this matches the newest participant or
  // mediator message.
  turnProcessedMessageId?: string;
  // Quiz pause checkpoint. When > 0 the group chat is paused at an
  // intermediate message-count checkpoint while the quizzed participant
  // answers the quiz; the next agent turn is gated until they submit, which
  // resets this to 0. 0 = not paused. See getQuizPauseCheckpointForCount.
  quizPauseCheckpoint?: number;
  // Highest quiz checkpoint the participant has already answered (monotonic).
  // The backend pauses only when a newly crossed checkpoint exceeds this, so
  // the chat is not re-paused for a checkpoint already answered after the
  // pause clears.
  quizAnsweredCheckpoint?: number;
  // Effective cohort-total minimum messages after applying any active
  // mediator's per-stage override (group chat only). Resolved by the backend;
  // the frontend advance-gate falls back to the stage value when null.
  effectiveMinNumberOfMessages?: number | null;
  // Effective cohort-total maximum messages after applying any active
  // mediator's per-stage override (group chat only). Resolved by the backend;
  // the frontend's conversation-over / banner logic falls back to the stage
  // value when null. Published so the frontend uses the cap the backend
  // actually enforces (an override replaces the stage value), rather than
  // tripping early at the stage value and hiding the banner / appearing to
  // run past the limit.
  effectiveMaxNumberOfMessages?: number | null;
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/**
 * For a turn-based group chat with a message cap, compute the current cycle and
 * the total number of cycles. A "cycle" is one full pass through the turn order
 * (every participant and any mediator in the rotation takes one turn), as
 * tracked by `cycleIndex`. Returns null when the stage isn't turn-based, has no
 * message cap, or the turn order hasn't been established yet, so callers can
 * choose not to show a cycle indicator.
 */
export function getTurnCycleInfo(
  publicData: ChatStagePublicData | undefined | null,
  stage: ChatStageConfig,
): {currentCycle: number; totalCycles: number} | null {
  if (!stage.isTurnBased) return null;
  const max =
    publicData?.effectiveMaxNumberOfMessages ?? stage.maxNumberOfMessages;
  if (max === null || max === undefined || max <= 0) return null;
  const speakersPerCycle = (publicData?.turnOrder ?? []).length;
  if (speakersPerCycle <= 0) return null;
  const totalCycles = Math.ceil(max / speakersPerCycle);
  const currentCycle = Math.min((publicData?.cycleIndex ?? 0) + 1, totalCycles);
  return {currentCycle, totalCycles};
}

/** Create chat stage. */
export function createChatStage(
  config: Partial<ChatStageConfig> = {},
): ChatStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.CHAT,
    name: config.name ?? 'Group chat',
    descriptions: config.descriptions ?? createStageTextConfig(),
    progress:
      config.progress ??
      createStageProgressConfig({waitForAllParticipants: true}),
    discussions: config.discussions ?? [],
    timeLimitInMinutes: config.timeLimitInMinutes ?? null,
    timeMinimumInMinutes: config.timeMinimumInMinutes ?? null,
    isTurnBased: config.isTurnBased ?? false,
    personaPositionPrompt: config.personaPositionPrompt ?? '',
    additionalParticipantInstructions:
      config.additionalParticipantInstructions ?? '',
    minNumberOfMessages: config.minNumberOfMessages ?? 0,
    maxNumberOfMessages: config.maxNumberOfMessages ?? null,
  };
}

/** Create chat default discussion. */
export function createDefaultChatDiscussion(
  config: Partial<DefaultChatDiscussion> = {},
): DefaultChatDiscussion {
  return {
    id: config.id ?? generateId(),
    type: ChatDiscussionType.DEFAULT,
    description: config.description ?? '',
  };
}

/** Create compare chat discussion. */
export function createCompareChatDiscussion(
  config: Partial<CompareChatDiscussion> = {},
): CompareChatDiscussion {
  return {
    id: config.id ?? generateId(),
    type: ChatDiscussionType.COMPARE,
    description: config.description ?? '',
    items: config.items ?? [],
  };
}

/** Create participant chat stage answer. */
export function createChatStageParticipantAnswer(
  config: Partial<ChatStageParticipantAnswer> = {},
): ChatStageParticipantAnswer {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.CHAT,
    discussionTimestampMap: config.discussionTimestampMap ?? {},
  };
}

/** Create chat stage public data. */
export function createChatStagePublicData(
  config: ChatStageConfig,
): ChatStagePublicData {
  const id = config.id;
  const currentDiscussionId = config.discussions?.[0]?.id ?? null;

  return {
    id,
    kind: StageKind.CHAT,
    currentDiscussionId,
    discussionTimestampMap: {},
    discussionStartTimestamp: null,
    discussionCheckpointTimestamp: null,
    discussionEndTimestamp: null,
    currentTurnParticipantId: null,
    turnOrder: [],
    cycleIndex: 0,
    turnProcessedMessageId: '',
    quizPauseCheckpoint: 0,
    quizAnsweredCheckpoint: 0,
    effectiveMinNumberOfMessages: null,
    effectiveMaxNumberOfMessages: null,
  };
}

/**
 * Quiz pause checkpoints: thirds of the effective minimum message count
 * (ceil(min/3), ceil(2*min/3), and min, deduplicated and at least 1). Ceiling,
 * so a quiz never fires before its third of the conversation has completed.
 * Returns how many checkpoints the running non-system count has reached, so a
 * minimum under 3 yields fewer than 3 quizzes and no minimum yields none.
 */
export function getQuizPauseCheckpointForCount(
  nonSystemCount: number,
  effectiveMin?: number | null,
): number {
  if (effectiveMin == null || effectiveMin <= 0) return 0;
  const thresholds = [
    ...new Set([
      Math.ceil(effectiveMin / 3),
      Math.ceil((2 * effectiveMin) / 3),
      effectiveMin,
    ]),
  ].filter((t) => t >= 1);
  return thresholds.filter((t) => nonSystemCount >= t).length;
}
