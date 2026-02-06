/**
 * Utilities for converting chat history to message-based API format.
 */

import {ChatMessage, UserType} from '@deliberation-lab/utils';

import {ModelMessage} from '../api/ai-sdk.api';

/**
 * Message roles compatible with AI SDK's ModelMessage type.
 * Values must match the literal string types expected by the SDK.
 */
export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
}

export interface MessageBasedPrompt {
  messages: ModelMessage[];
  systemPrompt?: string;
}

export interface ChatToMessageOptions {
  isPrivateChat: boolean;
  mediatorId?: string;
  participantId?: string;
  includeSystemPrompt?: boolean;
}

/**
 * Convert chat messages to conversation format for message-based APIs.
 * For private chats with one participant and one mediator, this creates
 * a proper conversation flow with user/assistant roles.
 */
export function convertChatToMessages(
  chatHistory: ChatMessage[],
  currentUserType: UserType,
  options: ChatToMessageOptions,
): ModelMessage[] {
  const messages: ModelMessage[] = [];

  if (!options.isPrivateChat) {
    // For group chats, return empty array (fallback to text prompt)
    return [];
  }

  // For private chats, convert to user/assistant format
  for (const msg of chatHistory) {
    switch (msg.type) {
      case UserType.PARTICIPANT: {
        // Participant messages are "user" from the mediator's perspective
        const role =
          currentUserType === UserType.MEDIATOR
            ? MessageRole.USER
            : MessageRole.ASSISTANT;
        messages.push({role, content: msg.message});
        break;
      }
      case UserType.MEDIATOR: {
        // Mediator messages are "assistant" from the participant's perspective
        const role =
          currentUserType === UserType.MEDIATOR
            ? MessageRole.ASSISTANT
            : MessageRole.USER;
        messages.push({role, content: msg.message});
        break;
      }
      case UserType.SYSTEM:
        // System messages are treated as "user" messages for the AI to see them
        messages.push({
          role: MessageRole.USER,
          content: `[SYSTEM NOTIFICATION]: ${msg.message}`,
        });
        break;
      case UserType.EXPERIMENTER:
        // Experimenter messages not yet supported in message format
        console.log(`Skipping experimenter message: ${msg.message}`);
        break;
      case UserType.UNKNOWN:
        console.warn(`Unknown message type encountered: ${msg.message}`);
        break;
    }
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
  options: ChatToMessageOptions,
): MessageBasedPrompt {
  const messages: ModelMessage[] = [];

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
  mediatorCount: number = 1,
): boolean {
  // Only use message format for:
  // 1. Private chats
  // 2. When explicitly enabled
  // 3. With exactly one participant and one mediator (true one-on-one conversation)
  // Multiple mediators sometimes create conflicting "assistant" messages that break API flow.
  return (
    isPrivateChat &&
    allowMessageFormat &&
    participantCount === 1 &&
    mediatorCount === 1
  );
}
