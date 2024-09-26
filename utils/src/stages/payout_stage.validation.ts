import { Type, type Static } from '@sinclair/typebox';
import { StageKind } from './stage';
import {
  StageGameSchema,
  StageProgressConfigSchema,
  StageTextConfigSchema
} from './stage.validation';

/** Shorthand for strict TypeBox object validation */
const strict = { additionalProperties: false } as const;

// ************************************************************************* //
// writeExperiment, updateStageConfig endpoints                              //
// ************************************************************************* //

/** PayoutStageConfig input validation. */
export const PayoutStageConfigData = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    kind: Type.Literal(StageKind.PAYOUT),
    game: StageGameSchema,
    name: Type.String({ minLength: 1 }),
    descriptions: StageTextConfigSchema,
    progress: StageProgressConfigSchema,
  },
  strict,
);
