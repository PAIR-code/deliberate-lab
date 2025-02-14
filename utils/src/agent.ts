import {StageKind} from './stages/stage';

/** Agent types. */

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
  // Maximum total responses during the chat conversation
  maxTotalResponses: number;
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
