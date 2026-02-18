import {Type, type Static} from '@sinclair/typebox';
import {StageKind} from './stage';
import {BaseStageConfigSchema} from './stage.schemas';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ************************************************************************* //
// writeExperiment, updateStageConfig endpoints                              //
// ************************************************************************* //

/** InfoStageConfig input validation. */
export const InfoStageConfigData = Type.Composite(
  [
    BaseStageConfigSchema,
    Type.Object(
      {
        kind: Type.Literal(StageKind.INFO),
        infoLines: Type.Array(Type.String()),
        // Optional YouTube video ID to display
        youtubeVideoId: Type.Optional(Type.String()),
      },
      strict,
    ),
  ],
  {$id: 'InfoStageConfig', ...strict},
);
