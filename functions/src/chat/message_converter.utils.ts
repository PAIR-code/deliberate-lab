/**
 * Utilities for converting chat history to message-based API format
 */

import {ChatMessage, UserType} from '@deliberation-lab/utils';
// Define types locally since they're not in the utils package yet
export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
}

export interface ConversationMessage {
  role: MessageRole;
  content: string;
  name?: string;
}

export interface MessageBasedPrompt {
  messages: ConversationMessage[];
  systemPrompt?: string;
}

export interface ChatToMessageOptions {
  isPrivateChat: boolean;
  mediatorId?: string;
  participantId?: string;
  includeSystemPrompt?: boolean;
}

/**
 * Convert chat messages to conversation format for message-based APIs
 * For private chats with one participant and one mediator, this creates
 * a proper conversation flow with user/assistant roles.
 */
export function convertChatToMessages(
  chatHistory: ChatMessage[],
  currentUserType: UserType,
  currentUserId: string,
  options: ChatToMessageOptions,
): ConversationMessage[] {
  const messages: ConversationMessage[] = [];

  if (!options.isPrivateChat) {
    // For group chats, return empty array (fallback to text prompt)
    return [];
  }

  // For private chats, convert to user/assistant format
  for (const msg of chatHistory) {
    let role: MessageRole;

    // Determine role based on who sent the message
    if (msg.type === UserType.PARTICIPANT) {
      // Participant messages are "user" from the mediator's perspective
      role =
        currentUserType === UserType.MEDIATOR
          ? MessageRole.USER
          : MessageRole.ASSISTANT;
    } else if (msg.type === UserType.MEDIATOR) {
      // Mediator messages are "assistant" from the participant's perspective
      role =
        currentUserType === UserType.MEDIATOR
          ? MessageRole.ASSISTANT
          : MessageRole.USER;
    } else {
      // Skip other message types for now
      continue;
    }

    messages.push({
      role,
      content: msg.message,
      name: msg.profile.name || msg.senderId,
    });
  }

  return messages;
}

/**
 * Create a message-based prompt from chat history and system instructions
 */
export function createMessageBasedPrompt(
  systemPrompt: string,
  chatHistory: ChatMessage[],
  currentUserType: UserType,
  currentUserId: string,
  options: ChatToMessageOptions,
): MessageBasedPrompt {
  const messages: ConversationMessage[] = [];

  // Add system prompt if requested
  if (options.includeSystemPrompt && systemPrompt) {
    messages.push({
      role: MessageRole.SYSTEM,
      content: systemPrompt,
    });
  }

  // Add conversation history
  const conversationMessages = convertChatToMessages(
    chatHistory,
    currentUserType,
    currentUserId,
    options,
  );

  messages.push(...conversationMessages);

  return {
    messages,
    systemPrompt: options.includeSystemPrompt ? undefined : systemPrompt,
  };
}

/**
 * Check if we should use message-based format for this chat
 * Returns true only for private chats with specific conditions
 */
export function shouldUseMessageFormat(
  isPrivateChat: boolean,
  allowMessageFormat: boolean = true,
  participantCount: number = 1,
): boolean {
  // Only use message format for:
  // 1. Private chats
  // 2. When explicitly enabled
  // 3. With a single participant (one-on-one with mediator)
  return isPrivateChat && allowMessageFormat && participantCount === 1;
}
