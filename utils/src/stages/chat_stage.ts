import {Timestamp} from 'firebase/firestore';
import {generateId, UnifiedTimestamp} from '../shared';
import {
  BaseStageConfig,
  BaseStageParticipantAnswer,
  BaseStagePublicData,
  StageGame,
  StageKind,
  createStageTextConfig,
  createStageProgressConfig,
} from './stage';
import {
  ParticipantProfileBase,
  createParticipantProfileBase,
} from '../participant';
import {AgentGenerationConfig} from '../agent';

/** Group chat stage types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

/**
 * ChatStageConfig.
 *
 * This is saved as a stage doc under experiments/{experimentId}/stages
 */
export interface ChatStageConfig extends BaseStageConfig {
  kind: StageKind.CHAT;
  discussions: ChatDiscussion[]; // ordered list of discussions
  agents: AgentConfig[];
  timeLimitInMinutes: number | null; // How long remaining in the chat.
}

/** Chat discussion. */
export interface BaseChatDiscussion {
  id: string;
  type: ChatDiscussionType;
  description: string;
}

/** Types of chat discussions. */
export enum ChatDiscussionType {
  DEFAULT = 'DEFAULT',
  COMPARE = 'COMPARE', // compare items
}

/** Default chat discussion (description only). */
export interface DefaultChatDiscussion extends BaseChatDiscussion {
  type: ChatDiscussionType.DEFAULT;
}

/** Compare chat discussion (list of items to compare). */
export interface CompareChatDiscussion extends BaseChatDiscussion {
  type: ChatDiscussionType.COMPARE;
  items: DiscussionItem[];
}

/** Discussion item to compare. */
export interface DiscussionItem {
  id: string;
  imageId: string; // or empty if no image provided
  name: string;
}

export type ChatDiscussion = DefaultChatDiscussion | CompareChatDiscussion;

/**
 * ChatMessage.
 *
 * Saved as docs under
 * experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}/chats
 */
export interface BaseChatMessage {
  id: string;
  discussionId: string | null; // discussion during which message was sent
  type: ChatMessageType;
  message: string;
  timestamp: UnifiedTimestamp;
  profile: ParticipantProfileBase;
}

export enum ChatMessageType {
  PARTICIPANT = 'PARTICIPANT',
  HUMAN_AGENT = 'HUMAN_AGENT',
  AGENT_AGENT = 'AGENT_AGENT',
}

export interface ParticipantChatMessage extends BaseChatMessage {
  type: ChatMessageType.PARTICIPANT;
  participantPublicId: string;
}

export interface HumanMediatorChatMessage extends BaseChatMessage {
  type: ChatMessageType.HUMAN_AGENT;
}

export interface AgentMediatorChatMessage extends BaseChatMessage {
  type: ChatMessageType.AGENT_AGENT;
  agentId: string;
  explanation: string;
}

/** LLM agent config. */
export interface AgentConfig {
  id: string;
  name: string;
  avatar: string; // emoji avatar for agent
  model: string;
  prompt: string;
  wordsPerMinute: number; // Typing speed
  generationConfig: AgentGenerationConfig;
  responseConfig: AgentResponseConfig;
  // TODO: Add more settings, e.g. context window
}

/** Settings for formatting agent response
 *  (e.g., expect JSON, use specific JSON field for response, use end token)
 */
export interface AgentResponseConfig {
  isJSON: boolean;
  // JSON field to extract chat message from
  messageField: string;
  // JSON field to extract explanation from
  explanationField: string;
  formattingInstructions: string;
}

export type ChatMessage =
  | ParticipantChatMessage
  | HumanMediatorChatMessage
  | AgentMediatorChatMessage;

/**
 * ChatStageParticipantAnswer.
 *
 * This is saved as a stage doc (with stage ID as doc ID) under
 * experiments/{experimentId}/participants/{participantPrivateId}/stageData
 */
export interface ChatStageParticipantAnswer extends BaseStageParticipantAnswer {
  kind: StageKind.CHAT;
  // discussion ID --> readyToEndDiscussion timestamp (or null if not ready)
  discussionTimestampMap: Record<string, UnifiedTimestamp | null>;
}

