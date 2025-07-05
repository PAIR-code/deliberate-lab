import {Type, type Static} from '@sinclair/typebox';
import {StageKind} from './stage';
import {
  StageProgressConfigSchema,
  StageTextConfigSchema,
} from './stage.validation';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ************************************************************************* //
// writeExperiment, updateStageConfig endpoints                              //
// ************************************************************************* //

/** InfoStageConfig input validation. */
export const InfoStageConfigData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(StageKind.INFO),
    name: Type.String({minLength: 1}),
    descriptions: StageTextConfigSchema,
    progress: StageProgressConfigSchema,
    infoLines: Type.Array(Type.String()),
  },
  strict,
);
