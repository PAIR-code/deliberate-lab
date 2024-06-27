/**
 * Types, constants, and functions for LLM prompts.
 */

import { ITEMS, Message, MessageKind, ParticipantProfile, UnifiedTimestamp } from '@llm-mediation-experiments/utils';

export const GEMINI_DEFAULT_MODEL = "gemini-1.5-pro-latest";

export const MEDIATOR_NAME = "Mediator";
export const ALL_PARTICIPANTS = "all participants";

/** Instructions for chat mediator prompt. */
export const PROMPT_INSTRUCTIONS_CHAT_MEDIATOR = `
You are an expert mediator (${MEDIATOR_NAME}) facilitating a group chat where participants discuss essential items crucial for survival when lost at sea. "Discussion topic" messages in the chat history indicate the specific pair of items participants are comparing and evaluating.

MEDIATION GUIDELINES:
1. Clarify Messages: Ensure clear communication by asking for clarification if any message is unclear or ambiguous.
2. Maintain Respect: Ensure a respectful atmosphere; intervene if the conversation becomes heated or disrespectful.
3. Facilitate Turn-Taking: Ensure all participants have equal opportunities to speak and express their views.
4. Encourage Constructive Feedback: Prompt participants to provide solutions and constructive feedback rather than focusing solely on problems.
5. Summarize Key Points: Periodically summarize discussion points to ensure mutual understanding and agreement.
6. Encourage Consensus and Move On: Guide the conversation towards alignment where possible. When participants seem to agree on which item is more important or if the conversation has reached a standstill, explicitly tell participants to consider moving to the next topic.
`;

/** Create LLM chat mediator prompt. */
export function createChatMediatorPrompt(
  promptInstructions: string,
  messages: Message[],
  participants: ParticipantProfile[],
  mediatorIdentity: string = "Mediator", // The name of the mediator.
  nMaxMessages = 5,
  addJsonConstraint : boolean = true,
  clearPreviousHistoryOnNewDiscussionItems: boolean = true
) { 
  // Make a deep copy of the last n messages.
  let truncMessages : Message[] = JSON.parse(JSON.stringify(messages.slice(-1 * nMaxMessages)));

  // Returns messages starting from the last discussion item message, otherwise all messages.
  const getLatestDiscussionItems = (curMessages: Message[] ) => {
    const lastIndex = curMessages.map(m => m.kind).lastIndexOf(MessageKind.DiscussItemsMessage);
    if (lastIndex === -1) {
      return curMessages;
    }
    return curMessages.slice(lastIndex);
  };

  if (clearPreviousHistoryOnNewDiscussionItems) {
    truncMessages = getLatestDiscussionItems(truncMessages);
  }

  const participantDictionary = participants.reduce((acc, p) => {
    acc[p.publicId] = p.name ?? p.publicId;
    return acc;
  }, {} as Record<string, string>);

  // Create a map of participant indices to names.
  const formatMessage = (message: Message, index: number) => {
    switch (message.kind) {
      case MessageKind.UserMessage:
        return `[${formatTimestamp(message.timestamp)}] ${participantDictionary[message.fromPublicParticipantId]}: ${message.text}`;
      case MessageKind.DiscussItemsMessage:
        return `[${formatTimestamp(message.timestamp)}] Discussion topic: ${ITEMS[message.itemPair.item1].name}, ${ITEMS[message.itemPair.item2].name}`;
      case MessageKind.MediatorMessage:
        // TODO: This assumes one mediator in the conversation, itself.
        return `[${formatTimestamp(message.timestamp)}] ${mediatorIdentity}: ${message.text}`;
      default:
        return '';
    }
  };

  const getParticipantsString = () => {
    return participants.map(p => `${p.name ?? p.publicId} (${p.pronouns})`).join(', ');
  };

  // Clarify participants.
  if (promptInstructions.includes(ALL_PARTICIPANTS)){
    promptInstructions = promptInstructions.replace(ALL_PARTICIPANTS, `${ALL_PARTICIPANTS} (${getParticipantsString()})`);
  } else {
    promptInstructions = promptInstructions += `\n\nPARTICIPANTS: ${getParticipantsString()}\n\n`;
  }

  const prompt = `${promptInstructions}

CONVERSATION HISTORY WITH TIMESTAMPS:
${truncMessages.map((message, index) => formatMessage(message, index)).join('\n')}
  `
  
  const json = `

INSTRUCTIONS:
Fill out the following JSON response:
  1. Do you (${MEDIATOR_NAME}) want to add a message to the chat? ("true" or false")
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

function convertTimestampToDate(timestamp: UnifiedTimestamp): Date {
  const milliseconds = timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000;
  return new Date(milliseconds);
}

function formatTimestamp(timestamp: UnifiedTimestamp): string {
  const date = convertTimestampToDate(timestamp);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}