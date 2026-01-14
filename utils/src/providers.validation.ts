/**
 * Provider and model validation schemas.
 *
 * These TypeBox schemas define the structure of provider and model-related types
 * for JSON Schema export and Python type generation.
 */
import {Type} from '@sinclair/typebox';
import {ApiKeyType} from './providers';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ****************************************************************************
// Enums
// ****************************************************************************

/** API key type enum - uses TypeScript enum for type compatibility */
export const ApiKeyTypeData = Type.Enum(ApiKeyType, {$id: 'ApiKeyType'});

/** Reasoning level enum */
export const ReasoningLevelData = Type.Union(
  [
    Type.Literal('off'),
    Type.Literal('minimal'),
    Type.Literal('low'),
    Type.Literal('medium'),
    Type.Literal('high'),
  ],
  {$id: 'ReasoningLevel'},
);

// ****************************************************************************
// Provider-specific options
// ****************************************************************************

/** Google thinking level */
export const GoogleThinkingLevelData = Type.Union(
  [
    Type.Literal('minimal'),
    Type.Literal('low'),
    Type.Literal('medium'),
    Type.Literal('high'),
  ],
  {$id: 'GoogleThinkingLevel'},
);

/** Google thinking config */
export const GoogleThinkingConfigData = Type.Object(
  {
    thinkingBudget: Type.Optional(Type.Number()),
    includeThoughts: Type.Optional(Type.Boolean()),
    thinkingLevel: Type.Optional(GoogleThinkingLevelData),
  },
  {$id: 'GoogleThinkingConfig', ...strict},
);

/** Google safety category */
export const GoogleSafetyCategoryData = Type.Union(
  [
    Type.Literal('HARM_CATEGORY_HARASSMENT'),
    Type.Literal('HARM_CATEGORY_DANGEROUS_CONTENT'),
    Type.Literal('HARM_CATEGORY_HATE_SPEECH'),
    Type.Literal('HARM_CATEGORY_SEXUALLY_EXPLICIT'),
    Type.Literal('HARM_CATEGORY_CIVIC_INTEGRITY'),
  ],
  {$id: 'GoogleSafetyCategory'},
);

/** Google safety threshold */
export const GoogleSafetyThresholdData = Type.Union(
  [
    Type.Literal('BLOCK_NONE'),
    Type.Literal('BLOCK_ONLY_HIGH'),
    Type.Literal('BLOCK_MEDIUM_AND_ABOVE'),
    Type.Literal('BLOCK_LOW_AND_ABOVE'),
    Type.Literal('HARM_BLOCK_THRESHOLD_UNSPECIFIED'),
  ],
  {$id: 'GoogleSafetyThreshold'},
);

/** Google safety setting */
export const GoogleSafetySettingData = Type.Object(
  {
    category: GoogleSafetyCategoryData,
    threshold: GoogleSafetyThresholdData,
  },
  {$id: 'GoogleSafetySetting', ...strict},
);

/** Google provider options */
export const GoogleProviderOptionsData = Type.Object(
  {
    thinkingConfig: Type.Optional(GoogleThinkingConfigData),
    safetySettings: Type.Optional(Type.Array(GoogleSafetySettingData)),
  },
  {$id: 'GoogleProviderOptions', ...strict},
);

/** Anthropic thinking type (enabled/disabled) */
export const AnthropicThinkingTypeData = Type.Union(
  [Type.Literal('enabled'), Type.Literal('disabled')],
  {$id: 'AnthropicThinkingType'},
);

/** Anthropic thinking config */
export const AnthropicThinkingConfigData = Type.Object(
  {
    type: AnthropicThinkingTypeData,
    budgetTokens: Type.Optional(Type.Number()),
  },
  {$id: 'AnthropicThinkingConfig', ...strict},
);

/** Reasoning effort level (used by Anthropic and OpenAI) */
export const ReasoningEffortData = Type.Union(
  [Type.Literal('low'), Type.Literal('medium'), Type.Literal('high')],
  {$id: 'ReasoningEffort'},
);

/** Anthropic cache TTL */
export const AnthropicCacheTtlData = Type.Union(
  [Type.Literal('5m'), Type.Literal('1h')],
  {$id: 'AnthropicCacheTtl'},
);

/** Anthropic cache control */
export const AnthropicCacheControlData = Type.Object(
  {
    type: Type.Literal('ephemeral'),
    ttl: Type.Optional(AnthropicCacheTtlData),
  },
  {$id: 'AnthropicCacheControl', ...strict},
);

/** Anthropic provider options */
export const AnthropicProviderOptionsData = Type.Object(
  {
    thinking: Type.Optional(AnthropicThinkingConfigData),
    effort: Type.Optional(ReasoningEffortData),
    cacheControl: Type.Optional(AnthropicCacheControlData),
    sendReasoning: Type.Optional(Type.Boolean()),
  },
  {$id: 'AnthropicProviderOptions', ...strict},
);

/** OpenAI provider options */
export const OpenAIProviderOptionsData = Type.Object(
  {
    reasoningEffort: Type.Optional(ReasoningEffortData),
    parallelToolCalls: Type.Optional(Type.Boolean()),
  },
  {$id: 'OpenAIProviderOptions', ...strict},
);

/** Ollama provider options */
export const OllamaProviderOptionsData = Type.Object(
  {
    numCtx: Type.Optional(Type.Number()),
    numPredict: Type.Optional(Type.Number()),
  },
  {$id: 'OllamaProviderOptions', ...strict},
);

/** Provider options map - keys match AI SDK provider IDs */
export const ProviderOptionsMapData = Type.Object(
  {
    google: Type.Optional(GoogleProviderOptionsData),
    anthropic: Type.Optional(AnthropicProviderOptionsData),
    openai: Type.Optional(OpenAIProviderOptionsData),
    ollama: Type.Optional(OllamaProviderOptionsData),
  },
  {$id: 'ProviderOptionsMap', ...strict},
);

// ****************************************************************************
// Model generation config
// ****************************************************************************

/** Custom request body field (legacy) */
export const CustomRequestBodyFieldData = Type.Object(
  {
    name: Type.String(),
    value: Type.String(),
  },
  strict,
);

/** Model generation config */
export const ModelGenerationConfigData = Type.Object(
  {
    // Universal settings
    maxTokens: Type.Optional(Type.Number()),
    stopSequences: Type.Optional(Type.Array(Type.String())),
    temperature: Type.Optional(Type.Number()),
    topP: Type.Optional(Type.Number()),
    frequencyPenalty: Type.Optional(Type.Number()),
    presencePenalty: Type.Optional(Type.Number()),
    // Reasoning settings
    reasoningLevel: Type.Optional(ReasoningLevelData),
    reasoningBudget: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
    includeReasoning: Type.Optional(Type.Boolean()),
    disableSafetyFilters: Type.Optional(Type.Boolean()),
    // Provider-specific options
    providerOptions: Type.Optional(ProviderOptionsMapData),
    // Legacy
    customRequestBodyFields: Type.Optional(
      Type.Array(CustomRequestBodyFieldData),
    ),
  },
  {$id: 'ModelGenerationConfig', ...strict},
);
