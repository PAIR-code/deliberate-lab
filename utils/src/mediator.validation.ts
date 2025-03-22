import {Type, type Static} from '@sinclair/typebox';
import {MediatorStatus} from './mediator';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ****************************************************************************
// updateMediatorStatus
// ****************************************************************************

/** updateMediatorStatus input validation. */
export const UpdateMediatorStatusData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    mediatorId: Type.String({minLength: 1}),
    status: Type.Union([
      Type.Literal(MediatorStatus.ACTIVE),
      Type.Literal(MediatorStatus.PAUSED),
      Type.Literal(MediatorStatus.DELETED),
    ]),
  },
  strict,
);

export type UpdateMediatorStatusData = Static<typeof UpdateMediatorStatusData>;
