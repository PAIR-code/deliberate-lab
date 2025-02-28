import {Type, type Static} from '@sinclair/typebox';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ****************************************************************************
// sendAlertMessage
// ****************************************************************************

/** SendAlertMessage input validation. */
export const SendAlertMessageData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    cohortId: Type.String({minLength: 1}),
    stageId: Type.String({minLength: 1}),
    participantId: Type.String({minLength: 1}),
    message: Type.String({minLength: 1}),
  },
  strict,
);

export type SendAlertMessageData = Static<typeof SendAlertMessageData>;
