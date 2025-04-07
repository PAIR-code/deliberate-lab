import {UnifiedTimestamp} from '../shared';
import {AgentChatPromptConfig, ProfileAgentConfig} from '../agent';
import {ParticipantProfileBase} from '../participant';
import {getParticipantProfilePromptContext} from '../participant.prompts';
import {
  ChatDiscussion,
  ChatDiscussionType,
  ChatMessage,
  ChatStageConfig,
} from './chat_stage';
import {getBaseStagePrompt} from './stage.prompts';

// ************************************************************************* //
// CONSTANTS                                                                 //
// ************************************************************************* //
export const DEFAULT_MODEL = 'gemini-1.5-pro-latest';
export const DEFAULT_AGENT_MEDIATOR_PROMPT = `You are a agent for a chat conversation. Your task is to ensure that the conversation is polite.
If you notice that participants are being rude, step in to make sure that everyone is respectful. 
Otherwise, do not respond.`;

export const DEFAULT_RESPONSE_FIELD = 'response';
export const DEFAULT_EXPLANATION_FIELD = 'explanation';
export const DEFAULT_JSON_FORMATTING_INSTRUCTIONS = `INSTRUCTIONS:
  Now, you have the opportunity to respond to the conversation. This response will be appended to the end of the transcript.
  Fill out the following JSON response:
    1. Do you want to add a message to the chat? ("true" or "false")
    2. If yes, what would you like to say?
    3. Why do you want to say that?
  
  IMPORTANT: Your output should be in a JSON dictionary exactly like the example output below. Just the JSON! Make sure the JSON is valid. No need to add any delimiters, just begin with a { bracket as in the example below.
  
  EXAMPLE OUTPUT:
  {
    "shouldRespond": true,
    "${DEFAULT_RESPONSE_FIELD}": "This is my response.",
    "${DEFAULT_EXPLANATION_FIELD}": "This is why I chose this response."
  }
  
  EXAMPLE OUTPUT:
  {
    "shouldRespond": false,
    "${DEFAULT_RESPONSE_FIELD}": "",
    "${DEFAULT_EXPLANATION_FIELD}": "I have spoken recently and want to give others a chance to speak."
  }`;

export const DEFAULT_STRING_FORMATTING_INSTRUCTIONS = `If you would like to respond, respond with the message you would like to send only (no timestamps or metadata), for example, "Hey everyone, please be respectful." This will be appended to the end of the chat transcript. If you don't wish to respond, respond with an empty string.`;

// ************************************************************************* //
// PROMPTS                                                                   //
// ************************************************************************* //
export function getDefaultChatPrompt(
  profile: ParticipantProfileBase,
  agentConfig: ProfileAgentConfig, // TODO: Add to params
  chatMessages: ChatMessage[],
  promptConfig: AgentChatPromptConfig,
  stageConfig: ChatStageConfig,
) {
  return [
    // TODO: Move profile context up one level
    getParticipantProfilePromptContext(
      profile,
      agentConfig?.promptContext ?? '',
    ),
    getBaseStagePrompt(
      stageConfig,
      promptConfig.promptSettings.includeStageInfo,
    ),
    getChatPromptMessageHistory(chatMessages, stageConfig),
    promptConfig.promptContext,
    promptConfig.responseConfig.formattingInstructions,
  ].join('\n');
}

/** Return prompt for processing chat history. */
function getChatPromptMessageHistory(
  messages: ChatMessage[],
  stage: ChatStageConfig,
) {
  if (messages.length === 0) {
    return `No one in the group discussion has spoken yet.`;
  }

  const description = `
Below is the transcript of your group discussion.
Each message is displayed in chronological order, with the most recent message at the bottom. Each entry follows this format:

(HH:MM) ParticipantName: Message content
  `;

  return `${description.trim()}\n\n${buildChatHistoryForPrompt(messages, stage)}`;
}

/** Convert chat message to prompt format. */
function convertChatMessageToPromptFormat(message: ChatMessage) {
  // TODO: Move to shared utils functions
  const getTime = (timestamp: UnifiedTimestamp) => {
    const date = new Date(timestamp.seconds * 1000);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `(${hours}:${minutes})`;
  };

  return `${getTime(message.timestamp)} ${message.profile.name}: ${message.message}`;
}

/** Convert chat messages into chat history string for prompt. */
function buildChatHistoryForPrompt(
  messages: ChatMessage[],
  stage: ChatStageConfig,
) {
  const concatMessages = (messages: ChatMessage[]) => {
    return messages
      .map((message) => convertChatMessageToPromptFormat(message))
      .join('\n');
  };

  // If no discussion threads, just return messages
  if (stage.discussions.length === 0) {
    return concatMessages(messages);
  }

  // Otherwise, organize messages by thread
  const history: string[] = [];
  stage.discussions.forEach((discussion) => {
    const discussionMessages = messages.filter(
      (message) => message.discussionId === discussion.id,
    );
    if (discussionMessages.length === 0) return;

    history.push(getChatDiscussionDetailsForPrompt(discussion));
    history.push(concatMessages(discussionMessages));
  });
  return history.join('\n');
}

/** Convert ChatDiscussion details into string for prompt. */
function getChatDiscussionDetailsForPrompt(discussion: ChatDiscussion) {
  if (discussion.type === ChatDiscussionType.DEFAULT) {
    return `Discussion thread: ${discussion.description}`;
  }

  // Otherwise, if comparing items
  const discussionItems = discussion.items.map((item) => item.name).join(', ');
  const description = `Discussion thread comparing the following items`;
  return `${description}: ${discussionItems}. ${discussion.description}`;
}
