import { Type, type Static } from '@sinclair/typebox';
import { StageKind } from './stage';
import {
  StageGameSchema,
  StageProgressConfigSchema,
  StageTextConfigSchema,
} from './stage.validation';
import { ProfileType } from './profile_stage';

/** Shorthand for strict TypeBox object validation */
const strict = { additionalProperties: false } as const;

// ************************************************************************* //
// writeExperiment, updateStageConfig endpoints                              //
// ************************************************************************* //

/** ProfileStageConfig input validation. */
export const ProfileStageConfigData = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    kind: Type.Literal(StageKind.PROFILE),
    game: StageGameSchema,
    name: Type.String({ minLength: 1 }),
    descriptions: StageTextConfigSchema,
    progress: StageProgressConfigSchema,
    profileType: Type.Union([
      Type.Literal(ProfileType.DEFAULT),
      Type.Literal(ProfileType.ANONYMOUS_ANIMAL),
    ]),
  },
  strict,
);
