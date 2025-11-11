import {UnifiedTimestamp} from '../shared';
import {
  AgentPersonaType,
  BaseAgentPromptConfig,
  ProfileAgentConfig,
  createAgentChatSettings,
  createModelGenerationConfig,
} from '../agent';
import {ParticipantProfileBase} from '../participant';
import {getParticipantProfilePromptContext} from '../participant.prompts';
import {convertUnifiedTimestampToTime} from '../shared';
import {createStructuredOutputConfig} from '../structured_output';
import {
  ChatPromptConfig,
  createDefaultMediatorPromptFromText,
  createDefaultParticipantPromptFromText,
} from '../structured_prompt';
import {ChatMessage} from '../chat_message';
import {
  ChatDiscussion,
  ChatDiscussionType,
  ChatStageConfig,
} from './chat_stage';
import {PrivateChatStageConfig} from './private_chat_stage';
import {StageKind} from './stage';
import {getBaseStagePrompt} from './stage.prompts';

// ************************************************************************* //
// CONSTANTS                                                                 //
// ************************************************************************* //
export const DEFAULT_AGENT_MEDIATOR_PROMPT = `You are a agent for a chat conversation. Your task is to ensure that the conversation is polite.
If you notice that participants are being rude, step in to make sure that everyone is respectful. 
Otherwise, do not respond.`;
export const DEFAULT_AGENT_PRIVATE_MEDIATOR_CHAT_PROMPT = `You are an agent who is chatting with a participant. Your task is to ensure that the participant's questions are answered.`;
export const DEFAULT_AGENT_PARTICIPANT_CHAT_PROMPT = `Decide if your human persona would respond at this point in the live conversation. If yes, give a natural response that fits the persona and any earlier style rules. If no style rules exist, default to a short 1–2 sentence online-style message. If they would not respond, stay silent. Stay in character.`;

// ************************************************************************* //
// PROMPTS                                                                   //
// ************************************************************************* //

/** Get chat stage context
 *  (e.g., to include in prompt for a current/future stage)
 */
export function getChatStagePromptContext(
  chatMessages: ChatMessage[],
  stageConfig: ChatStageConfig,
  includeStageInfo: boolean,
) {
  return [
    getBaseStagePrompt(stageConfig, includeStageInfo),
    getChatPromptMessageHistory(chatMessages, stageConfig),
  ].join('\n');
}

/** Return prompt for processing chat history. */
export function getChatPromptMessageHistory(
  messages: ChatMessage[],
  stage: ChatStageConfig | PrivateChatStageConfig,
) {
  if (messages.length === 0) {
    return `\n\n--- Start of chat transcript ---\nNo messages yet.\n--- End of chat transcript ---\n`;
  }

  const description = `
  Below is the transcript of your discussion. Messages are shown in chronological order; new messages appear at the bottom. Each message / turn follows the format: (HH:MM) Name: message.
  `;

  return `${description.trim()}\n\n--- Start of chat transcript ---\n${buildChatHistoryForPrompt(messages, stage)}\n--- End of chat transcript ---\n`;
}

/** Convert chat message to prompt format. */
export function convertChatMessageToPromptFormat(message: ChatMessage) {
  return `${convertUnifiedTimestampToTime(message.timestamp)} ${message.profile.name ?? message.senderId}: ${message.message}`;
}

/** Convert chat messages into chat history string for prompt. */
function buildChatHistoryForPrompt(
  messages: ChatMessage[],
  stage: ChatStageConfig | PrivateChatStageConfig,
) {
  const concatMessages = (messages: ChatMessage[]) => {
    return messages
      .map((message) => convertChatMessageToPromptFormat(message))
      .join('\n');
  };

  // If no discussion threads, just return messages
  if (stage.kind !== StageKind.CHAT || stage.discussions.length === 0) {
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

export function createChatPromptConfig(
  id: string, // stage ID
  type: StageKind.CHAT | StageKind.PRIVATE_CHAT,
  config: Partial<ChatPromptConfig> = {},
  persona: AgentPersonaType = AgentPersonaType.MEDIATOR,
): ChatPromptConfig {
  const defaultText =
    persona == AgentPersonaType.PARTICIPANT
      ? createDefaultParticipantPromptFromText('')
      : createDefaultMediatorPromptFromText('');

  return {
    id,
    type,
    prompt: config.prompt ?? defaultText,
    numRetries: config.numRetries ?? 0,
    generationConfig: config.generationConfig ?? createModelGenerationConfig(),
    structuredOutputConfig:
      config.structuredOutputConfig ?? createStructuredOutputConfig(),
    chatSettings: config.chatSettings ?? createAgentChatSettings(),
  };
}
