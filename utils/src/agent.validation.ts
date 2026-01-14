/**
 * Agent validation schemas.
 *
 * These TypeBox schemas define the structure of agent-related types
 * for JSON Schema export and Python type generation.
 */
import {Type, type Static} from '@sinclair/typebox';
import {PromptConfigData} from './prompt.validation';
import {ApiKeyTypeData} from './providers.validation';

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

/** Agent mediator template. */
export const AgentMediatorTemplateData = Type.Object(
  {
    persona: AgentConfigData,
    promptMap: Type.Record(Type.String(), PromptConfigData),
  },
  {$id: 'AgentMediatorTemplate'},
);

/** Agent participant template. */
export const AgentParticipantTemplateData = Type.Object(
  {
    persona: AgentConfigData,
    promptMap: Type.Record(Type.String(), PromptConfigData),
  },
  {$id: 'AgentParticipantTemplate'},
);

// ****************************************************************************
// Test and data object schemas
// ****************************************************************************

/** Schema for testAgentConfig endpoint. */
export const AgentConfigTestData = Type.Object({
  creatorId: Type.String({minLength: 1}),
  agentConfig: AgentConfigData,
  promptConfig: PromptConfigData,
});

export type AgentConfigTestData = Static<typeof AgentConfigTestData>;

/** Schema for agent data objects */
export const AgentDataObjectData = Type.Object({
  persona: AgentConfigData,
  participantPromptMap: Type.Record(Type.String(), PromptConfigData),
  chatPromptMap: Type.Record(Type.String(), PromptConfigData),
});
