import {Type, type Static} from '@sinclair/typebox';
import {StageKind} from './stage';
import {BaseStageConfigSchema} from './stage.schemas';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ************************************************************************* //
// writeExperiment, updateStageConfig endpoints                              //
// ************************************************************************* //

/** TOSStageConfig input validation. */
export const TOSStageConfigData = Type.Composite(
  [
    BaseStageConfigSchema,
    Type.Object(
      {
        kind: Type.Literal(StageKind.TOS),
        tosLines: Type.Array(Type.String()),
      },
      strict,
    ),
  ],
  {$id: 'TOSStageConfig', ...strict},
);
