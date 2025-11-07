import {Type, type Static} from '@sinclair/typebox';
import {StageKind} from './stage';
import {
  StageTextConfigSchema,
  StageProgressConfigSchema,
} from './stage.validation';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ************************************************************************* //
// writeExperiment, updateStageConfig endpoints                              //
// ************************************************************************* //

/** TOSStageConfig input validation. */
export const TOSStageConfigData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(StageKind.TOS),
    name: Type.String({minLength: 1}),
    descriptions: Type.Ref(StageTextConfigSchema),
    progress: Type.Ref(StageProgressConfigSchema),
    tosLines: Type.Array(Type.String()),
  },
  strict,
);
