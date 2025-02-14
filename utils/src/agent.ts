import {generateId} from './shared';
import {StageKind} from './stages/stage';

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

// TODO: Rename?
export interface AgentModelSettings {
  apiType: ApiKeyType;
  modelName: string;
  numRetries: number; // Number of times to retry API call if it fails
  maxTokens: number; // Max tokens per model call response
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  customRequestBodyFields: CustomRequestBodyField[];
}

// Settings specifically for agent chat mediators
// TODO: Adjust fields as appropriate
export interface AgentMediatorModelSettings extends AgentModelSettings {
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

// Specifies how prompt should be built
// TODO: Adjust fields as appropriate
export interface AgentBasePromptConfig {
  type: StageKind;
  prompt: string;
  // Whether or not to include context from all previously completed
  // stages
  includeStageHistory: boolean;
  // Whether or not to include information (e.g., stage description)
  // shown to users
  includeStageInfo: boolean;
  // TODO: Add stop sequence?
  // TODO: Add structured output config/fields
  // TODO: Add structure for few-shot examples?
}

export interface AgentChatPromptConfig extends AgentBasePromptConfig {
  type: StageKind.CHAT;
}

export type AgentPromptConfig = AgentChatPromptConfig;

// TODO: Config for agent participant
// For each stage agent is participating in,
// include model + prompt settings?

// Config for agent mediator
export interface AgentMediatorConfig {
  id: string;
  stageId: string; // chat stage that mediator is part of
  name: string; // display name
  avatar: string;
  modelSettings: AgentMediatorModelSettings;
  promptSettings: AgentChatPromptConfig;
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
    numRetries: config.numRetries ?? 0,
    maxTokens: config.maxTokens ?? 8192,
    temperature: config.temperature ?? 0.7,
    topP: config.topP ?? 1.0,
    frequencyPenalty: config.frequencyPenalty ?? 0.0,
    presencePenalty: config.presencePenalty ?? 0.0,
    customRequestBodyFields: config.customRequestBodyFields ?? [],
  };
}

export function createAgentMediatorModelSettings(
  config: Partial<AgentMediatorModelSettings> = {},
): AgentMediatorModelSettings {
  return {
    ...createAgentModelSettings(config),
    wordsPerMinute: config.wordsPerMinute ?? 80,
    minMessagesBeforeResponding: config.minMessagesBeforeResponding ?? 0,
    canSelfTriggerCalls: config.canSelfTriggerCalls ?? true,
    maxTotalResponses: config.maxTotalResponses ?? null,
  };
}

export function createAgentChatPromptConfig(
  config: Partial<AgentChatPromptConfig> = {},
): AgentChatPromptConfig {
  return {
    type: StageKind.CHAT,
    prompt: config.prompt ?? '', // TODO: Set default chat prompt
    includeStageHistory: config.includeStageHistory ?? false,
    includeStageInfo: config.includeStageInfo ?? false,
  };
}

export function createAgentMediatorConfig(
  stageId: string, // ID of chat stage that agent should mediate
  config: Partial<AgentMediatorConfig> = {},
): AgentMediatorConfig {
  return {
    id: config.id ?? generateId(),
    stageId,
    name: config.name ?? 'Agent',
    avatar: config.avatar ?? '🤖',
    modelSettings: config.modelSettings ?? createAgentMediatorModelSettings(),
    promptSettings: config.promptSettings ?? createAgentChatPromptConfig(),
  };
}