/**
 * ChatStagePublicData.
 *
 * This is saved as a stage doc (with stage ID as doc ID) under
 * experiments/{experimentId}/cohorts/{cohortId}/publicStageData
 */
export interface ChatStagePublicData extends BaseStagePublicData {
  kind: StageKind.CHAT;
  // null if no current discussion (e.g., all discussions over or 0 discussions)
  currentDiscussionId: string | null;
  // discussionId --> map of participant public ID to readyToEndDiscussion timestamp
  discussionTimestampMap: Record<
    string,
    Record<string, UnifiedTimestamp | null>
  >;
  // The timestamp of the first message, or null if not started.
  discussionStartTimestamp: UnifiedTimestamp | null;
  // A timestamp used for in progress checkpoint.
  discussionCheckpointTimestamp: UnifiedTimestamp | null;
  // If the end timestamp is not null, the conversation has ended.
  discussionEndTimestamp: UnifiedTimestamp | null;
}

// ************************************************************************* //
// CONSTANTS                                                                 //
// ************************************************************************* //
export const DEFAULT_MODEL = 'gemini-1.5-pro-latest';

// TODO: Refactor chat prompts into chat_stage.prompts.ts file
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
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create chat stage. */
export function createChatStage(
  config: Partial<ChatStageConfig> = {},
): ChatStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.CHAT,
    game: config.game ?? StageGame.NONE,
    name: config.name ?? 'Group chat',
    descriptions: config.descriptions ?? createStageTextConfig(),
    progress:
      config.progress ??
      createStageProgressConfig({waitForAllParticipants: true}),
    discussions: config.discussions ?? [],
    agents: config.agents ?? [],
    timeLimitInMinutes: config.timeLimitInMinutes ?? null,
  };
}

/** Create chat default discussion. */
export function createDefaultChatDiscussion(
  config: Partial<DefaultChatDiscussion> = {},
): DefaultChatDiscussion {
  return {
    id: config.id ?? generateId(),
    type: ChatDiscussionType.DEFAULT,
    description: config.description ?? '',
  };
}

/** Create compare chat discussion. */
export function createCompareChatDiscussion(
  config: Partial<CompareChatDiscussion> = {},
): CompareChatDiscussion {
  return {
    id: config.id ?? generateId(),
    type: ChatDiscussionType.COMPARE,
    description: config.description ?? '',
    items: config.items ?? [],
  };
}

/** Create participant chat message. */
export function createParticipantChatMessage(
  config: Partial<ParticipantChatMessage> = {},
): ParticipantChatMessage {
  return {
    id: config.id ?? generateId(),
    discussionId: config.discussionId ?? null,
    type: ChatMessageType.PARTICIPANT,
    message: config.message ?? '',
    timestamp: config.timestamp ?? Timestamp.now(),
    profile: config.profile ?? createParticipantProfileBase(),
    participantPublicId: config.participantPublicId ?? '',
  };
}

/** Create human agent chat message. */
export function createHumanMediatorChatMessage(
  config: Partial<HumanMediatorChatMessage> = {},
): HumanMediatorChatMessage {
  return {
    id: config.id ?? generateId(),
    discussionId: config.discussionId ?? null,
    type: ChatMessageType.HUMAN_AGENT,
    message: config.message ?? '',
    timestamp: config.timestamp ?? Timestamp.now(),
    profile: config.profile ?? {name: 'Agent', avatar: '⭐', pronouns: null},
  };
}

/** Create agent agent chat message. */
export function createAgentMediatorChatMessage(
  config: Partial<AgentMediatorChatMessage> = {},
): AgentMediatorChatMessage {
  return {
    id: config.id ?? generateId(),
    discussionId: config.discussionId ?? null,
    type: ChatMessageType.AGENT_AGENT,
    message: config.message ?? '',
    timestamp: config.timestamp ?? Timestamp.now(),
    profile: config.profile ?? {name: 'Agent', avatar: '🤖', pronouns: null},
    agentId: config.agentId ?? '',
    explanation: config.explanation ?? '',
  };
}

