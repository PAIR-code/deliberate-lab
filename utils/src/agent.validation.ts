import {Type, type Static} from '@sinclair/typebox';
import {ShuffleConfigData} from './variables.validation';
import {ConditionSchema} from './utils/condition.validation';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ****************************************************************************
// Enums
// ****************************************************************************

/** API key type enum values matching ApiKeyType in providers.ts */
export const ApiKeyTypeData = Type.Union(
  [
    Type.Literal('GEMINI'),
    Type.Literal('OPENAI'),
    Type.Literal('CLAUDE'),
    Type.Literal('OLLAMA'),
  ],
  {$id: 'ApiKeyType'},
);

/** Stage kind enum matching StageKind in stages/stage.ts */
export const StageKindData = Type.Union(
  [
    Type.Literal('info'),
    Type.Literal('tos'),
    Type.Literal('profile'),
    Type.Literal('chat'),
    Type.Literal('chip'),
    Type.Literal('comprehension'),
    Type.Literal('flipcard'),
    Type.Literal('ranking'),
    Type.Literal('payout'),
    Type.Literal('privateChat'),
    Type.Literal('reveal'),
    Type.Literal('salesperson'),
    Type.Literal('stockinfo'),
    Type.Literal('assetAllocation'),
    Type.Literal('multiAssetAllocation'),
    Type.Literal('role'),
    Type.Literal('survey'),
    Type.Literal('surveyPerParticipant'),
    Type.Literal('transfer'),
  ],
  {$id: 'StageKind'},
);

/** Prompt item type enum matching PromptItemType */
export const PromptItemTypeData = Type.Union(
  [
    Type.Literal('TEXT'),
    Type.Literal('PROFILE_INFO'),
    Type.Literal('PROFILE_CONTEXT'),
    Type.Literal('STAGE_CONTEXT'),
    Type.Literal('GROUP'),
  ],
  {$id: 'PromptItemType'},
);

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

/** Structured output type enum */
export const StructuredOutputTypeData = Type.Union(
  [
    Type.Literal('NONE'),
    Type.Literal('JSON_FORMAT'),
    Type.Literal('JSON_SCHEMA'),
  ],
  {$id: 'StructuredOutputType'},
);

/** Structured output data type enum */
export const StructuredOutputDataTypeData = Type.Union(
  [
    Type.Literal('STRING'),
    Type.Literal('NUMBER'),
    Type.Literal('INTEGER'),
    Type.Literal('BOOLEAN'),
    Type.Literal('ARRAY'),
    Type.Literal('OBJECT'),
    Type.Literal('ENUM'),
  ],
  {$id: 'StructuredOutputDataType'},
);

/** Condition operator enum */
export const ConditionOperatorData = Type.Union(
  [Type.Literal('and'), Type.Literal('or')],
  {$id: 'ConditionOperator'},
);

/** Comparison operator enum */
export const ComparisonOperatorData = Type.Union(
  [
    Type.Literal('equals'),
    Type.Literal('not_equals'),
    Type.Literal('greater_than'),
    Type.Literal('greater_than_or_equal'),
    Type.Literal('less_than'),
    Type.Literal('less_than_or_equal'),
    Type.Literal('contains'),
    Type.Literal('not_contains'),
  ],
  {$id: 'ComparisonOperator'},
);

// ****************************************************************************
// Basic types
// ****************************************************************************

/** Model settings for agent - determines which API and model to use */
export const AgentModelSettingsData = Type.Object(
  {
    apiType: ApiKeyTypeData,
    modelName: Type.String(),
  },
  {$id: 'AgentModelSettings', ...strict},
);

// ****************************************************************************
// Prompt items
// ****************************************************************************

/** Base prompt item fields */
const BasePromptItemFields = {
  condition: Type.Optional(ConditionSchema),
};

/** Text prompt item */
export const TextPromptItemData = Type.Object(
  {
    type: Type.Literal('TEXT'),
    text: Type.String(),
    ...BasePromptItemFields,
  },
  {$id: 'TextPromptItem', ...strict},
);

/** Profile info prompt item */
export const ProfileInfoPromptItemData = Type.Object(
  {
    type: Type.Literal('PROFILE_INFO'),
    ...BasePromptItemFields,
  },
  {$id: 'ProfileInfoPromptItem', ...strict},
);

/** Profile context prompt item */
export const ProfileContextPromptItemData = Type.Object(
  {
    type: Type.Literal('PROFILE_CONTEXT'),
    ...BasePromptItemFields,
  },
  {$id: 'ProfileContextPromptItem', ...strict},
);

