import {Type, type Static} from '@sinclair/typebox';
import {StageKind} from './stage';
import {
  StageProgressConfigSchema,
  StageTextConfigSchema,
} from './stage.validation';
import {RevealAudience} from './reveal_stage';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ************************************************************************* //
// writeExperiment, updateStageConfig endpoints                              //
// ************************************************************************* //

/** Ranking reveal item input validation. */
export const RankingRevealItemData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(StageKind.REVEAL),
    revealAudience: Type.Union([
      Type.Literal(RevealAudience.CURRENT_PARTICIPANT),
      Type.Literal(RevealAudience.ALL_PARTICIPANTS),
    ]),
  },
  strict,
);

/** Survey reveal item input validation. */
export const SurveyRevealItemData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(StageKind.SURVEY),
    revealAudience: Type.Union([
      Type.Literal(RevealAudience.CURRENT_PARTICIPANT),
      Type.Literal(RevealAudience.ALL_PARTICIPANTS),
    ]),
    revealScorableOnly: Type.Boolean(),
  },
  strict,
);

/** Reveal item input validation. */
export const RevealItemData = Type.Any([
  RankingRevealItemData,
  SurveyRevealItemData,
]);

/** RevealStageConfig input validation. */
export const RevealStageConfigData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(StageKind.REVEAL),
    name: Type.String({minLength: 1}),
    descriptions: Type.Ref(StageTextConfigSchema),
    progress: Type.Ref(StageProgressConfigSchema),
    items: Type.Array(RevealItemData),
  },
  strict,
);
