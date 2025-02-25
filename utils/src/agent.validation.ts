import {Type, type Static} from '@sinclair/typebox';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ****************************************************************************
// testAgentParticipantPrompt
// ****************************************************************************

/** AgentParticipantPromptTest input validation. */
export const AgentParticipantPromptTestData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    participantId: Type.String({minLength: 1}),
    stageId: Type.String({minLength: 1}),
  },
  strict,
);

export type AgentParticipantPromptTestData = Static<
  typeof AgentParticipantPromptTestData
>;

// ****************************************************************************
// testAgentConfig
// ****************************************************************************

export const AgentConfigData = Type.Object({
  id: Type.String({minLength: 1}),
  name: Type.String(),
  avatar: Type.String(),
  // TODO: Add other agent config fields
});

/** AgentConfigTest input validation. */
export const AgentConfigTestData = Type.Object({
  creatorId: Type.String({minLength: 1}),
  agentConfig: AgentConfigData,
});

export type AgentConfigTestData = Static<typeof AgentConfigTestData>;
