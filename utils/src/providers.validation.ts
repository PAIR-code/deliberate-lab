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
    // Provider-specific options (allow any structure)
    providerOptions: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
    // Legacy
    customRequestBodyFields: Type.Optional(
      Type.Array(CustomRequestBodyFieldData),
    ),
  },
  {$id: 'ModelGenerationConfig', ...strict},
);
