/**
 * Provider types for AI SDK integration.
 *
 * This file provides:
 * - ApiKeyType enum for provider selection
 * - Provider option types for provider-specific overrides in ModelGenerationConfig
 *
 * Universal fields in ModelGenerationConfig (reasoningLevel, reasoningBudget,
 * includeReasoning, disableSafetyFilters) are mapped to provider-specific
 * options by the backend. The providerOptions field is for provider-specific
 * overrides only (e.g., Google's imageConfig).
 */

// ============================================================================
// API KEY TYPE
// ============================================================================

/** Specifies which API to use for model calls. */
export enum ApiKeyType {
  GEMINI_API_KEY = 'GEMINI',
  OPENAI_API_KEY = 'OPENAI',
  CLAUDE_API_KEY = 'CLAUDE',
  OLLAMA_CUSTOM_URL = 'OLLAMA',
}

// ============================================================================
// PROVIDER OPTION TYPES (for provider-specific overrides)
// ============================================================================

/** Google/Gemini-specific provider options */
export interface GoogleProviderOptions {
  thinkingConfig?: {
    thinkingBudget?: number;
    includeThoughts?: boolean;
    thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
  };
  safetySettings?: Array<{
    category:
      | 'HARM_CATEGORY_HARASSMENT'
      | 'HARM_CATEGORY_DANGEROUS_CONTENT'
      | 'HARM_CATEGORY_HATE_SPEECH'
      | 'HARM_CATEGORY_SEXUALLY_EXPLICIT'
      | 'HARM_CATEGORY_CIVIC_INTEGRITY';
    threshold:
      | 'BLOCK_NONE'
      | 'BLOCK_ONLY_HIGH'
      | 'BLOCK_LOW_AND_ABOVE'
      | 'BLOCK_MEDIUM_AND_ABOVE';
  }>;
  responseModalities?: ('TEXT' | 'IMAGE')[];
  structuredOutputs?: boolean;
  imageConfig?: {
    aspectRatio?:
      | '1:1'
      | '2:3'
      | '3:2'
      | '3:4'
      | '4:3'
      | '4:5'
      | '5:4'
      | '9:16'
      | '16:9'
      | '21:9';
    imageSize?: '1K' | '2K' | '4K';
  };
  mediaResolution?:
    | 'MEDIA_RESOLUTION_LOW'
    | 'MEDIA_RESOLUTION_MEDIUM'
    | 'MEDIA_RESOLUTION_HIGH';
}

/** Anthropic/Claude-specific provider options */
export interface AnthropicProviderOptions {
  thinking?: {
    type: 'enabled' | 'disabled';
    budgetTokens?: number;
  };
  effort?: 'low' | 'medium' | 'high';
  cacheControl?: {
    type: 'ephemeral';
    ttl?: '5m' | '1h';
  };
  sendReasoning?: boolean;
}

/** OpenAI-specific provider options */
export interface OpenAIProviderOptions {
  reasoningEffort?: 'low' | 'medium' | 'high';
  parallelToolCalls?: boolean;
}

/** Ollama-specific provider options */
export interface OllamaProviderOptions {
  numCtx?: number;
  numPredict?: number;
}

/** Provider options map - keys match AI SDK provider IDs */
export interface ProviderOptionsMap {
  google?: GoogleProviderOptions;
  anthropic?: AnthropicProviderOptions;
  openai?: OpenAIProviderOptions;
  ollama?: OllamaProviderOptions;
}

// ============================================================================
// MODEL CAPABILITY UTILITIES
// ============================================================================

/**
 * Returns true if the model always uses thinking/reasoning regardless of config.
 */
export function isAlwaysThinkingModel(modelName?: string): boolean {
  if (!modelName) return false;
  // Gemini 3 models do not have a non-thinking mode.
  return modelName.includes('gemini-3');
}

/**
 * Returns true if the model does not support native JSON Schema structured output.
 * These models should use JSON_FORMAT mode instead of JSON_SCHEMA.
 */
export function isJsonSchemaUnsupportedModel(modelName?: string): boolean {
  if (!modelName) return false;
  // Known models that don't support JSON Schema (exact match):
  const unsupportedModels = ['gemini-2.5-flash-image'];
  return unsupportedModels.includes(modelName);
}
