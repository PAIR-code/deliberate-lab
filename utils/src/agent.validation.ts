import { Type, type Static } from '@sinclair/typebox';

/** Shorthand for strict TypeBox object validation */
const strict = { additionalProperties: false } as const;

// ****************************************************************************
// testAgentParticipantPrompt
// ****************************************************************************

/** AgentParticipantPromptTest input validation. */
export const AgentParticipantPromptTestData = Type.Object(
  {
    experimentId: Type.String({ minLength: 1 }),
    participantId: Type.String({ minLength: 1 }),
    stageId: Type.String({ minLength: 1 }),
  },
  strict,
);

export type AgentParticipantPromptTestData = Static<typeof AgentParticipantPromptTestData>;