/** Stage context prompt item */
export const StageContextPromptItemData = Type.Object(
  {
    type: Type.Literal('STAGE_CONTEXT'),
    stageId: Type.String(),
    includePrimaryText: Type.Boolean(),
    includeInfoText: Type.Boolean(),
    includeHelpText: Type.Boolean(),
    includeStageDisplay: Type.Boolean(),
    includeParticipantAnswers: Type.Boolean(),
    ...BasePromptItemFields,
  },
  {$id: 'StageContextPromptItem', ...strict},
);

/** Prompt item group (recursive) */
export const PromptItemGroupData: ReturnType<typeof Type.Object> = Type.Object(
  {
    type: Type.Literal('GROUP'),
    title: Type.String(),
    items: Type.Array(
      Type.Union([
        TextPromptItemData,
        ProfileInfoPromptItemData,
        ProfileContextPromptItemData,
        StageContextPromptItemData,
        Type.Unsafe<Static<typeof PromptItemGroupData>>({$ref: '#'}),
      ]),
    ),
    shuffleConfig: Type.Optional(ShuffleConfigData),
    ...BasePromptItemFields,
  },
  {$id: 'PromptItemGroup', ...strict},
);

/** Union of all prompt item types */
export const PromptItemData = Type.Union([
  TextPromptItemData,
  ProfileInfoPromptItemData,
  ProfileContextPromptItemData,
  StageContextPromptItemData,
  PromptItemGroupData,
]);

// ****************************************************************************
// Generation and output configs
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

/** Structured output schema property */
export const StructuredOutputSchemaPropertyData: ReturnType<
  typeof Type.Object
> = Type.Object(
  {
    name: Type.String(),
    // Reference StructuredOutputSchema by $id (not '#' which would be self-reference)
    schema: Type.Unsafe<Static<typeof StructuredOutputSchemaData>>({
      $ref: 'StructuredOutputSchema',
    }),
  },
  {$id: 'StructuredOutputSchemaProperty', ...strict},
);

/** Structured output schema (recursive) */
export const StructuredOutputSchemaData: ReturnType<typeof Type.Object> =
  Type.Object(
    {
      type: StructuredOutputDataTypeData,
      description: Type.Optional(Type.String()),
      properties: Type.Optional(Type.Array(StructuredOutputSchemaPropertyData)),
      arrayItems: Type.Optional(
        Type.Unsafe<Static<typeof StructuredOutputSchemaData>>({$ref: '#'}),
      ),
      enumItems: Type.Optional(Type.Array(Type.String())),
    },
    {$id: 'StructuredOutputSchema', ...strict},
  );

/** Generic structured output config.
 * Defines a schema for the model to return JSON, which can be extracted as needed.
 * Use this for general-purpose structured output or when structured output is disabled.
 */
export const StructuredOutputConfigData = Type.Object(
  {
    enabled: Type.Boolean(),
    type: StructuredOutputTypeData,
    schema: Type.Optional(StructuredOutputSchemaData),
    appendToPrompt: Type.Boolean(),
  },
  {$id: 'StructuredOutputConfig', ...strict},
);

/** Specialized structured output config for chat mediators.
 * Extends base config with pre-baked field mappings that the chat agent code
 * uses to control mediator behavior:
 * - shouldRespondField: which JSON field indicates if the mediator wants to respond
 * - messageField: which JSON field contains the message content
 * - explanationField: which JSON field contains the decision explanation
 * - readyToEndField: which JSON field indicates if the mediator is done
 *
 * See extractChatMediatorStructuredFields() in structured_output.ts for usage.
 */
export const ChatMediatorStructuredOutputConfigData = Type.Object(
  {
    enabled: Type.Boolean(),
    type: StructuredOutputTypeData,
    schema: Type.Optional(StructuredOutputSchemaData),
    appendToPrompt: Type.Boolean(),
    shouldRespondField: Type.String(),
    messageField: Type.String(),
    explanationField: Type.String(),
    readyToEndField: Type.String(),
  },
  {$id: 'ChatMediatorStructuredOutputConfig', ...strict},
);

// ****************************************************************************
// Agent chat settings
// ****************************************************************************

/** Agent chat settings */
export const AgentChatSettingsData = Type.Object(
  {
    wordsPerMinute: Type.Union([Type.Number(), Type.Null()]),
    minMessagesBeforeResponding: Type.Number(),
    canSelfTriggerCalls: Type.Boolean(),
    maxResponses: Type.Union([Type.Number(), Type.Null()]),
    initialMessage: Type.String(),
  },
  {$id: 'AgentChatSettings', ...strict},
);

