import {Type, type Static} from '@sinclair/typebox';
import {StageKind} from './stage';
import {BaseStageConfigSchema} from './stage.schemas';
import {ProfileType} from './profile_stage';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ************************************************************************* //
// writeExperiment, updateStageConfig endpoints                              //
// ************************************************************************* //

/** ProfileStageConfig input validation. */
export const ProfileStageConfigData = Type.Composite(
  [
    BaseStageConfigSchema,
    Type.Object(
      {
        kind: Type.Literal(StageKind.PROFILE),
        profileType: Type.Union([
          Type.Literal(ProfileType.DEFAULT),
          Type.Literal(ProfileType.DEFAULT_GENDERED),
          Type.Literal(ProfileType.ANONYMOUS_ANIMAL),
          Type.Literal(ProfileType.ANONYMOUS_PARTICIPANT),
        ]),
      },
      strict,
    ),
  ],
  {$id: 'ProfileStageConfig', ...strict},
);
