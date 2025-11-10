import {Type, type Static} from '@sinclair/typebox';
import {StageKind} from './stage';
import {
  StageProgressConfigSchema,
  StageTextConfigSchema,
} from './stage.validation';
import {ProfileType} from './profile_stage';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ************************************************************************* //
// writeExperiment, updateStageConfig endpoints                              //
// ************************************************************************* //

/** ProfileStageConfig input validation. */
export const ProfileStageConfigData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(StageKind.PROFILE),
    name: Type.String({minLength: 1}),
    descriptions: Type.Ref(StageTextConfigSchema),
    progress: Type.Ref(StageProgressConfigSchema),
    profileType: Type.Union([
      Type.Literal(ProfileType.DEFAULT),
      Type.Literal(ProfileType.DEFAULT_GENDERED),
      Type.Literal(ProfileType.ANONYMOUS_ANIMAL),
      Type.Literal(ProfileType.ANONYMOUS_PARTICIPANT),
    ]),
  },
  strict,
);
