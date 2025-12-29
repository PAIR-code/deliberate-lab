import {
  ParticipantProfileBase,
  createParticipantProfileBase,
} from './participant';
import {generateId} from './shared';
import {StageKind} from './stages/stage';
import {
  ChatMediatorStructuredOutputConfig,
  createStructuredOutputConfig,
} from './structured_output';
import {
  MediatorPromptConfig,
  ParticipantPromptConfig,
} from './structured_prompt';
import {ApiKeyType, ProviderOptionsMap} from './providers';

/** Agent types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //
export interface CustomRequestBodyField {
  name: string;
  value: string;
}

/** Agent config applied to ParticipantProfile or MediatorProfile. */
// promptContext and modelSettings are copied over from persona configs
export interface ProfileAgentConfig {
  agentId: string; // ID of agent persona used
  promptContext: string; // Additional text to concatenate to agent prompts
  modelSettings: AgentModelSettings;
}

/** Reasoning level - mapped to provider-specific options by backend */
export type ReasoningLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high';

/** Generation config for a specific stage's model call. */
// TODO: Move to structured_prompt.ts
export interface ModelGenerationConfig {
  // === Universal settings (work across all providers) ===
  maxTokens: number; // Max tokens per model call response
  stopSequences: string[];
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;

  // === Universal reasoning settings ===
  // These are mapped to provider-specific options by the backend.
  // Google docs: https://ai.google.dev/gemini-api/docs/thinking
  //   - Gemini 3: use reasoningLevel (maps to thinkingLevel)
  //   - Gemini 2.5: use reasoningBudget (maps to thinkingBudget)
  // Anthropic: reasoningLevel maps to effort, reasoningBudget maps to thinking.budgetTokens
  // OpenAI: reasoningLevel maps to reasoningEffort (for o1/o3 models)

  /** Reasoning depth level - maps to thinkingLevel (Gemini 3), effort (Anthropic), reasoningEffort (OpenAI) */
  reasoningLevel?: ReasoningLevel;
  /** Max tokens for reasoning - maps to thinkingBudget (Gemini 2.5), budgetTokens (Anthropic) */
  reasoningBudget?: number;
  /** Include reasoning/thoughts in response - maps to includeThoughts (Google), sendReasoning (Anthropic) */
  includeReasoning?: boolean;
  /** Disable safety filters - Google only, uses BLOCK_NONE instead of BLOCK_ONLY_HIGH */
  disableSafetyFilters?: boolean;

  // === Provider-specific options (for unique features only) ===
  // Use this for provider-specific settings that don't have a universal equivalent,
  // like Google's imageConfig or Anthropic's container settings.
  providerOptions?: ProviderOptionsMap;

  // === Legacy (kept for backward compatibility) ===
  // TODO(mkbehr): Add response MIME type and schema
  // Maybe now captured by StructuredOutputConfig and providerOptions?
  customRequestBodyFields: CustomRequestBodyField[];
}

/** Model settings for a specific agent. */
export interface AgentModelSettings {
  apiType: ApiKeyType;
  modelName: string;
}

// TODO: Move to structured_prompt.ts
export interface AgentPromptSettings {
  // Number of times to retry prompt call if it fails
  numRetries: number;
  // Whether or not to include context from all previously completed
  // stages
  includeStageHistory: boolean;
  // Whether or not to include information (stage description/info/help)
  // shown to users
  includeStageInfo: boolean;
}

/** Model settings for agent in a chat discussion. */
export interface AgentChatSettings {
  // Agent's "typing speed" during the chat conversation
  // or null to automatically send
  wordsPerMinute: number | null;
  // Number of chat messages that must exist before the agent can respond
  minMessagesBeforeResponding: number;
  // Whether the agent can respond multiple times in a row
  // (i.e., whether an agent's own message can trigger a new model call)
  canSelfTriggerCalls: boolean;
  // Maximum total responses agent can make during the chat conversation
  // (or null if no max)
  maxResponses: number | null;
  // Initial message to send when the conversation begins
  initialMessage: string;
}

/** Specifies how prompt should be sent to API. */
export interface BaseAgentPromptConfig {
  id: string; // stage ID
  type: StageKind; // stage type
  promptContext: string; // custom prompt content
  generationConfig: ModelGenerationConfig;
  promptSettings: AgentPromptSettings;
  structuredOutputConfig: ChatMediatorStructuredOutputConfig;
}

/** Prompt config for sending chat messages
 * (sent to specified API on stage's chat trigger)
 */
export interface AgentChatPromptConfig extends BaseAgentPromptConfig {
  chatSettings: AgentChatSettings;
}

export enum AgentPersonaType {
  PARTICIPANT = 'participant',
  MEDIATOR = 'mediator',
}

/** Top-level agent persona config (basically, template for agents). */
export type AgentPersonaConfig =
  | AgentMediatorPersonaConfig
  | AgentParticipantPersonaConfig;

