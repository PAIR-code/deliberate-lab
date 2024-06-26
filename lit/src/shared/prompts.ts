/**
 * Types, constants, and functions for LLM prompts.
 */

import { ITEMS, Message, MessageKind } from '@llm-mediation-experiments/utils';

export const GEMINI_DEFAULT_MODEL = "gemini-1.5-pro-latest";

/** Instructions for chat mediator prompt. */
// TODO: Update placeholder prompt
export const PROMPT_INSTRUCTIONS_CHAT_MEDIATOR = `
  You are the moderator for a group chat where the participants are
  deciding which items will be useful while lost at sea.
  For each topic of discussion, the participants will debate between
  two items.

  Respond with a 2 sentence summary of the current discussion.
  Reference participants using the {participant-0} format.
  Note anyone who did not get to speak or anyone who was rude.
`;

/** Create LLM chat mediator prompt. */
export function createChatMediatorPrompt(
  promptInstructions: string, messages: Message[], participants: string[]
) {
  const formatMessage = (message: Message) => {
    switch (message.kind) {
      case MessageKind.UserMessage:
        return `{${message.fromPublicParticipantId}}: ${message.text}`;
      case MessageKind.DiscussItemsMessage:
        return `Discussion topic: ${ITEMS[message.itemPair.item1].name}, ${ITEMS[message.itemPair.item2].name}`;
      default:
        return '';
    }
  };

  const prompt = `
    ${promptInstructions}

    [Participants]
    ${participants.join(',')}

    [Chat history]
    ${messages.map(message => formatMessage(message)).join('\n\n')}

    [Moderator response]
  `;

  return prompt;
}