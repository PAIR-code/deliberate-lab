import { Timestamp } from 'firebase/firestore';
import { generateId, UnifiedTimestamp } from '../shared';
import {
  BaseStageConfig,
  BaseStageParticipantAnswer,
  BaseStagePublicData,
  StageGame,
  StageKind,
  createStageTextConfig,
  createStageProgressConfig,
} from './stage';
import { ParticipantProfileBase, createParticipantProfileBase } from '../participant';

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
  mediators: MediatorConfig[];
  muteMediators: boolean; // Whether mediators are muted.
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
  HUMAN_MEDIATOR = 'HUMAN_MEDIATOR',
  AGENT_MEDIATOR = 'AGENT_MEDIATOR',
}

export interface ParticipantChatMessage extends BaseChatMessage {
  type: ChatMessageType.PARTICIPANT;
  participantPublicId: string;
}

export interface HumanMediatorChatMessage extends BaseChatMessage {
  type: ChatMessageType.HUMAN_MEDIATOR;
}

export interface AgentMediatorChatMessage extends BaseChatMessage {
  type: ChatMessageType.AGENT_MEDIATOR;
  mediatorId: string;
  explanation: string;
}

/** LLM mediator config. */
export interface MediatorConfig {
  id: string;
  name: string;
  avatar: string; // emoji avatar for mediator
  prompt: string;
  responseConfig: MediatorResponseConfig;
  // TODO: Add more settings, e.g., model, temperature, context window
}

/** Settings for formatting mediator response
 *  (e.g., expect JSON, use specific JSON field for response, use end token)
 */
export interface MediatorResponseConfig {
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
  // discussionId --> map of participant public ID to readyToEndDiscussion timestamp
  discussionTimestampMap: Record<string, Record<string, UnifiedTimestamp | null>>;
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
export const DEFAULT_MEDIATOR_PROMPT = `You are a mediator for a chat conversation. Your task is to ensure that the conversation is polite.
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
export async function awaitTypingDelay(message: string): Promise<void> {
  const delay = getTypingDelay(message);
  console.log(`Waiting ${(delay / 1000).toFixed(2)} seconds to simulate delay.`);
  return new Promise((resolve) => setTimeout(resolve, delay));
}

export function getTypingDelay(message: string): number {
  // 40 WPM = 300 ms per character.
  const averageTypingSpeed = 75; // 180 WPM.
  const randomnessFactor = 0.5;

  const baseDelay = message.length * averageTypingSpeed;
  const randomMultiplier = 1 + (Math.random() * randomnessFactor - randomnessFactor / 2);

  return Math.round(baseDelay * randomMultiplier);
}

/** Create chat stage. */
export function createChatStage(config: Partial<ChatStageConfig> = {}): ChatStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.CHAT,
    game: config.game ?? StageGame.NONE,
    name: config.name ?? 'Group chat',
    descriptions: config.descriptions ?? createStageTextConfig(),
    progress: config.progress ?? createStageProgressConfig({ waitForAllParticipants: true }),
    discussions: config.discussions ?? [],
    mediators: config.mediators ?? [],
    muteMediators: config.muteMediators ?? false,
    timeLimitInMinutes: config.timeLimitInMinutes ?? 20,
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

/** Create human mediator chat message. */
export function createHumanMediatorChatMessage(
  config: Partial<HumanMediatorChatMessage> = {},
): HumanMediatorChatMessage {
  return {
    id: config.id ?? generateId(),
    discussionId: config.discussionId ?? null,
    type: ChatMessageType.HUMAN_MEDIATOR,
    message: config.message ?? '',
    timestamp: config.timestamp ?? Timestamp.now(),
    profile: config.profile ?? { name: 'Mediator', avatar: '⭐', pronouns: null },
  };
}

/** Create agent mediator chat message. */
export function createAgentMediatorChatMessage(
  config: Partial<AgentMediatorChatMessage> = {},
): AgentMediatorChatMessage {
  return {
    id: config.id ?? generateId(),
    discussionId: config.discussionId ?? null,
    type: ChatMessageType.AGENT_MEDIATOR,
    message: config.message ?? '',
    timestamp: config.timestamp ?? Timestamp.now(),
    profile: config.profile ?? { name: 'Mediator', avatar: '🤖', pronouns: null },
    mediatorId: config.mediatorId ?? '',
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
    .map((message) => `${getTime(message.timestamp)} ${message.profile.name}: ${message.message}`)
    .join('\n');
}

/** Add chat messages (as history) to given prompt. */
export function addChatHistoryToPrompt(messages: ChatMessage[], prompt: string) {
  return `${buildChatHistoryForPrompt(messages)}\n\n${prompt}`;
}

export function getPreface(mediator: MediatorConfig) {
  return `You are role-playing as ${mediator.avatar} ${mediator.name}, and you are participating in a conversation. You will be shown the conversation transcript. When you see ${mediator.avatar} ${mediator.name} as the ParticipantName in the transcript, that indicates a message that you previously sent. If the last message in the transcript is from ${mediator.name} ${mediator.name}, do not respond to yourself.`;
}
export function getChatHistory(messages: ChatMessage[], mediator: MediatorConfig) {
  const latestMessage = messages[messages.length - 1];
  const description = `The following is a conversation transcript between you and other participants. In the transcript, each entry follows the format (HH:MM) ParticipantName:  ParticipantMessage, where (HH:MM) is the timestamp of the message. The transcript is shown in sequential order from oldest message to latest message. The last entry is the most recent message. In this transcript, the latest message was written by ${latestMessage.profile.avatar} ${latestMessage.profile.name}. It said, ${latestMessage.message}.`;
  return `${description}\n\nCONVERSATION TRANSCRIPT:\n\n${buildChatHistoryForPrompt(messages)}\n`;
}

/** Create agent mediator. */
export function createMediatorConfig(config: Partial<MediatorConfig> = {}): MediatorConfig {
  return {
    id: config.id ?? generateId(),
    name: config.name ?? 'Mediator',
    avatar: config.avatar ?? '🤖',
    prompt: config.prompt ?? DEFAULT_MEDIATOR_PROMPT.trim(),
    responseConfig: config.responseConfig ?? createMediatorResponseConfig(),
  };
}

/** Create mediator response config. */
export function createMediatorResponseConfig(
  config: Partial<MediatorResponseConfig> = {},
): MediatorResponseConfig {
  const isJSON = config.isJSON ?? false;
  return {
    isJSON,
    messageField: config.messageField ?? DEFAULT_RESPONSE_FIELD,
    explanationField: config.explanationField ?? DEFAULT_EXPLANATION_FIELD,
    formattingInstructions:
      config.formattingInstructions ?? isJSON
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
export function createChatStagePublicData(stage: ChatStageConfig): ChatStagePublicData {
  return {
    id: stage.id,
    kind: StageKind.CHAT,
    discussionTimestampMap: {},
    discussionStartTimestamp: null,
    discussionCheckpointTimestamp: null,
    discussionEndTimestamp: null,
  };
}
