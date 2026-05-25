import {UnifiedTimestamp} from '../shared';
import {
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
  ChatMediatorInstructionsPromptItem,
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
export const DEFAULT_MEDIATOR_CHAT_STYLE_INSTRUCTIONS = `Follow any persona context or instructions carefully. If none are given, respond in short, natural sentences (1–2 per turn).`;

export const DEFAULT_MEDIATOR_CHAT_FREQUENCY_INSTRUCTIONS = `Adjust your response frequency based on group size: respond less often in groups with multiple participants so that all have a chance to speak.`;

/** Default group chat stage instructions to provide to mediator in prompts. */
export const DEFAULT_MEDIATOR_GROUP_CHAT_PROMPT_INSTRUCTIONS = `${DEFAULT_MEDIATOR_CHAT_STYLE_INSTRUCTIONS} ${DEFAULT_MEDIATOR_CHAT_FREQUENCY_INSTRUCTIONS}`;

export const DEFAULT_MEDIATOR_GROUP_CHAT_TURN_TAKING_PROMPT_INSTRUCTIONS =
  DEFAULT_MEDIATOR_CHAT_STYLE_INSTRUCTIONS;

/** Mediator prompt text for private chat.*/
export const DEFAULT_AGENT_PRIVATE_MEDIATOR_CHAT_PROMPT = `You are an agent who is chatting with a participant. Your task is to ensure that the participant's questions are answered.`;

/** Participant prompt text for group chat. */
export const DEFAULT_AGENT_PARTICIPANT_CHAT_STYLE_INSTRUCTIONS = `Rules for how to write your message:
- Let your persona determine how you open. Some people jump straight to their opinion; others react to what was just said first ("yeah but—", "wait, really?", "I mean, kind of"). Don't default to a thesis-statement opener just because it's the easiest thing to write — ask what *this person* would actually do.
- Keep it short: 1-3 sentences as a default. Never write a paragraph. Real people in group chats don't write essays.
- Verbosity is a tendency, not a rule. A terse persona is usually brief — but if something genuinely provokes them, they say more. A verbose persona usually elaborates — but sometimes a short reaction is all they have. Let the moment determine it.
- Express your personality through word choice and content, not through formal sentence structure. Even a highly educated or pedantic persona types in chat voice, not essay voice. A pedant in a group chat writes "honestly not that hard to keep your inbox organized" — not "it is a profound failure of personal discipline."
- Sound like your persona, not like an AI assistant. Use your persona's speech patterns, vocabulary level, and tone. Fragments and low-substance replies are valid when they fit the persona.
- Match your persona's conversational style: some people always have something substantive to add, others often just signal agreement or confusion. Not every response needs to make a new point — but only write a low-substance reply if that genuinely fits how your persona communicates.
- Stay in character throughout. Do not summarize, explain your reasoning, or step outside the persona.`;

export const DEFAULT_AGENT_PARTICIPANT_CHAT_PROMPT = `You are participating in a live group chat as your persona.

First, react: read the last 1-2 messages and ask yourself how this specific person would feel in this moment. Are they amused? Annoyed? Curious? Uncertain? Let that reaction drive your response.

Then decide whether to actually send a message. Not every message in a group chat deserves a reply — sometimes you'd scroll past. If yes, write it. If no, stay silent.

${DEFAULT_AGENT_PARTICIPANT_CHAT_STYLE_INSTRUCTIONS}`;

export const DEFAULT_AGENT_PARTICIPANT_CHAT_TURN_TAKING_PROMPT = `You are participating in a live group chat as your persona. It is your turn to write a message.

First, react: read the last 1-2 messages and ask yourself how this specific person would feel in this moment. Are they amused? Annoyed? Curious? Uncertain? Let that reaction drive your response. Write a message.

${DEFAULT_AGENT_PARTICIPANT_CHAT_STYLE_INSTRUCTIONS}`;

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
    {
      type: PromptItemType.CHAT_MEDIATOR_INSTRUCTIONS,
    } as ChatMediatorInstructionsPromptItem,
    createDefaultStageContextPromptItem(stageId),
    createTextPromptItem(text),
  ];
}
