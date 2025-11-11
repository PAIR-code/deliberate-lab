/** Structured prompt types, constants, and functions. */
import {
  AgentChatSettings,
  AgentPersonaType,
  ModelGenerationConfig,
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
  // Custom system context that can be overwritten
  SYSTEM_INSTRUCTIONS = 'SYSTEM_INSTRUCTIONS',
  // Custom stage-specific text
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
  // WARNING: Deprecated so that stage context prompt item ALWAYS includes
  // stage display
  includeStageDisplay: boolean;
  // Include answers for current participant
  // (or all participants AND public data results if mediator)
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
// DEFAULT CONSTANTS
// ****************************************************************************
export const HEADER_PARTICIPANT_DESCRIPTION = `--- Participant description ---`;

export const DEFAULT_AGENT_PARTICIPANT_SCAFFOLDING = `You are a human participant interacting in an online task with multiple stages. In this query, you will provide an action for the current stage - for example, participating in a live chat, answering survey questions, or acknowledging information. Respond as this participant in order to move the task forward.\n`;

export const DEFAULT_AGENT_MEDIATOR_PROFILE_PREAMBLE = `You are participating in a live conversation as the following online alias:`;

export const DEFAULT_AGENT_MEDIATOR_PROFILE_SCAFFOLDING = `Follow any persona context or instructions carefully. If none are given, respond in short, natural sentences (1–2 per turn). Adjust your response frequency based on group size: respond less often in groups with multiple participants so that all have a chance to speak.`;

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

export function createTextPromptItem(text: string): TextPromptItem {
  return {
    type: PromptItemType.TEXT,
    text: text,
  } as TextPromptItem;
}

export function createDefaultMediatorPromptFromText(
  text: string,
  stageId: string = '', // defaults to context from past + current stages
): PromptItem[] {
  const getPromptItem = (text: string) => {
    return {
      text: text,
      type: PromptItemType.TEXT,
    } as PromptItem;
  };

  return [
    getPromptItem(DEFAULT_AGENT_MEDIATOR_PROFILE_PREAMBLE),
    {type: PromptItemType.PROFILE_INFO},
    {
      text: DEFAULT_AGENT_MEDIATOR_PROFILE_SCAFFOLDING,
      type: PromptItemType.TEXT,
    },
    createDefaultStageContextPromptItem(stageId),
    {type: PromptItemType.TEXT, text},
  ];
}

export function createDefaultParticipantPromptFromText(
  text: string,
  stageId: string = '', // defaults to context from past + current stages
): PromptItem[] {
  const getPromptItem = (text: string) => {
    return {
      text: text,
      type: PromptItemType.TEXT,
    } as PromptItem;
  };

  // Agent participant.
  return [
    getPromptItem(DEFAULT_AGENT_PARTICIPANT_SCAFFOLDING),
    getPromptItem(HEADER_PARTICIPANT_DESCRIPTION),
    {type: PromptItemType.PROFILE_INFO},
    {type: PromptItemType.PROFILE_CONTEXT},
    createDefaultStageContextPromptItem(stageId),
    {type: PromptItemType.TEXT, text},
  ];
}
