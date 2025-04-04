import {UnifiedTimestamp} from '../shared';
import {AgentChatPromptConfig, ProfileAgentConfig} from '../agent';
import {ParticipantProfileBase} from '../participant';
import {ChatMessage, ChatStageConfig} from './chat_stage';

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
    getChatPromptPreface(profile, promptConfig, stageConfig),
    getChatPromptHistory(chatMessages),
    promptConfig.responseConfig.formattingInstructions,
    promptConfig.promptContext,
    agentConfig?.promptContext ?? '',
  ].join('\n');
}

/** Return context for default chat prompt. */
function getChatPromptPreface(
  profile: ParticipantProfileBase,
  promptConfig: AgentChatPromptConfig,
  stage: ChatStageConfig,
) {
  const descriptions = [];

  // TODO: Include history from prior stages if includeStageHistory is true
  if (
    stage.descriptions.primaryText &&
    promptConfig.promptSettings.includeStageInfo
  ) {
    descriptions.push(
      `- Conversation description: ${stage.descriptions.primaryText}`,
    );
  }
  if (
    stage.descriptions.infoText &&
    promptConfig.promptSettings.includeStageInfo
  ) {
    descriptions.push(
      `- Additional information: ${stage.descriptions.infoText}`,
    );
  }
  if (
    stage.descriptions.helpText &&
    promptConfig.promptSettings.includeStageInfo
  ) {
    descriptions.push(
      `- If you need assistance: ${stage.descriptions.helpText}`,
    );
  }

  const descriptionHtml = descriptions.length
    ? `\nThis conversation has the following details:\n${descriptions.join('\n')}`
    : '';

  return `You are role-playing as ${profile.avatar} ${profile.name}, participating in a conversation with other participants.${descriptionHtml}.`;
}

/** Return prompt for processing chat history. */
function getChatPromptHistory(messages: ChatMessage[]) {
  if (messages.length === 0) {
    return '';
  }

  const latestMessage = messages[messages.length - 1];
  const description = `The following is a conversation transcript between you and other participants. In the transcript, each entry follows the format (HH:MM) ParticipantName:  ParticipantMessage, where (HH:MM) is the timestamp of the message. The transcript is shown in sequential order from oldest message to latest message. The last entry is the most recent message. In this transcript, the latest message was written by ${latestMessage.profile.avatar} ${latestMessage.profile.name}. It said, ${latestMessage.message}.`;
  return `${description}\n\nCONVERSATION TRANSCRIPT:\n\n${buildChatHistoryForPrompt(messages)}\n`;
}

/** Convert chat messages into chat history string for prompt. */
function buildChatHistoryForPrompt(messages: ChatMessage[]) {
  const getTime = (timestamp: UnifiedTimestamp) => {
    const date = new Date(timestamp.seconds * 1000);
    return `(${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')})`;
  };

  return messages
    .map(
      (message) =>
        `${getTime(message.timestamp)} ${message.profile.name}: ${message.message}`,
    )
    .join('\n');
}
