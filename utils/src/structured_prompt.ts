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
import {
  ShuffleConfig,
  SeedStrategy,
  createShuffleConfig,
} from './utils/random.utils';
import {Condition} from './utils/condition';

// ****************************************************************************
// CONSTANTS
// ****************************************************************************

/** Scaffolding for ProfileContext prompt item (for participants). */
export const PROMPT_ITEM_PROFILE_CONTEXT_PARTICIPANT_SCAFFOLDING = `This information is private to you. Use it to guide your behavior in this task. Other participants do not know these attributes unless you choose to share it.`;

/** Temporary, general scaffolding for ProfileInfo prompt item (for participants). */
export const PROMPT_ITEM_PROFILE_INFO_PARTICIPANT_SCAFFOLDING = `This is the display name that others will use to refer to you. It may be a label such as an animal or object, but you are still a human using this alias.`;

/** Scaffolding for ProfileInfo prompt item (for participants when profile is assigned, e.g., pseudononymous animal set). */
// TODO: Use this instead of temporary profile info scaffolding above.
export const PROMPT_ITEM_PROFILE_INFO_ASSIGNED_PROFILE_PARTICIPANT_SCAFFOLDING = `This is your randomly assigned pseudonymous alias. Others will use it to refer to you. It’s only a label (such as an animal or object). You are still a human using this alias.`;

/** Scaffolding for ProfileInfo prompt item (for participants when profile is self-set). */
// TODO: Use this instead of temporary profile info scaffolding above.
export const PROMPT_ITEM_PROFILE_INFO_SELECTED_PROFILE_PARTICIPANT_SCAFFOLDING = `This is the display name you chose for others to see you as.`;

/** Default agent participant instructions to provide in prompt. */
export const DEFAULT_AGENT_PARTICIPANT_PROMPT_INSTRUCTIONS = `You are a human participant interacting in an online task with multiple stages. In this query, you will provide an action for the current stage - for example, participating in a live chat, answering survey questions, or acknowledging information. Respond as this participant in order to move the task forward.\n`;

// ****************************************************************************
// TYPES
// ****************************************************************************
export interface BasePromptConfig {
  id: string; // stage ID
  type: StageKind; // stage type
  // Structured prompt
  prompt: PromptItem[];
  // Whether or not prompt should include scaffolding when built.
  // TODO: Consider making this an enum if we expect different types of
  // scaffolding in the future. This will require backwards compatibility
  // though.
  includeScaffoldingInPrompt: boolean;
  // Number of times to retry prompt call if it fails
  numRetries: number;
  generationConfig: ModelGenerationConfig;
  structuredOutputConfig: StructuredOutputConfig;
}

export type MediatorPromptConfig = ChatPromptConfig;

export type ParticipantPromptConfig =
  | ChatPromptConfig
  | ProfilePromptConfig
  | RankingPromptConfig
  | SurveyPromptConfig
  | SurveyPerParticipantPromptConfig;

export interface ProfilePromptConfig extends BasePromptConfig {
  type: StageKind.PROFILE;
}

export interface RankingPromptConfig extends BasePromptConfig {
  type: StageKind.RANKING;
}

export interface SurveyPromptConfig extends BasePromptConfig {
  type: StageKind.SURVEY;
}

export interface SurveyPerParticipantPromptConfig extends BasePromptConfig {
  type: StageKind.SURVEY_PER_PARTICIPANT;
}

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
  // Optional condition for showing/hiding this prompt item
  condition?: Condition;
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
    shuffleConfig: createShuffleConfig({
      shuffle: false,
      seed: SeedStrategy.PARTICIPANT,
    }),
  };
}

// Default prompt includes current stage context
// TODO: Deprecate this in favor of more specific (e.g., mediator/participant)
// default prompts.
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

export function createDefaultParticipantPrompt(
  text: string, // custom instructions to append to end of prompt
): PromptItem[] {
  return [
    createTextPromptItem(DEFAULT_AGENT_PARTICIPANT_PROMPT_INSTRUCTIONS),
    createTextPromptItem(`--- Participant description ---`),
    {type: PromptItemType.PROFILE_INFO},
    {type: PromptItemType.PROFILE_CONTEXT},
    createDefaultStageContextPromptItem(''), // include all stages' context
    createTextPromptItem(text),
  ];
}
