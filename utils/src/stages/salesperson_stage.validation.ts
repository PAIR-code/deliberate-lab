import {Type, type Static} from '@sinclair/typebox';
import {UnifiedTimestampSchema} from '../shared.validation';
import {StageKind} from './stage';
import {
  StageGameSchema,
  StageTextConfigSchema,
  StageProgressConfigSchema,
} from './stage.validation';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

export const SalespersonStageConfigData = Type.Object({
  id: Type.String(),
  kind: Type.Literal(StageKind.SALESPERSON),
  game: StageGameSchema,
  name: Type.String(),
  descriptions: StageTextConfigSchema,
  progress: StageProgressConfigSchema,
  // TODO: Add board
});

/** setSalespersonController endpoint data validation. */
export const SetSalespersonControllerData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    cohortId: Type.String({minLength: 1}),
    stageId: Type.String({minLength: 1}),
  },
  strict,
);

export type SetSalespersonControllerData = Static<
  typeof SetSalespersonControllerData
>;

/** setSalespersonMove endpoint data validation. */
export const SetSalespersonMoveData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    cohortId: Type.String({minLength: 1}),
    stageId: Type.String({minLength: 1}),
    participantId: Type.String({minLength: 1}),
    proposedColumn: Type.Number(),
    proposedRow: Type.Number(),
  },
  strict,
);

export type SetSalespersonMoveData = Static<typeof SetSalespersonMoveData>;

/** setSalespersonResponse endpoint data validation. */
export const SetSalespersonResponseData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    cohortId: Type.String({minLength: 1}),
    stageId: Type.String({minLength: 1}),
    participantId: Type.String({minLength: 1}),
    response: Type.Boolean(),
  },
  strict,
);

export type SetSalespersonResponseData = Static<
  typeof SetSalespersonResponseData
>;
