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

/** TransferStageConfig input validation. */
export const TransferStageConfigData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(StageKind.TRANSFER),
    name: Type.String({minLength: 1}),
    descriptions: Type.Ref(StageTextConfigSchema),
    progress: Type.Ref(StageProgressConfigSchema),
    enableTimeout: Type.Boolean(),
    timeoutSeconds: Type.Number(),
  },
  strict,
);
