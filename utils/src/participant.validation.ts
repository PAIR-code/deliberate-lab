
import { Type, type Static } from '@sinclair/typebox';

/** Shorthand for strict TypeBox object validation */
const strict = { additionalProperties: false } as const;

// ************************************************************************* //
// updateParticipantProfile endpoint                                         //
// ************************************************************************* //

/** ParticipantProfileBase input validation. */
export const ParticipantProfileBaseData = Type.Object(
  {
    pronouns: Type.Optional(Type.Union([Type.Null(), Type.String({ minLength: 1 })])),
    avatar: Type.Optional(Type.Union([Type.Null(), Type.String({ minLength: 1 })])),
    name: Type.Optional(Type.Union([Type.Null(), Type.String({ minLength: 1 })])),
  },
  strict,
);

export type ParticipantProfileBaseData = Static<typeof ParticipantProfileBaseData>;