/** Convert chat messages into chat history string for prompt. */
export function buildChatHistoryForPrompt(messages: ChatMessage[]) {
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

/** Add chat messages (as history) to given prompt. */
export function addChatHistoryToPrompt(
  messages: ChatMessage[],
  prompt: string,
) {
  return `${buildChatHistoryForPrompt(messages)}\n\n${prompt}`;
}

export function getPreface(agent: AgentConfig, stage: ChatStageConfig) {
  const descriptions = [];

  if (stage.descriptions.primaryText) {
    descriptions.push(
      `- Conversation description: ${stage.descriptions.primaryText}`,
    );
  }
  if (stage.descriptions.infoText) {
    descriptions.push(
      `- Additional information: ${stage.descriptions.infoText}`,
    );
  }
  if (stage.descriptions.helpText) {
    descriptions.push(
      `- If you need assistance: ${stage.descriptions.helpText}`,
    );
  }

  const descriptionHtml = descriptions.length
    ? `\nThis conversation has the following details:\n${descriptions.join('\n')}`
    : '';

  return `You are role-playing as ${agent.avatar} ${agent.name}, participating in a conversation with other participants.${descriptionHtml}.`;
}

export function getChatHistory(messages: ChatMessage[], agent: AgentConfig) {
  const latestMessage = messages[messages.length - 1];
  const description = `The following is a conversation transcript between you and other participants. In the transcript, each entry follows the format (HH:MM) ParticipantName:  ParticipantMessage, where (HH:MM) is the timestamp of the message. The transcript is shown in sequential order from oldest message to latest message. The last entry is the most recent message. In this transcript, the latest message was written by ${latestMessage.profile.avatar} ${latestMessage.profile.name}. It said, ${latestMessage.message}.`;
  return `${description}\n\nCONVERSATION TRANSCRIPT:\n\n${buildChatHistoryForPrompt(messages)}\n`;
}

/** Create agent agent. */
export function createAgentConfig(
  config: Partial<AgentConfig> = {},
): AgentConfig {
  return {
    id: config.id ?? generateId(),
    name: config.name ?? 'Agent',
    avatar: config.avatar ?? '🤖',
    model: config.model ?? DEFAULT_MODEL,
    prompt: config.prompt ?? DEFAULT_AGENT_MEDIATOR_PROMPT.trim(),
    wordsPerMinute: config.wordsPerMinute ?? 80, // Default 80 WPM.
    generationConfig: config.generationConfig ?? createAgentGenerationConfig(),
    responseConfig: config.responseConfig ?? createAgentResponseConfig(),
  };
}

export function createAgentGenerationConfig(
  config: Partial<AgentGenerationConfig> = {},
): AgentGenerationConfig {
  return {
    temperature: config.temperature ?? 0.7,
    topP: config.topP ?? 1.0,
    frequencyPenalty: config.frequencyPenalty ?? 0.0,
    presencePenalty: config.presencePenalty ?? 0.0,
    customRequestBodyFields: config.customRequestBodyFields ?? [],
  };
}

/** Create agent response config. */
export function createAgentResponseConfig(
  config: Partial<AgentResponseConfig> = {},
): AgentResponseConfig {
  const isJSON = config.isJSON ?? false;
  return {
    isJSON,
    messageField: config.messageField ?? DEFAULT_RESPONSE_FIELD,
    explanationField: config.explanationField ?? DEFAULT_EXPLANATION_FIELD,
    formattingInstructions:
      (config.formattingInstructions ?? isJSON)
        ? DEFAULT_JSON_FORMATTING_INSTRUCTIONS
        : DEFAULT_STRING_FORMATTING_INSTRUCTIONS,
  };
}

/** Create participant chat stage answer. */
export function createChatStageParticipantAnswer(
  config: Partial<ChatStageParticipantAnswer>,
): ChatStageParticipantAnswer {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.CHAT,
    discussionTimestampMap: config.discussionTimestampMap ?? {},
  };
}

/** Create chat stage public data. */
export function createChatStagePublicData(
  config: ChatStageConfig,
): ChatStagePublicData {
  const id = config.id;
  const currentDiscussionId =
    config.discussions.length === 0 ? null : config.discussions[0].id;

  return {
    id,
    kind: StageKind.CHAT,
    currentDiscussionId,
    discussionTimestampMap: {},
    discussionStartTimestamp: null,
    discussionCheckpointTimestamp: null,
    discussionEndTimestamp: null,
  };
}
