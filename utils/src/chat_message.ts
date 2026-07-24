import {Timestamp} from 'firebase/firestore';
import {generateId, UnifiedTimestamp} from './shared';
import {
  ParticipantProfileBase,
  UserType,
  createParticipantProfileBase,
} from './participant';
import {StoredFile} from './model_response';

/** Chat message types and functions (used in chat stages). */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

/** Reaction that can be applied to a chat message. */
export enum ChatMessageReaction {
  HEART = 'heart',
  THUMBS_UP = 'thumbsUp',
}

/**
 * Reactions on a chat message: reaction to the IDs of everyone who applied it.
 *
 * The sender IDs are the record; a reaction count is the length of its list,
 * so counts can never drift out of sync with who reacted.
 */
export type ChatReactionMap = Partial<Record<ChatMessageReaction, string[]>>;

/**
 * Snapshot of the message that a reply quotes.
 *
 * Copied onto the reply rather than looked up by ID, so that the quote still
 * renders (and still appears in experiment downloads) if the quoted message is
 * not part of the loaded history.
 */
export interface ChatMessageReply {
  id: string; // ID of the quoted message
  senderId: string; // sender of the quoted message
  name: string; // sender's display name when the reply was written
  message: string; // quoted text, truncated to MAX_CHAT_QUOTE_LENGTH
}

/**
 * ChatMessage.
 *
 * Saved as docs under
 * experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}/chats
 */
export interface ChatMessage {
  id: string;
  // in GROUP_CHAT (currently CHAT), the current thread within the group chat
  // in CHAT_APP (forthcoming), the ID of the separate discussion chat
  discussionId: string | null;
  type: UserType;
  message: string;
  timestamp: UnifiedTimestamp;
  profile: ParticipantProfileBase;
  senderId: string; // participant public ID or mediator public ID
  agentId: string; // agent persona used (or blank if none)
  explanation: string; // agent's explicit decision explanation from structured output
  reasoning?: string; // model's internal chain-of-thought (from thinking/reasoning features)
  isError: boolean; // is error message (used for private chats)
  files?: StoredFile[]; // uploaded files (images, documents, etc.)
  // Message that this message replies to (with quoted text), if any.
  // Optional because messages written before replies existed do not have it.
  replyTo?: ChatMessageReply | null;
  // Reactions applied to this message, keyed by reaction.
  // Optional because messages written before reactions existed do not have it.
  reactionMap?: ChatReactionMap;
}

// ************************************************************************* //
// CONSTANTS                                                                 //
// ************************************************************************* //

// Sender ID for chat messages manually sent by experimenter
// This should be consistent to ensure same background color for each message
export const EXPERIMENTER_MANUAL_CHAT_SENDER_ID = 'experimenter';

// Quoted text longer than this is truncated when replying, so that a chain of
// replies cannot grow each message without bound
export const MAX_CHAT_QUOTE_LENGTH = 280;

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create chat message. */
export function createChatMessage(
  config: Partial<ChatMessage> = {},
): ChatMessage {
  return {
    id: config.id ?? generateId(),
    discussionId: config.discussionId ?? null,
    type: config.type ?? UserType.UNKNOWN,
    message: config.message ?? '',
    timestamp: config.timestamp ?? Timestamp.now(),
    profile: config.profile ?? createParticipantProfileBase(),
    senderId: config.senderId ?? '',
    agentId: config.agentId ?? '',
    explanation: config.explanation ?? '',
    reasoning: config.reasoning ?? undefined,
    isError: config.isError ?? false,
    files: config.files ?? undefined,
    replyTo: config.replyTo ?? null,
    reactionMap: config.reactionMap ?? {},
  };
}

/** Create participant chat message. */
export function createParticipantChatMessage(
  config: Partial<ChatMessage> = {},
): ChatMessage {
  return {
    id: config.id ?? generateId(),
    discussionId: config.discussionId ?? null,
    type: UserType.PARTICIPANT,
    message: config.message ?? '',
    timestamp: config.timestamp ?? Timestamp.now(),
    profile: config.profile ?? createParticipantProfileBase(),
    senderId: config.senderId ?? '',
    agentId: config.agentId ?? '',
    explanation: config.explanation ?? '',
    reasoning: config.reasoning ?? undefined,
    isError: config.isError ?? false,
    files: config.files ?? undefined,
    replyTo: config.replyTo ?? null,
    reactionMap: config.reactionMap ?? {},
  };
}

