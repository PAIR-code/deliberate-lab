/** Structured prompt types, constants, and functions. */
import {AgentChatPromptConfig, ModelGenerationConfig} from './agent';
import {StageKind} from './stages/stage';
import {StructuredOutputConfig} from './structured_output';

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

/** PromptItem, where a prompt is composed of an ordered list of PromptItems.*/
export type PromptItem = TextPromptItem | StageContextPromptItem;

export interface BasePromptItem {
  type: PromptItemType;
}

export enum PromptItemType {
  TEXT = 'TEXT',
  // Context from specified stage (or all stages up to present if null)
  STAGE_CONTEXT = 'STAGE_CONTEXT',
}

export interface TextPromptItem extends BasePromptItem {
  type: PromptItemType.TEXT;
  text: string;
}

export interface StageContextPromptItem extends BasePromptItem {
  type: PromptItemType.STAGE_CONTEXT;
  // ID of stage (or null if all stages up to present stage, inclusive)
  stageId: string | null;
  includePrimaryText: boolean;
  includeInfoText: boolean;
  includeHelpText: boolean;
  includeParticipantAnswers: boolean;
}
