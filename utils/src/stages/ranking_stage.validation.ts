import {Type, type Static} from '@sinclair/typebox';
import {StageKind} from './stage';
import {BaseStageConfigSchema} from './stage.schemas';
import {RankingItem, ElectionStrategy, RankingType} from './ranking_stage';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ************************************************************************* //
// writeExperiment, updateStageConfig endpoints                              //
// ************************************************************************* //

/** RankingItem input validation. */
export const RankingItemData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    imageId: Type.String(),
    text: Type.String(),
  },
  {$id: 'RankingItem', ...strict},
);

/** RankingStageConfig input validation. */
export const ItemRankingStageConfigData = Type.Composite(
  [
    BaseStageConfigSchema,
    Type.Object(
      {
        kind: Type.Literal(StageKind.RANKING),
        rankingType: Type.Literal(RankingType.ITEMS),
        strategy: Type.Union([
          Type.Literal(ElectionStrategy.NONE),
          Type.Literal(ElectionStrategy.CONDORCET),
        ]),
        rankingItems: Type.Array(RankingItemData),
      },
      strict,
    ),
  ],
  {$id: 'ItemRankingStageConfig', ...strict},
);

export const ParticipantRankingStageConfigData = Type.Composite(
  [
    BaseStageConfigSchema,
    Type.Object(
      {
        kind: Type.Literal(StageKind.RANKING),
        rankingType: Type.Literal(RankingType.PARTICIPANTS),
        strategy: Type.Union([
          Type.Literal(ElectionStrategy.NONE),
          Type.Literal(ElectionStrategy.CONDORCET),
        ]),
        enableSelfVoting: Type.Boolean(),
      },
      strict,
    ),
  ],
  {$id: 'ParticipantRankingStageConfig', ...strict},
);

export const RankingStageConfigData = Type.Union(
  [ItemRankingStageConfigData, ParticipantRankingStageConfigData],
  {$id: 'RankingStageConfig'},
);

// ************************************************************************* //
// updateRankingStageParticipantAnswer endpoint                              //
// ************************************************************************* //

/** RankingStageParticipantAnswer input validation. */
export const RankingStageParticipantAnswerData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(StageKind.RANKING),
    rankingList: Type.Array(Type.String()),
  },
  strict,
);

export const UpdateRankingStageParticipantAnswerData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    cohortId: Type.String({minLength: 1}),
    participantPublicId: Type.String({minLength: 1}),
    participantPrivateId: Type.String({minLength: 1}),
    stageId: Type.String({minLength: 1}),
    rankingList: Type.Array(Type.String()),
  },
  strict,
);

export type UpdateRankingStageParticipantAnswerData = Static<
  typeof UpdateRankingStageParticipantAnswerData
>;