export interface BaseAgentPersonaConfig {
  id: string;
  // Viewable only to experimenters
  name: string;
  // Viewable only to experimenters
  description: string;
  // Agent persona type
  type: AgentPersonaType;
  // If true, add to cohort on cohort creation
  isDefaultAddToCohort: boolean;
  defaultProfile: ParticipantProfileBase;
  defaultModelSettings: AgentModelSettings;
}

export interface AgentParticipantPersonaConfig extends BaseAgentPersonaConfig {
  type: AgentPersonaType.PARTICIPANT;
}

export interface AgentMediatorPersonaConfig extends BaseAgentPersonaConfig {
  type: AgentPersonaType.MEDIATOR;
}

/** Format used to send agent data from frontend to backend. */
export interface AgentDataObject {
  persona: AgentPersonaConfig;
  // Maps from stage ID to prompt for completing stage
  participantPromptMap: Record<string, ParticipantPromptConfig>;
  // Maps from stage ID to prompt for sending chat messages
  chatPromptMap: Record<string, AgentChatPromptConfig>;
}

// TODO: Refactor to support new mediator and participant prompt configs
export interface AgentMediatorTemplate {
  persona: AgentMediatorPersonaConfig;
  // Maps from stage ID to prompt
  promptMap: Record<string, MediatorPromptConfig>;
}

export interface AgentParticipantTemplate {
  persona: AgentParticipantPersonaConfig;
  // Maps from stage ID to prompt
  promptMap: Record<string, ParticipantPromptConfig>;
}

// ************************************************************************* //
// CONSTANTS                                                                 //
// ************************************************************************* //
export const DEFAULT_AGENT_API_TYPE = ApiKeyType.GEMINI_API_KEY;

export const DEFAULT_AGENT_API_MODEL = 'gemini-2.5-flash';

export const DEFAULT_AGENT_MODEL_SETTINGS: AgentModelSettings = {
  apiType: DEFAULT_AGENT_API_TYPE,
  modelName: DEFAULT_AGENT_API_MODEL,
};

// Use this ID when defining agent participants in experiment dashboard
export const DEFAULT_AGENT_PARTICIPANT_ID = '';

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
    // Universal settings
    maxTokens: config.maxTokens ?? 8192,
    stopSequences: config.stopSequences ?? [],
    temperature: config.temperature ?? 1.0,
    topP: config.topP ?? 1.0,
    frequencyPenalty: config.frequencyPenalty ?? 0.0,
    presencePenalty: config.presencePenalty ?? 0.0,
    // Universal reasoning settings
    reasoningLevel: config.reasoningLevel,
    reasoningBudget: config.reasoningBudget,
    includeReasoning: config.includeReasoning ?? false,
    disableSafetyFilters: config.disableSafetyFilters ?? false,
    // Provider-specific options
    providerOptions: config.providerOptions,
    // Legacy
    customRequestBodyFields: config.customRequestBodyFields ?? [],
  };
}

export function createAgentChatSettings(
  config: Partial<AgentChatSettings> = {},
): AgentChatSettings {
  return {
    wordsPerMinute: config.wordsPerMinute ?? null,
    minMessagesBeforeResponding: config.minMessagesBeforeResponding ?? 0,
    canSelfTriggerCalls: config.canSelfTriggerCalls ?? false,
    maxResponses: config.maxResponses ?? 100,
    initialMessage: config.initialMessage ?? '',
  };
}

export function createAgentPromptSettings(
  config: Partial<AgentPromptSettings> = {},
): AgentPromptSettings {
  return {
    numRetries: config.numRetries ?? 0,
    includeStageHistory: config.includeStageHistory ?? true,
    includeStageInfo: config.includeStageInfo ?? true,
  };
}

export function createAgentMediatorPersonaConfig(
  config: Partial<AgentPersonaConfig> = {},
): AgentMediatorPersonaConfig {
  return {
    id: config.id ?? generateId(),
    name: config.name ?? 'Agent Mediator',
    description: config.description ?? '',
    type: AgentPersonaType.MEDIATOR,
    isDefaultAddToCohort: config.isDefaultAddToCohort ?? true,
    defaultProfile:
      config.defaultProfile ??
      createParticipantProfileBase({
        name: 'Mediator',
        avatar: '🤖',
      }),
    defaultModelSettings:
      config.defaultModelSettings ?? createAgentModelSettings(),
  };
}

export function createAgentParticipantPersonaConfig(
  config: Partial<AgentPersonaConfig> = {},
): AgentParticipantPersonaConfig {
  return {
    id: config.id ?? generateId(),
    name: config.name ?? 'Agent Participant',
    description: config.description ?? '',
    type: AgentPersonaType.PARTICIPANT,
    isDefaultAddToCohort: config.isDefaultAddToCohort ?? false,
    defaultProfile:
      config.defaultProfile ??
      createParticipantProfileBase({
        name: 'Participant',
        avatar: '🙋',
      }),
    defaultModelSettings:
      config.defaultModelSettings ?? createAgentModelSettings(),
  };
}
