/**
 * Centralized model configuration for all AI providers.
 * Update these defaults when new models are released.
 */

import {ApiKeyType} from './providers';

// Default model names for each provider
export const GEMINI_DEFAULT_MODEL = 'gemini-3-flash-preview';
export const OPENAI_DEFAULT_MODEL = 'gpt-5-mini-2025-08-07';
export const CLAUDE_DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
export const OLLAMA_DEFAULT_MODEL = 'ministral-3';

/**
 * Model option for UI dropdowns and selection.
 */
export interface ModelOption {
  id: string;
  displayName: string;
  apiType: ApiKeyType;
}

/**
 * Suggested Gemini models.
 */
export const GEMINI_MODELS: ModelOption[] = [
  {
    id: 'gemini-3-flash-preview',
    displayName: 'Gemini 3 Flash Preview',
    apiType: ApiKeyType.GEMINI_API_KEY,
  },
  {
    id: 'gemini-3-pro-preview',
    displayName: 'Gemini 3 Pro Preview',
    apiType: ApiKeyType.GEMINI_API_KEY,
  },
];

/**
 * Suggested OpenAI models.
 */
export const OPENAI_MODELS: ModelOption[] = [
  {
    id: 'gpt-5-mini',
    displayName: 'GPT-5 mini',
    apiType: ApiKeyType.OPENAI_API_KEY,
  },
];

/**
 * Suggested Claude models.
 */
export const CLAUDE_MODELS: ModelOption[] = [
  {
    id: 'claude-haiku-4-5-20251001',
    displayName: 'Claude Haiku 4.5',
    apiType: ApiKeyType.CLAUDE_API_KEY,
  },
];

/**
 * Suggested models grouped by provider.
 */
export const MODEL_OPTIONS: Record<ApiKeyType, ModelOption[]> = {
  [ApiKeyType.GEMINI_API_KEY]: GEMINI_MODELS,
  [ApiKeyType.OPENAI_API_KEY]: OPENAI_MODELS,
  [ApiKeyType.CLAUDE_API_KEY]: CLAUDE_MODELS,
  [ApiKeyType.OLLAMA_CUSTOM_URL]: [], // Ollama models are user-configured
};

/**
 * Get the default model name for a given API type.
 */
export function getDefaultModelForApiType(apiType: ApiKeyType): string {
  switch (apiType) {
    case ApiKeyType.GEMINI_API_KEY:
      return GEMINI_DEFAULT_MODEL;
    case ApiKeyType.OPENAI_API_KEY:
      return OPENAI_DEFAULT_MODEL;
    case ApiKeyType.CLAUDE_API_KEY:
      return CLAUDE_DEFAULT_MODEL;
    case ApiKeyType.OLLAMA_CUSTOM_URL:
      return OLLAMA_DEFAULT_MODEL;
    default:
      return GEMINI_DEFAULT_MODEL;
  }
}

/**
 * All default models by provider, for reference.
 */
export const DEFAULT_MODELS = {
  [ApiKeyType.GEMINI_API_KEY]: GEMINI_DEFAULT_MODEL,
  [ApiKeyType.OPENAI_API_KEY]: OPENAI_DEFAULT_MODEL,
  [ApiKeyType.CLAUDE_API_KEY]: CLAUDE_DEFAULT_MODEL,
  [ApiKeyType.OLLAMA_CUSTOM_URL]: OLLAMA_DEFAULT_MODEL,
} as const;
