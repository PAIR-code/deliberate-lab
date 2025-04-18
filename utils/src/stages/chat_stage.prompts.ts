import {UnifiedTimestamp} from '../shared';
import {AgentChatPromptConfig} from '../agent';
import {MediatorProfile} from '../mediator';
import {ChatMessage, ChatStageConfig} from './chat_stage';

// ************************************************************************* //
// CONSTANTS                                                                 //
// ************************************************************************* //
export const DEFAULT_MODEL = 'gemini-1.5-pro-latest';
export const DEFAULT_AGENT_MEDIATOR_PROMPT = `You are a agent for a chat conversation. Your task is to ensure that the conversation is polite.
If you notice that participants are being rude, step in to make sure that everyone is respectful. 
Otherwise, do not respond.`;

// ************************************************************************* //
// PROMPTS                                                                   //
// ************************************************************************* //
export function getDefaultChatPrompt(
  mediator: MediatorProfile,
  chatMessages: ChatMessage[],
  promptConfig: AgentChatPromptConfig,
  stageConfig: ChatStageConfig,
) {
  return [
    getChatPromptPreface(mediator, promptConfig, stageConfig),
    getChatPromptHistory(chatMessages),
    promptConfig.promptContext,
    mediator.agentConfig?.promptContext ?? '',
  ].join('\n');
}

/** Return context for default chat prompt. */
function getChatPromptPreface(
  mediator: MediatorProfile,
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

  return `You are role-playing as ${mediator.avatar} ${mediator.name}, participating in a conversation with other participants.${descriptionHtml}.`;
}

/** Return prompt for processing chat history. */
function getChatPromptHistory(messages: ChatMessage[]) {
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
