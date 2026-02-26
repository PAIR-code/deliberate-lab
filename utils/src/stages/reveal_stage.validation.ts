import {Type, type Static} from '@sinclair/typebox';
import {StageKind} from './stage';
import {BaseStageConfigSchema} from './stage.schemas';
import {RevealAudience} from './reveal_stage';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ************************************************************************* //
// writeExperiment, updateStageConfig endpoints                              //
// ************************************************************************* //

/** Chip reveal item input validation. */
export const ChipRevealItemData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(StageKind.CHIP),
    revealAudience: Type.Union([
      Type.Literal(RevealAudience.CURRENT_PARTICIPANT),
      Type.Literal(RevealAudience.ALL_PARTICIPANTS),
    ]),
  },
  {...strict, $id: 'ChipRevealItem'},
);

/** Ranking reveal item input validation. */
export const RankingRevealItemData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(StageKind.RANKING),
    revealAudience: Type.Union([
      Type.Literal(RevealAudience.CURRENT_PARTICIPANT),
      Type.Literal(RevealAudience.ALL_PARTICIPANTS),
    ]),
  },
  {...strict, $id: 'RankingRevealItem'},
);

/** LR Ranking reveal item input validation (with customRender). */
export const LRRankingRevealItemData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(StageKind.REVEAL),
    revealAudience: Type.Union([
      Type.Literal(RevealAudience.CURRENT_PARTICIPANT),
      Type.Literal(RevealAudience.ALL_PARTICIPANTS),
    ]),
    customRender: Type.Optional(Type.String({minLength: 1})),
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
  {...strict, $id: 'SurveyRevealItem'},
);

/** MultiAssetAllocation reveal item input validation. */
export const MultiAssetAllocationRevealItemData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(StageKind.MULTI_ASSET_ALLOCATION),
    revealAudience: Type.Union([
      Type.Literal(RevealAudience.CURRENT_PARTICIPANT),
      Type.Literal(RevealAudience.ALL_PARTICIPANTS),
    ]),
    displayMode: Type.Union([Type.Literal('full'), Type.Literal('scoreOnly')]),
  },
  {...strict, $id: 'MultiAssetAllocationRevealItem'},
);

/** Reveal item input validation. */
export const RevealItemData = Type.Union([
  ChipRevealItemData,
  RankingRevealItemData,
  LRRankingRevealItemData,
  SurveyRevealItemData,
  MultiAssetAllocationRevealItemData,
]);

/** RevealStageConfig input validation. */
export const RevealStageConfigData = Type.Composite(
  [
    BaseStageConfigSchema,
    Type.Object(
      {
        kind: Type.Literal(StageKind.REVEAL),
        items: Type.Array(RevealItemData),
      },
      strict,
    ),
  ],
  {$id: 'RevealStageConfig', ...strict},
);