/** Create mediator chat message. */
export function createMediatorChatMessage(
  config: Partial<ChatMessage> = {},
): ChatMessage {
  return {
    id: config.id ?? generateId(),
    discussionId: config.discussionId ?? null,
    type: UserType.MEDIATOR,
    message: config.message ?? '',
    timestamp: config.timestamp ?? Timestamp.now(),
    profile: config.profile ?? {name: 'Agent', avatar: '🤖', pronouns: null},
    senderId: config.senderId ?? '',
    agentId: config.agentId ?? '',
    explanation: config.explanation ?? '',
    reasoning: config.reasoning ?? undefined,
    isError: config.isError ?? false,
    files: config.files ?? undefined,
    replyTo: config.replyTo ?? null,
    reactionMap: config.reactionMap ?? {},
  };
}

/** Create experimenter chat message. */
export function createExperimenterChatMessage(
  config: Partial<ChatMessage> = {},
): ChatMessage {
  return {
    id: config.id ?? generateId(),
    discussionId: config.discussionId ?? null,
    type: UserType.EXPERIMENTER,
    message: config.message ?? '',
    timestamp: config.timestamp ?? Timestamp.now(),
    profile: config.profile ?? {name: 'Mediator', avatar: '⭐', pronouns: null},
    senderId: EXPERIMENTER_MANUAL_CHAT_SENDER_ID,
    agentId: config.agentId ?? '',
    explanation: config.explanation ?? '',
    reasoning: config.reasoning ?? undefined,
    isError: config.isError ?? false,
    files: config.files ?? undefined,
    replyTo: config.replyTo ?? null,
    reactionMap: config.reactionMap ?? {},
  };
}

/** Return the IDs of everyone who applied the given reaction to a message. */
export function getChatMessageReactors(
  chatMessage: ChatMessage,
  reaction: ChatMessageReaction,
): string[] {
  return chatMessage.reactionMap?.[reaction] ?? [];
}

/** Return the number of times the given reaction was applied to a message. */
export function getChatMessageReactionCount(
  chatMessage: ChatMessage,
  reaction: ChatMessageReaction,
): number {
  return getChatMessageReactors(chatMessage, reaction).length;
}

/** Whether the given sender applied the given reaction to a message. */
export function hasChatMessageReaction(
  chatMessage: ChatMessage,
  reaction: ChatMessageReaction,
  senderId: string,
): boolean {
  return getChatMessageReactors(chatMessage, reaction).includes(senderId);
}

/** Build the quote snapshot for a reply to the given message. */
export function createChatMessageReply(
  chatMessage: ChatMessage,
): ChatMessageReply {
  const message = chatMessage.message;
  return {
    id: chatMessage.id,
    senderId: chatMessage.senderId,
    name: chatMessage.profile?.name ?? chatMessage.senderId,
    message:
      message.length > MAX_CHAT_QUOTE_LENGTH
        ? `${message.slice(0, MAX_CHAT_QUOTE_LENGTH).trimEnd()}…`
        : message,
  };
}

/** Create system chat message. */
export function createSystemChatMessage(
  config: Partial<ChatMessage> = {},
): ChatMessage {
  return {
    id: config.id ?? generateId(),
    discussionId: config.discussionId ?? null,
    type: UserType.SYSTEM,
    message: config.message ?? '',
    timestamp: config.timestamp ?? Timestamp.now(),
    profile: config.profile ?? {name: 'System', avatar: '⚙️', pronouns: null},
    senderId: config.senderId ?? '',
    agentId: config.agentId ?? '',
    explanation: config.explanation ?? '',
    reasoning: config.reasoning ?? undefined,
    isError: false,
    files: config.files ?? undefined,
    replyTo: config.replyTo ?? null,
    reactionMap: config.reactionMap ?? {},
  };
}
