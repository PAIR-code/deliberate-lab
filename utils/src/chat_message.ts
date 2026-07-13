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
}

// ************************************************************************* //
// CONSTANTS                                                                 //
// ************************************************************************* //

// Sender ID for chat messages manually sent by experimenter
// This should be consistent to ensure same background color for each message
export const EXPERIMENTER_MANUAL_CHAT_SENDER_ID = 'experimenter';

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
  };
}

/**
 * Neutral chat responses an agent sends when its model call fails past the
 * retry deadline and the experiment keeps the conversation going instead of
 * ending the study.
 */
/**
 * Message a turn-based agent sends when its model call fails past the retry
 * deadline, unless the experiment opts into neutral responses.
 */
export const TIMEOUT_ERROR_RESPONSE =
  '*Error: Could not generate a message at this time. Please try again.*';

export const NEUTRAL_TIMEOUT_RESPONSES = [
  'Not sure.',
  'Not sure yet.',
  "I'm not sure about that.",
  "I'm thinking.",
  "I'm just thinking.",
  "I'm thinking about it.",
  "Let's consider that.",
];
