import {generateId} from './shared';
import {StageKind} from './stages/stage';
import {DEFAULT_AGENT_MEDIATOR_PROMPT} from './stages/chat_stage';

/** Agent types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //
export interface CustomRequestBodyField {
  name: string;
  value: string;
}

export interface AgentGenerationConfig {
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  customRequestBodyFields: CustomRequestBodyField[];
}

// Specifies which API to use for model calls
// TODO: Rename enum (ApiType? LLMApiType?)
export enum ApiKeyType {
  GEMINI_API_KEY = 'GEMINI',
  OPENAI_API_KEY = 'OPENAI',
  OLLAMA_CUSTOM_URL = 'OLLAMA',
}

// ----------------------------------------------------------------------------
// NOTE: Everything below this is in progress and not yet connected
// to experiment logic (e.g., chat mediation)
// ----------------------------------------------------------------------------

/** Generation config for a specific stage's model call. */
export interface ModelGenerationConfig {
  maxTokens: number; // Max tokens per model call response
  stopSequences: string[];
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  // TODO: Add response MIME type and schema
  customRequestBodyFields: CustomRequestBodyField[];
}

/** Model settings for a specific agent. */
export interface AgentModelSettings {
  apiType: ApiKeyType;
  modelName: string;
}

export interface AgentPromptSettings {
  // Number of times to retry prompt call if it fails
  numRetries: number;
  // Whether or not to include context from all previously completed
  // stages
  includeStageHistory: boolean;
  // Whether or not to include information (e.g., stage description)
  // shown to users
  includeStageInfo: boolean;
  // TODO: Add few-shot examples
  // (that align with generation config's response schema)
}

/** Model settings for agent in a chat discussion. */
export interface AgentChatSettings {
  // Agent's "typing speed" during the chat conversation
  wordsPerMinute: number;
  // Number of chat messages that must exist before the agent can respond
  minMessagesBeforeResponding: number;
  // Whether the agent can respond multiple times in a row
  // (i.e., whether an agent's own message can trigger a new model call)
  canSelfTriggerCalls: boolean;
  // Maximum total responses during the chat conversation (or null if no max)
  maxTotalResponses: number | null;
}

/** Specifies how prompt should be sent to API. */
export interface BaseAgentPromptConfig {
  id: string; // stage ID
  type: StageKind; // stage type
  promptContext: string; // custom prompt content
  modelSettings: AgentModelSettings;
  generationConfig: ModelGenerationConfig;
  promptSettings: AgentPromptSettings;
}

/** Prompt config for completing stage (e.g., survey questions). */
export type AgentParticipantPromptConfig = BaseAgentPromptConfig;

/** Prompt config for sending chat messages
 * (sent to specified API on stage's chat trigger)
 */
export interface AgentChatPromptConfig extends BaseAgentPromptConfig {
  chatSettings: AgentChatSettings;
}

/** Top-level agent mediator config. */
export interface AgentMediatorConfig {
  id: string;
  name: string; // display name
  avatar: string;
  isActive: boolean; // if false, API calls are not made
  defaultModelSettings: AgentModelSettings;
}

// ************************************************************************* //
// CONSTANTS                                                                 //
// ************************************************************************* //
export const DEFAULT_AGENT_API_TYPE = ApiKeyType.GEMINI_API_KEY;

export const DEFAULT_AGENT_API_MODEL = 'gemini-1.5-pro-latest';

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

export function createAgentModelSettings(
  config: Partial<AgentModelSettings> = {},
): AgentModelSettings {
  return {
    // TODO: pick first API that has a valid key?
    apiType: config.apiType ?? DEFAULT_AGENT_API_TYPE,
    // TODO: pick model name that matches API?
    modelName: config.modelName ?? DEFAULT_AGENT_API_MODEL,
  };
}

export function createModelGenerationConfig(
  config: Partial<ModelGenerationConfig> = {},
): ModelGenerationConfig {
  return {
    maxTokens: config.maxTokens ?? 8192,
    stopSequences: config.stopSequences ?? [],
    temperature: config.temperature ?? 0.7,
    topP: config.topP ?? 1.0,
    frequencyPenalty: config.frequencyPenalty ?? 0.0,
    presencePenalty: config.presencePenalty ?? 0.0,
    customRequestBodyFields: config.customRequestBodyFields ?? [],
  };
}

export function createAgentChatSettings(
  config: Partial<AgentChatSettings> = {},
): AgentChatSettings {
  return {
    wordsPerMinute: config.wordsPerMinute ?? 80,
    minMessagesBeforeResponding: config.minMessagesBeforeResponding ?? 0,
    canSelfTriggerCalls: config.canSelfTriggerCalls ?? true,
    maxTotalResponses: config.maxTotalResponses ?? null,
  };
}

export function createAgentPromptSettings(
  config: Partial<AgentPromptSettings> = {},
): AgentPromptSettings {
  return {
    numRetries: config.numRetries ?? 0,
    includeStageHistory: config.includeStageHistory ?? false,
    includeStageInfo: config.includeStageInfo ?? false,
  };
}

export function createAgentChatPromptConfig(
  id: string, // stage ID
  type: StageKind, // stage kind
  config: Partial<AgentChatPromptConfig> = {},
): AgentChatPromptConfig {
  return {
    id,
    type,
    promptContext: config.promptContext ?? '',
    modelSettings: config.modelSettings ?? createAgentModelSettings(),
    promptSettings: config.promptSettings ?? createAgentPromptSettings(),
    chatSettings: config.chatSettings ?? createAgentChatSettings(),
    generationConfig: config.generationConfig ?? createModelGenerationConfig(),
  };
}

export function createAgentMediatorConfig(
  config: Partial<AgentMediatorConfig> = {},
): AgentMediatorConfig {
  return {
    id: config.id ?? generateId(),
    name: config.name ?? 'Agent',
    avatar: config.avatar ?? '🤖',
    isActive: config.isActive ?? true,
    defaultModelSettings:
      config.defaultModelSettings ?? createAgentModelSettings(),
  };
}
