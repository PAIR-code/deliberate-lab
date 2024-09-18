import { Timestamp } from 'firebase/firestore';
import { generateId, UnifiedTimestamp } from '../shared';
import {
  BaseStageConfig,
  BaseStageParticipantAnswer,
  BaseStagePublicData,
  StageGame,
  StageKind,
  createStageTextConfig
} from './stage';
import {
  ParticipantProfileBase,
  createParticipantProfileBase
} from '../participant';

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
  mediators: MediatorConfig[];
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
  name: string;
}

export type ChatDiscussion =
  | DefaultChatDiscussion
  | CompareChatDiscussion;

/**
 * ChatMessage.
 *
 * Saved as docs under
 * experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}/chats
 */
export interface BaseChatMessage {
  id: string;
  discussionId: string|null; // discussion during which message was sent
  type: ChatMessageType;
  message: string;
  timestamp: UnifiedTimestamp;
  profile: ParticipantProfileBase;
}

export enum ChatMessageType {
  PARTICIPANT = 'PARTICIPANT',
  HUMAN_MEDIATOR = 'HUMAN_MEDIATOR',
  AGENT_MEDIATOR = 'AGENT_MEDIATOR',
}

export interface ParticipantChatMessage extends BaseChatMessage {
  type: ChatMessageType.PARTICIPANT;
  participantPublicId: string;
}

export interface HumanMediatorChatMessage extends BaseChatMessage {
  type: ChatMessageType.HUMAN_MEDIATOR;
}

export interface AgentMediatorChatMessage extends BaseChatMessage {
  type: ChatMessageType.AGENT_MEDIATOR;
  mediatorId: string;
}

/** LLM mediator config. */
export interface MediatorConfig {
  id: string;
  name: string;
  avatar: string; // emoji avatar for mediator
  prompt: string;
  // TODO: Add more settings, e.g., model, temperature, context window
}

export type ChatMessage =
  | ParticipantChatMessage
  | HumanMediatorChatMessage
  | AgentMediatorChatMessage;

/**
 * ChatStageParticipantAnswer.
 *
 * This is saved as a stage doc (with stage ID as doc ID) under
 * experiments/{experimentId}/participants/{participantPrivateId}/stageData
 */
export interface ChatStageParticipantAnswer extends BaseStageParticipantAnswer {
  kind: StageKind.CHAT;
  // discussion ID --> readyToEndDiscussion timestamp (or null if not ready)
  discussionTimestampMap: Record<string, UnifiedTimestamp|null>;
}

/**
 * ChatStagePublicData.
 *
 * This is saved as a stage doc (with stage ID as doc ID) under
 * experiments/{experimentId}/cohorts/{cohortId}/publicStageData
 */
export interface ChatStagePublicData extends BaseStagePublicData {
  kind: StageKind.CHAT;
  // discussionId --> map of participant public ID to readyToEndDiscussion timestamp
  discussionTimestampMap: Record<string, Record<string, UnifiedTimestamp|null>>;
}

// ************************************************************************* //
// CONSTANTS                                                                 //
// ************************************************************************* //
export const DEFAULT_MEDIATOR_PROMPT = `
You are a mediator for the above chat conversation. Before responding,
consider the following:

1. Is everyone in the conversation being respectful?
2. Did everyone have the opportunity to speak?
3. Is anyone asking you (Mediator) a question?

If the answer to these questions is no, return nothing (empty string).

Otherwise, please come up with a short response.
Only include the response. Do not include any timestamps,
speaker names, or reasoning.
`;

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create chat stage. */
export function createChatStage(
  config: Partial<ChatStageConfig> = {}
): ChatStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.CHAT,
    game: config.game ?? StageGame.NONE,
    name: config.name ?? 'Group chat',
    descriptions: config.descriptions ?? createStageTextConfig(),
    discussions: config.discussions ?? [],
    mediators: config.mediators ?? [],
  };
}

/** Create chat default discussion. */
export function createDefaultChatDiscussion(
  config: Partial<DefaultChatDiscussion> = {}
): DefaultChatDiscussion {
  return {
    id: config.id ?? generateId(),
    type: ChatDiscussionType.DEFAULT,
    description: config.description ?? '',
  }
}

/** Create compare chat discussion. */
export function createCompareChatDiscussion(
  config: Partial<CompareChatDiscussion> = {}
): CompareChatDiscussion {
  return {
    id: config.id ?? generateId(),
    type: ChatDiscussionType.COMPARE,
    description: config.description ?? '',
    items: config.items ?? [],
  }
}

/** Create participant chat message. */
export function createParticipantChatMessage(
  config: Partial<ParticipantChatMessage> = {}
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

/** Create agent mediator chat message. */
export function createAgentMediatorChatMessage(
  config: Partial<AgentMediatorChatMessage> = {}
): AgentMediatorChatMessage {
  return {
    id: config.id ?? generateId(),
    discussionId: config.discussionId ?? null,
    type: ChatMessageType.AGENT_MEDIATOR,
    message: config.message ?? '',
    timestamp: config.timestamp ?? Timestamp.now(),
    profile: config.profile ?? { name: 'Mediator', avatar: '🤖', pronouns: null },
    mediatorId: config.mediatorId ?? '',
  };
}

/** Convert chat messages into chat history string for prompt. */
export function buildChatHistoryForPrompt(
  messages: ChatMessage[]
) {
  const getTime = (timestamp: UnifiedTimestamp) => {
    const date = new Date(timestamp.seconds * 1000);
    return `(${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')})`;
  };

  return messages.map(
    message => `${getTime(message.timestamp)} ${message.profile.name}: ${message.message}`
  ).join('\n\n');
}

/** Add chat messages (as history) to given prompt. */
export function addChatHistoryToPrompt(
  messages: ChatMessage[],
  prompt: string
) {
  return `${buildChatHistoryForPrompt(messages)}\n\n${prompt}`;
}

/** Create agent mediator. */
export function createMediatorConfig(
  config: Partial<MediatorConfig> = {}
): MediatorConfig {
  return {
    id: config.id ?? generateId(),
    name: config.name ?? 'Mediator',
    avatar: config.avatar ?? '🤖',
    prompt: config.prompt ?? DEFAULT_MEDIATOR_PROMPT.trim(),
  };
}

/** Create participant chat stage answer. */
export function createChatStageParticipantAnswer(
  config: Partial<ChatStageParticipantAnswer>
): ChatStageParticipantAnswer {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.CHAT,
    discussionTimestampMap: config.discussionTimestampMap ?? {},
  }
}

/** Create chat stage public data. */
export function createChatStagePublicData(
  stage: ChatStageConfig,
): ChatStagePublicData {
  return {
    id: stage.id,
    kind: StageKind.CHAT,
    discussionTimestampMap: {},
  }
}