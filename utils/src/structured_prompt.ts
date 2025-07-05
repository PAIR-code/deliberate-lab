/** Structured prompt types, constants, and functions. */
import {
  AgentChatPromptConfig,
  AgentChatSettings,
  ModelGenerationConfig,
  createAgentChatSettings,
  createModelGenerationConfig,
} from './agent';
import {StageKind} from './stages/stage';
import {
  StructuredOutputConfig,
  ChatMediatorStructuredOutputConfig,
  createStructuredOutputConfig,
} from './structured_output';

// ****************************************************************************
// TYPES
// ****************************************************************************
export interface BasePromptConfig {
  id: string; // stage ID
  type: StageKind; // stage type
  // Structured prompt
  prompt: PromptItem[];
  // Number of times to retry prompt call if it fails
  numRetries: number;
  generationConfig: ModelGenerationConfig;
  structuredOutputConfig: StructuredOutputConfig;
}

export type MediatorPromptConfig = ChatPromptConfig;

export type ParticipantPromptConfig = ChatPromptConfig;

// Currently used for both mediator and participant chat prompts
export interface ChatPromptConfig extends BasePromptConfig {
  type: StageKind.CHAT;
  structuredOutputConfig: ChatMediatorStructuredOutputConfig;
  chatSettings: AgentChatSettings;
}

/** PromptItem, where a prompt is composed of an ordered list of PromptItems.*/
export type PromptItem =
  | TextPromptItem
  | ProfileContextPromptItem
  | StageContextPromptItem;

export interface BasePromptItem {
  type: PromptItemType;
}

export enum PromptItemType {
  TEXT = 'TEXT',
  // Context from the agent config
  PROFILE_CONTEXT = 'PROFILE_CONTEXT',
  // Context from specified stage (or all stages up to present if null)
  STAGE_CONTEXT = 'STAGE_CONTEXT',
}

export interface TextPromptItem extends BasePromptItem {
  type: PromptItemType.TEXT;
  text: string;
}

export interface ProfileContextPromptItem extends BasePromptItem {
  type: PromptItemType.PROFILE_CONTEXT;
}

export interface StageContextPromptItem extends BasePromptItem {
  type: PromptItemType.STAGE_CONTEXT;
  // ID of stage (or null if all stages up to present stage, inclusive)
  stageId: string | null;
  includePrimaryText: boolean;
  includeInfoText: boolean;
  includeHelpText: boolean;
  // Include participant view of stage, e.g., chat history, game board
  includeStageDisplay: boolean;
  // Include answers for current participant (or all participants if mediator)
  includeParticipantAnswers: boolean;
}

// ****************************************************************************
// FUNCTIONS
// ****************************************************************************

export function createChatPromptConfig(
  id: string, // stage ID
  config: Partial<ChatPromptConfig> = {},
): ChatPromptConfig {
  return {
    id,
    type: StageKind.CHAT,
    prompt: config.prompt ?? [],
    numRetries: config.numRetries ?? 0,
    generationConfig: config.generationConfig ?? createModelGenerationConfig(),
    structuredOutputConfig:
      config.structuredOutputConfig ?? createStructuredOutputConfig(),
    chatSettings: config.chatSettings ?? createAgentChatSettings(),
  };
}

// Default prompt includes current stage context
export function createDefaultPromptFromText(
  text: string,
  stageId: string,
): PromptItem[] {
  return [
    {type: PromptItemType.PROFILE_CONTEXT},
    {
      type: PromptItemType.STAGE_CONTEXT,
      stageId,
      includePrimaryText: true,
      includeInfoText: false,
      includeHelpText: false,
      includeParticipantAnswers: true,
      includeStageDisplay: true,
    },
    {type: PromptItemType.TEXT, text},
  ];
}
