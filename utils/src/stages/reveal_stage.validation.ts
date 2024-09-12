import { Type, type Static } from '@sinclair/typebox';
import { StageKind } from './stage';
import { StageGameSchema, StageTextConfigSchema } from './stage.validation';

/** Shorthand for strict TypeBox object validation */
const strict = { additionalProperties: false } as const;

// ************************************************************************* //
// writeExperiment, updateStageConfig endpoints                              //
// ************************************************************************* //

/** RevealStageConfig input validation. */
export const RevealStageConfigData = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    kind: Type.Literal(StageKind.REVEAL),
    game: StageGameSchema,
    name: Type.String({ minLength: 1 }),
    descriptions: StageTextConfigSchema,
    stageIds: Type.Array(Type.String({ minLength: 1})),
  },
  strict,
);
