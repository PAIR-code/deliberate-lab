/**
 * Types, constants, and functions for LLM prompts.
 */

import { ITEMS, Message, MessageKind, ParticipantProfile } from '@llm-mediation-experiments/utils';

export const GEMINI_DEFAULT_MODEL = "gemini-1.5-pro-latest";

/** Instructions for chat mediator prompt. */
export const PROMPT_INSTRUCTIONS_CHAT_MEDIATOR = `You are an expert moderator for a group chat where the participants are deciding which items will be useful while lost at sea. Your goal is to review the CHAT HISTORY and moderate according to the MODERATION GUIDELINES.

Be succinct yet creative with your responses to stimulate the conversation towards a positive and productive outcome; this may involve asking probing questions, providing constructive feedback and examples when relevant.

MODERATION GUIDELINES:
1. Intervene somewhat infrequently.
2. Disregard minor typos and grammatical mistakes. Focus on the content of the conversation.
3. Keep the conversation on track: these participants are to deliberate on items that may be useful when they are adrift at sea. A "Discussion topic:" in the CHAT HISTORY shows that the conversation has moved on to discussing those items.
4. Your responses show up as "Mediator message:" in the CHAT HISTORY. Do not repeat feedback you have already given.
5. Make sure participants are polite to one another.
`;

/** Create LLM chat mediator prompt. */
export function createChatMediatorPrompt(
  promptInstructions: string, messages: Message[], participants: ParticipantProfile[], addJsonConstraint : boolean = true, nMaxMessages = 5
) {
  // Make a deep copy of the last n messages.
  const truncMessages : Message[] = JSON.parse(JSON.stringify(messages.slice(-1 * nMaxMessages)));

  const participantDictionary = participants.reduce((acc, p) => {
    acc[p.publicId] = p.name ?? p.publicId;
    return acc;
  }, {} as Record<string, string>);

  // Create a map of participant indices to names.
  const formatMessage = (message: Message) => {
    switch (message.kind) {
      case MessageKind.UserMessage:
        return `${participantDictionary[message.fromPublicParticipantId]}: ${message.text}`;
      case MessageKind.DiscussItemsMessage:
        return `Discussion topic: ${ITEMS[message.itemPair.item1].name}, ${ITEMS[message.itemPair.item2].name}`;
      case MessageKind.MediatorMessage:
        return `Mediator message: ${message.text}`;
      default:
        return '';
    }
  };

  const prompt = `
    ${promptInstructions}

Every so often, a "Discussion topic" notification will indicate that the conversation has moved on to a different topic.
You may see a 'Mediator message', which is something that you have already said in the conversation.

PARTICIPANTS: ${participants.map(p => p.name ?? p.publicId).join(', ')}
As you moderate, make sure that these participants are all contributing to the conversation.

CHAT HISTORY:
${truncMessages.map(message => formatMessage(message)).join('\n\n')}
  `
  
  const json = `

INSTRUCTIONS:
Fill out the following JSON response:
  1. Do you want to intervene with a message? ("true" or false")
  2. If yes, what would you like to say?
  3. Why do you want to say that?

IMPORTANT: Your output should be in a JSON dictionary exactly like the example output below. Just the JSON! Make Sure the JSON is valid.

EXAMPLE OUTPUT:
{
  "shouldRespond": true,
  "response": "Carl, be nice!",
  "reasoning": "Carl was being rude."
}
  `;

  const nonJson = `What would you like to say?`

  return addJsonConstraint ? prompt + json : prompt + nonJson;
}