/**
 * Types, constants, and functions for LLM prompts.
 */

import { Message, MessageKind } from '@llm-mediation-experiments/utils';

/** Instructions for chat mediator prompt. */
// TODO: Update placeholder prompt
export const PROMPT_INSTRUCTIONS_CHAT_MEDIATOR = `
  Summarize the following chat messages in less than 5 sentences.
  Note whether or not all participants spoke for an equal amount of time
  (and if not, which ones spoke the least)
`;

/** Create LLM chat mediator prompt. */
export function createChatMediatorPrompt(
  messages: Message[], participants: string[]
) {
  const formatMessage = (message: Message) => {
    switch (message.kind) {
      case MessageKind.UserMessage:
        return `${message.fromPublicParticipantId}: ${message.text}`;
      case MessageKind.DiscussItemsMessage:
        return `New discussion: ${message.itemPair.item1}, ${message.itemPair.item2}`;
      case MessageKind.MediatorMessage:
        return `LLM Mediator: ${message.text}`;
      default:
        return '';
    }
  };

  const prompt = `
    ${PROMPT_INSTRUCTIONS_CHAT_MEDIATOR}

    [Participants]
    ${participants.join(', ')}

    [Chat messages]
    ${messages.map(message => formatMessage(message)).join('\n\n')}

    [Summary]
  `;

  return prompt;
}