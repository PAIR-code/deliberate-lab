import {Timestamp} from 'firebase/firestore';
import {generateId, UnifiedTimestamp} from './shared';
import {
  ParticipantProfileBase,
  UserType,
  createParticipantProfileBase,
} from './participant';
import {AgentChatPromptConfig} from './agent';

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
  discussionId: string | null; // discussion during which message was sent
  type: UserType;
  message: string;
  timestamp: UnifiedTimestamp;
  profile: ParticipantProfileBase;
  senderId: string; // participant public ID or mediator public ID
  agentId: string; // agent persona used (or blank if none)
  explanation: string; // agent reasoning (or blank if none)
}

/** Format for LLM API chat message output. */
export interface AgentChatResponse {
  profile: ParticipantProfileBase;
  profileId: string; // ID of participant or mediator
  agentId: string; // ID of agent persona
  promptConfig: AgentChatPromptConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parsed: any;
  message: string;
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
  };
}
