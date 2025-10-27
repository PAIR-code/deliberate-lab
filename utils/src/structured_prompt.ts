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
import {ShuffleConfig, SeedStrategy} from './utils/random.utils';

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

/** Currently used for both mediator and participant chat prompts. */
export interface ChatPromptConfig extends BasePromptConfig {
  type: StageKind.CHAT | StageKind.PRIVATE_CHAT;
  structuredOutputConfig: ChatMediatorStructuredOutputConfig;
  chatSettings: AgentChatSettings;
}

/** PromptItem, where a prompt is composed of an ordered list of PromptItems.*/
export type PromptItem =
  | TextPromptItem
  | ProfileContextPromptItem
  | ProfileInfoPromptItem
  | StageContextPromptItem
  | PromptItemGroup;

export interface BasePromptItem {
  type: PromptItemType;
}

export enum PromptItemType {
  TEXT = 'TEXT',
  // Profile name/avatar/pronouns
  PROFILE_INFO = 'PROFILE_INFO',
  // Context specified in the agent config
  PROFILE_CONTEXT = 'PROFILE_CONTEXT',
  // Context from specified stage (or all preceding stages AND current stage
  // if stageId is empty)
  // NOTE: This is content that a human participant can see, e.g.,
  // half-answered survey while in the UI for the given stage
  STAGE_CONTEXT = 'STAGE_CONTEXT',
  // Group of prompt items
  GROUP = 'GROUP',
}

export interface TextPromptItem extends BasePromptItem {
  type: PromptItemType.TEXT;
  text: string;
}

/** Context specified in the agent config. */
export interface ProfileContextPromptItem extends BasePromptItem {
  type: PromptItemType.PROFILE_CONTEXT;
}

/** Profile name, avatar, and pronouns. */
export interface ProfileInfoPromptItem extends BasePromptItem {
  type: PromptItemType.PROFILE_INFO;
}

/**
 * StageContextPromptItem.
 *
 * NOTE: This is content that a human participant can see, e.g.,
 * half-answered survey while in the UI for the given stage.
 */
export interface StageContextPromptItem extends BasePromptItem {
  type: PromptItemType.STAGE_CONTEXT;
  // ID of stage (or empty if context should include all preceding stages
  // plus current stage)
  stageId: string;
  includePrimaryText: boolean;
  includeInfoText: boolean;
  // WARNING: includeHelpText field has been deprecated
  includeHelpText: boolean;
  // Include participant view of stage, e.g., chat history, game board
  includeStageDisplay: boolean;
  // Include answers for current participant (or all participants if mediator)
  includeParticipantAnswers: boolean;
}

/** Group of prompt items. */
export interface PromptItemGroup extends BasePromptItem {
  type: PromptItemType.GROUP;
  title: string;
  items: PromptItem[];
  shuffleConfig?: ShuffleConfig;
}

// ****************************************************************************
// FUNCTIONS
// ****************************************************************************

// Default stage context
export function createDefaultStageContextPromptItem(
  // If empty string, all preceding stages + current stage to be concatenated
  stageId: string,
): StageContextPromptItem {
  return {
    type: PromptItemType.STAGE_CONTEXT,
    stageId,
    includePrimaryText: true,
    includeInfoText: false,
    includeHelpText: false,
    includeParticipantAnswers: true,
    includeStageDisplay: true,
  };
}

// Create prompt item group with defaults
export function createDefaultPromptItemGroup(
  title: string = 'New Group',
  items: PromptItem[] = [],
): PromptItemGroup {
  return {
    type: PromptItemType.GROUP,
    title,
    items,
    shuffleConfig: {
      shuffle: false,
      seed: SeedStrategy.PARTICIPANT,
      customSeed: '',
    },
  };
}

// Default prompt includes current stage context
export function createDefaultPromptFromText(
  text: string,
  stageId: string = '', // defaults to context from past + current stages
): PromptItem[] {
  return [
    {
      type: PromptItemType.TEXT,
      text: 'You are participating in an experiment with the following online profile:',
    },
    {type: PromptItemType.PROFILE_INFO},
    {type: PromptItemType.PROFILE_CONTEXT},
    createDefaultStageContextPromptItem(stageId),
    {type: PromptItemType.TEXT, text},
  ];
}

export function createTextPromptItem(text: string): TextPromptItem {
  return {
    type: PromptItemType.TEXT,
    text: text,
  } as TextPromptItem;
}
