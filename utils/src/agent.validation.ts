import {Type, type Static} from '@sinclair/typebox';

// ****************************************************************************
// testAgentConfig
// ****************************************************************************

export const AgentConfigData = Type.Object({
  id: Type.String({minLength: 1}),
  name: Type.String(),
  // TODO: Add other AgentPersonaConfig fields
});

export const PromptConfigData = Type.Object({
  id: Type.String({minLength: 1}),
  promptContext: Type.String(),
  // TODO: Add other BaseAgentPromptConfig fields
});

/** AgentConfigTest input validation. */
export const AgentConfigTestData = Type.Object({
  creatorId: Type.String({minLength: 1}),
  agentConfig: AgentConfigData,
  promptConfig: PromptConfigData,
});

export type AgentConfigTestData = Static<typeof AgentConfigTestData>;

// ****************************************************************************
// AgentDataObject
// ****************************************************************************
export const AgentDataObjectData = Type.Object({
  persona: AgentConfigData,
  participantPromptMap: Type.Record(Type.String(), PromptConfigData),
  chatPromptMap: Type.Record(Type.String(), PromptConfigData),
});

export const AgentMediatorTemplateData = Type.Object(
  {
    persona: AgentConfigData,
    promptMap: Type.Record(Type.String(), Type.Object({})),
  },
  {$id: 'AgentMediatorTemplate'},
);

export const AgentParticipantTemplateData = Type.Object(
  {
    persona: AgentConfigData,
    promptMap: Type.Record(Type.String(), Type.Object({})),
  },
  {$id: 'AgentParticipantTemplate'},
);
