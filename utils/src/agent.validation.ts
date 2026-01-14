/**
 * Agent validation schemas.
 *
 * These TypeBox schemas define the structure of agent-related types
 * for JSON Schema export and Python type generation.
 */
import {Type, type Static} from '@sinclair/typebox';
import {
  PromptItemData,
  PromptItemGroupData,
  TextPromptItemData,
  ProfileInfoPromptItemData,
  ProfileContextPromptItemData,
  StageContextPromptItemData,
  PromptConfigData,
  ChatPromptConfigData,
  GenericPromptConfigData,
  AgentChatSettingsData,
} from './prompt.validation';
import {
  ApiKeyTypeData,
  ModelGenerationConfigData,
} from './providers.validation';
import {
  StructuredOutputConfigData,
  ChatMediatorStructuredOutputConfigData,
  StructuredOutputSchemaData,
} from './structured_output.validation';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

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
