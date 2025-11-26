import {UnifiedTimestamp} from '../shared';
import {
  BaseAgentPromptConfig,
  ProfileAgentConfig,
  createAgentChatSettings,
  createModelGenerationConfig,
} from '../agent';
import {ParticipantProfileBase, UserType} from '../participant';
import {getParticipantProfilePromptContext} from '../participant.prompts';
import {convertUnifiedTimestampToTime} from '../shared';
import {
  StructuredOutputDataType,
  createStructuredOutputConfig,
  makeStructuredOutputPrompt,
} from '../structured_output';
import {
  ChatPromptConfig,
  PromptItem,
  PromptItemType,
  createDefaultPromptFromText,
  createDefaultStageContextPromptItem,
  createTextPromptItem,
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
/** Default group chat stage instructions to provide to mediator in prompts. */
export const DEFAULT_MEDIATOR_GROUP_CHAT_PROMPT_INSTRUCTIONS = `Follow any persona context or instructions carefully. If none are given, respond in short, natural sentences (1–2 per turn). Adjust your response frequency based on group size: respond less often in groups with multiple participants so that all have a chance to speak.`;

/** Mediator prompt text for private chat.*/
export const DEFAULT_AGENT_PRIVATE_MEDIATOR_CHAT_PROMPT = `You are an agent who is chatting with a participant. Your task is to ensure that the participant's questions are answered.`;

/** Participant prompt text for group chat. */
export const DEFAULT_AGENT_PARTICIPANT_CHAT_PROMPT = `Decide if your human persona would respond at this point in the live conversation. If yes, give a natural response that fits the persona and any earlier style rules. If no style rules exist, default to a short 1–2 sentence online-style message. If they would not respond, stay silent. Stay in character.`;

/** Hardcoded text used in stage display of chat transcript. */
export const CHAT_PROMPT_TRANSCRIPT_EXPLANATION = `Below is the transcript of your discussion. Messages are shown in chronological order; new messages appear at the bottom. Each message / turn follows the format: (HH:MM) Name: message.`;

// ************************************************************************* //
// PROMPTS                                                                   //
// ************************************************************************* //

/** Return prompt for processing chat history. */
export function getChatPromptMessageHistory(
  messages: ChatMessage[],
  stage: ChatStageConfig | PrivateChatStageConfig,
) {
  if (messages.length === 0) {
    return `No messages yet.`;
  }
  return `${CHAT_PROMPT_TRANSCRIPT_EXPLANATION}\n\n${buildChatHistoryForPrompt(messages, stage)}`;
}

/** Convert chat message to prompt format. */
export function convertChatMessageToPromptFormat(message: ChatMessage) {
  if (message.type === UserType.SYSTEM) {
    return `${convertUnifiedTimestampToTime(message.timestamp)} [SYSTEM]: ${message.message}`;
  }
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
): ChatPromptConfig {
  return {
    id,
    type,
    prompt: config.prompt ?? createDefaultPromptFromText(''),
    includeScaffoldingInPrompt: config.includeScaffoldingInPrompt ?? true,
    numRetries: config.numRetries ?? 0,
    generationConfig: config.generationConfig ?? createModelGenerationConfig(),
    structuredOutputConfig:
      config.structuredOutputConfig ?? createStructuredOutputConfig(),
    chatSettings: config.chatSettings ?? createAgentChatSettings(),
  };
}

export function createDefaultMediatorGroupChatPrompt(
  stageId: string = '', // defaults to context from past + current stages
  text = 'Your instructions are to facilitate this group chat. Make sure all participants have a chance to speak and that everyone is polite to one another.',
): PromptItem[] {
  return [
    createTextPromptItem(
      'You are participating in a live conversation as the following online alias:',
    ),
    {type: PromptItemType.PROFILE_INFO},
    {type: PromptItemType.PROFILE_CONTEXT},
    createTextPromptItem(DEFAULT_MEDIATOR_GROUP_CHAT_PROMPT_INSTRUCTIONS),
    createDefaultStageContextPromptItem(stageId),
    createTextPromptItem(text),
  ];
}
