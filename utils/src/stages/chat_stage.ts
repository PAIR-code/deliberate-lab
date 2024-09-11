import { Timestamp } from 'firebase/firestore';
import { generateId, UnifiedTimestamp } from '../shared';
import {
  BaseStageConfig,
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
 * ChatStagePublicData.
 *
 * This is saved as a stage doc (with stage ID as doc ID) under
 * experiments/{experimentId}/cohorts/{cohortId}/publicStageData
 */
export interface ChatStagePublicData extends BaseStagePublicData {
  kind: StageKind.CHAT;
  // Null if all discussion have ended (or no discussions)
  currentDiscussionId: string|null;
  // discussionId --> map of participant public ID to readyToEndDiscussion
  discussionStatusMap: Record<string, Record<string, boolean>>;
}

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