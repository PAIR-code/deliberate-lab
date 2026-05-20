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

// ****************************************************************************
// ackAlertMessage
// ****************************************************************************

/** AckAlertMessage input validation. */
export const AckAlertMessageData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    participantId: Type.String({minLength: 1}),
    alertId: Type.String({minLength: 1}),
    response: Type.String(),
  },
  strict,
);

export type AckAlertMessageData = Static<typeof AckAlertMessageData>;

// ****************************************************************************
// sendExperimenterAlert
// ****************************************************************************

/** SendExperimenterAlert input validation. */
export const SendExperimenterAlertData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    cohortId: Type.String(),
    stageId: Type.String(),
    participantId: Type.String({minLength: 1}),
    message: Type.String({minLength: 1}),
  },
  strict,
);

export type SendExperimenterAlertData = Static<
  typeof SendExperimenterAlertData
>;

// ****************************************************************************
// ackExperimenterAlert
// ****************************************************************************

/** AckExperimenterAlert input validation. */
export const AckExperimenterAlertData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    participantId: Type.String({minLength: 1}),
    alertId: Type.String({minLength: 1}),
  },
  strict,
);

export type AckExperimenterAlertData = Static<typeof AckExperimenterAlertData>;
