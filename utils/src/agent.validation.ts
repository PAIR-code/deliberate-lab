/**
 * Agent validation schemas.
 *
 * These TypeBox schemas define the structure of agent-related types
 * for JSON Schema export and Python type generation.
 */
import {Type, type Static} from '@sinclair/typebox';
import {PromptItemData, PromptConfigData} from './prompt.validation';
import {ApiKeyTypeData} from './providers.validation';
import {ModelGenerationConfigData} from './providers.validation';
import {
  StructuredOutputConfigData,
  ChatMediatorStructuredOutputConfigData,
} from './structured_output.validation';
import {StageKindData} from './stages/stage.validation';
import {ParticipantProfileBaseData} from './participant.validation';

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
    defaultProfile: Type.Optional(ParticipantProfileBaseData),
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
// Test endpoint schemas
// ****************************************************************************

/** Test agent prompt config for testAgentConfig endpoint.
 * Uses the standard PromptConfigData (array of PromptItems) format.
 */
export const TestAgentPromptConfigData = Type.Object(
  {
    id: Type.String(),
    type: StageKindData,
    prompt: Type.Array(PromptItemData),
    generationConfig: ModelGenerationConfigData,
    structuredOutputConfig: Type.Union([
      StructuredOutputConfigData,
      ChatMediatorStructuredOutputConfigData,
    ]),
  },
  {$id: 'TestAgentPromptConfig', ...strict},
);

/** Schema for testAgentConfig endpoint. */
export const AgentConfigTestData = Type.Object(
  {
    creatorId: Type.String({minLength: 1}),
    agentConfig: AgentConfigData,
    promptConfig: TestAgentPromptConfigData,
  },
  {$id: 'AgentConfigTestData', ...strict},
);

export type AgentConfigTestData = Static<typeof AgentConfigTestData>;
