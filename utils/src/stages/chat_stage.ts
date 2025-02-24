import {Timestamp} from 'firebase/firestore';
import {generateId, UnifiedTimestamp} from '../shared';
import {
  BaseStageConfig,
  BaseStageParticipantAnswer,
  BaseStagePublicData,
  StageGame,
  StageKind,
  createStageTextConfig,
  createStageProgressConfig,
} from './stage';
import {
  ParticipantProfileBase,
  createParticipantProfileBase,
} from '../participant';
import {
  AgentGenerationConfig,
  AgentResponseConfig,
  createAgentResponseConfig,
} from '../agent';
import {
  DEFAULT_MODEL,
  DEFAULT_AGENT_MEDIATOR_PROMPT,
} from './chat_stage.prompts';

/** Group chat stage types and functions. */

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
  agents: AgentConfig[];
  timeLimitInMinutes: number | null; // How long remaining in the chat.
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
 * ChatMessage.
 *
 * Saved as docs under
 * experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}/chats
 */
export interface BaseChatMessage {
  id: string;
  discussionId: string | null; // discussion during which message was sent
  type: ChatMessageType;
  message: string;
  timestamp: UnifiedTimestamp;
  profile: ParticipantProfileBase;
}

export enum ChatMessageType {
  PARTICIPANT = 'PARTICIPANT',
  HUMAN_AGENT = 'HUMAN_AGENT',
  AGENT_AGENT = 'AGENT_AGENT',
}

export interface ParticipantChatMessage extends BaseChatMessage {
  type: ChatMessageType.PARTICIPANT;
  participantPublicId: string;
}

export interface HumanMediatorChatMessage extends BaseChatMessage {
  type: ChatMessageType.HUMAN_AGENT;
}

export interface AgentMediatorChatMessage extends BaseChatMessage {
  type: ChatMessageType.AGENT_AGENT;
  agentId: string;
  explanation: string;
}

/** LLM agent config. */
// TODO: Remove after switching to refactored agent workflow
export interface AgentConfig {
  id: string;
  name: string;
  avatar: string; // emoji avatar for agent
  model: string;
  prompt: string;
  wordsPerMinute: number; // Typing speed
  generationConfig: AgentGenerationConfig;
  responseConfig: AgentResponseConfig;
  // TODO: Add more settings, e.g. context window
}

export type ChatMessage =
  | ParticipantChatMessage
  | HumanMediatorChatMessage
  | AgentMediatorChatMessage;

/** Format for LLM API chat message output. */
export interface AgentChatResponse {
  agent: AgentConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parsed: any;
  message: string;
}

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
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create chat stage. */
export function createChatStage(
  config: Partial<ChatStageConfig> = {},
): ChatStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.CHAT,
    game: config.game ?? StageGame.NONE,
    name: config.name ?? 'Group chat',
    descriptions: config.descriptions ?? createStageTextConfig(),
    progress:
      config.progress ??
      createStageProgressConfig({waitForAllParticipants: true}),
    discussions: config.discussions ?? [],
    agents: config.agents ?? [],
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

/** Create participant chat message. */
export function createParticipantChatMessage(
  config: Partial<ParticipantChatMessage> = {},
): ParticipantChatMessage {
  return {
    id: config.id ?? generateId(),
    discussionId: config.discussionId ?? null,
    type: ChatMessageType.PARTICIPANT,
    message: config.message ?? '',
    timestamp: config.timestamp ?? Timestamp.now(),
    profile: config.profile ?? createParticipantProfileBase(),
    participantPublicId: config.participantPublicId ?? '',
  };
}

/** Create human agent chat message. */
export function createHumanMediatorChatMessage(
  config: Partial<HumanMediatorChatMessage> = {},
): HumanMediatorChatMessage {
  return {
    id: config.id ?? generateId(),
    discussionId: config.discussionId ?? null,
    type: ChatMessageType.HUMAN_AGENT,
    message: config.message ?? '',
    timestamp: config.timestamp ?? Timestamp.now(),
    profile: config.profile ?? {name: 'Agent', avatar: '⭐', pronouns: null},
  };
}

/** Create agent agent chat message. */
export function createAgentMediatorChatMessage(
  config: Partial<AgentMediatorChatMessage> = {},
): AgentMediatorChatMessage {
  return {
    id: config.id ?? generateId(),
    discussionId: config.discussionId ?? null,
    type: ChatMessageType.AGENT_AGENT,
    message: config.message ?? '',
    timestamp: config.timestamp ?? Timestamp.now(),
    profile: config.profile ?? {name: 'Agent', avatar: '🤖', pronouns: null},
    agentId: config.agentId ?? '',
    explanation: config.explanation ?? '',
  };
}

/** Create agent agent. */
// TODO: Remove after switching to refactored agent workflow
export function createAgentConfig(
  config: Partial<AgentConfig> = {},
): AgentConfig {
  return {
    id: config.id ?? generateId(),
    name: config.name ?? 'Agent',
    avatar: config.avatar ?? '🤖',
    model: config.model ?? DEFAULT_MODEL,
    prompt: config.prompt ?? DEFAULT_AGENT_MEDIATOR_PROMPT.trim(),
    wordsPerMinute: config.wordsPerMinute ?? 80, // Default 80 WPM.
    generationConfig: config.generationConfig ?? createAgentGenerationConfig(),
    responseConfig: config.responseConfig ?? createAgentResponseConfig(),
  };
}

// TODO: Remove after switching to refactored agent workflow
export function createAgentGenerationConfig(
  config: Partial<AgentGenerationConfig> = {},
): AgentGenerationConfig {
  return {
    temperature: config.temperature ?? 0.7,
    topP: config.topP ?? 1.0,
    frequencyPenalty: config.frequencyPenalty ?? 0.0,
    presencePenalty: config.presencePenalty ?? 0.0,
    customRequestBodyFields: config.customRequestBodyFields ?? [],
  };
}

/** Create participant chat stage answer. */
export function createChatStageParticipantAnswer(
  config: Partial<ChatStageParticipantAnswer>,
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
  const currentDiscussionId =
    config.discussions.length === 0 ? null : config.discussions[0].id;

  return {
    id,
    kind: StageKind.CHAT,
    currentDiscussionId,
    discussionTimestampMap: {},
    discussionStartTimestamp: null,
    discussionCheckpointTimestamp: null,
    discussionEndTimestamp: null,
  };
}