// ****************************************************************************
// Prompt configs
// ****************************************************************************

/** Base prompt config fields */
const BasePromptConfigFields = {
  id: Type.String({minLength: 1}),
  type: StageKindData,
  prompt: Type.Array(PromptItemData),
  includeScaffoldingInPrompt: Type.Optional(Type.Boolean()),
  numRetries: Type.Optional(Type.Number()),
  generationConfig: Type.Optional(ModelGenerationConfigData),
  structuredOutputConfig: Type.Optional(StructuredOutputConfigData),
};

/** Prompt config for chat and privateChat stages.
 * structuredOutputConfig accepts either:
 * - StructuredOutputConfig: for generic/disabled structured output
 * - ChatMediatorStructuredOutputConfig: for pre-baked mediator behavior extraction
 */
export const ChatPromptConfigData = Type.Object(
  {
    ...BasePromptConfigFields,
    type: Type.Union([Type.Literal('chat'), Type.Literal('privateChat')]),
    structuredOutputConfig: Type.Optional(
      Type.Union([
        StructuredOutputConfigData,
        ChatMediatorStructuredOutputConfigData,
      ]),
    ),
    chatSettings: Type.Optional(AgentChatSettingsData),
  },
  {$id: 'ChatPromptConfig', ...strict},
);

/** Generic prompt config (for non-chat stages) */
export const GenericPromptConfigData = Type.Object(
  {
    ...BasePromptConfigFields,
  },
  {$id: 'GenericPromptConfig', ...strict},
);

/** Union of all prompt config types */
export const PromptConfigData = Type.Union([
  ChatPromptConfigData,
  GenericPromptConfigData,
]);

// ****************************************************************************
// Agent persona and templates
// ****************************************************************************

/** Agent persona config */
export const AgentConfigData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    name: Type.String(),
    defaultModelSettings: Type.Optional(AgentModelSettingsData),
  },
  {$id: 'Persona', ...strict},
);

/** Agent mediator template.
 * NOTE: promptMap uses permissive Type.Object({}) to maintain compatibility
 * with TypeScript interfaces. Detailed prompt validation is done separately.
 */
export const AgentMediatorTemplateData = Type.Object(
  {
    persona: AgentConfigData,
    promptMap: Type.Record(Type.String(), Type.Object({})),
  },
  {$id: 'AgentMediatorTemplate'},
);

/** Agent participant template.
 * NOTE: promptMap uses permissive Type.Object({}) to maintain compatibility
 * with TypeScript interfaces. Detailed prompt validation is done separately.
 */
export const AgentParticipantTemplateData = Type.Object(
  {
    persona: AgentConfigData,
    promptMap: Type.Record(Type.String(), Type.Object({})),
  },
  {$id: 'AgentParticipantTemplate'},
);

// ****************************************************************************
// Test and data object schemas
// ****************************************************************************

/** Schema for testAgentConfig endpoint.
 * NOTE: promptConfig uses permissive Type.Object({}) to maintain compatibility
 * with the legacy BaseAgentPromptConfig interface used by the frontend.
 */
export const AgentConfigTestData = Type.Object({
  creatorId: Type.String({minLength: 1}),
  agentConfig: AgentConfigData,
  promptConfig: Type.Object({}),
});

export type AgentConfigTestData = Static<typeof AgentConfigTestData>;

/** Schema for agent data objects */
export const AgentDataObjectData = Type.Object({
  persona: AgentConfigData,
  participantPromptMap: Type.Record(Type.String(), PromptConfigData),
  chatPromptMap: Type.Record(Type.String(), PromptConfigData),
});

/**
 * Collection of agent schemas for export-schemas.ts to collect.
 * These schemas are not reachable from the top-level ExperimentCreationData
 * because AgentMediatorTemplateData.promptMap uses Type.Object({}) for
 * TypeScript compatibility. This collection ensures they're still exported.
 */
export const AGENT_SCHEMAS = [
  PromptConfigData,
  ChatPromptConfigData,
  GenericPromptConfigData,
  StructuredOutputConfigData,
  ChatMediatorStructuredOutputConfigData,
  AgentChatSettingsData,
  ModelGenerationConfigData,
  PromptItemData,
  TextPromptItemData,
  ProfileInfoPromptItemData,
  ProfileContextPromptItemData,
  StageContextPromptItemData,
  PromptItemGroupData,
  StructuredOutputSchemaData,
];
