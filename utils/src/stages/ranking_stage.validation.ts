import { Type, type Static } from '@sinclair/typebox';
import { StageKind } from './stage';
import {
  StageGameSchema,
  StageProgressConfigSchema,
  StageTextConfigSchema,
} from './stage.validation';
import { RankingItem, ElectionStrategy, RankingType } from './ranking_stage';
import { RevealAudience } from './stage';

/** Shorthand for strict TypeBox object validation */
const strict = { additionalProperties: false } as const;

// ************************************************************************* //
// writeExperiment, updateStageConfig endpoints                              //
// ************************************************************************* //

/** RankingItem input validation. */
export const RankingItemData = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    imageId: Type.String(),
    text: Type.String(),
  },
  strict,
);

/** RankingStageConfig input validation. */
export const ItemRankingStageConfigData = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    kind: Type.Literal(StageKind.RANKING),
    game: StageGameSchema,
    name: Type.String({ minLength: 1 }),
    descriptions: StageTextConfigSchema,
    progress: StageProgressConfigSchema,
    rankingType: Type.Literal(RankingType.ITEMS),
    strategy: Type.Union([
      Type.Literal(ElectionStrategy.NONE),
      Type.Literal(ElectionStrategy.CONDORCET),
    ]),
    rankingItems: Type.Array(RankingItemData),
    revealAudience: Type.Union([
      Type.Literal(RevealAudience.CURRENT_PARTICIPANT),
      Type.Literal(RevealAudience.ALL_PARTICIPANTS),
    ]),
  },
  strict,
);

export const ParticipantRankingStageConfigData = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    kind: Type.Literal(StageKind.RANKING),
    game: StageGameSchema,
    name: Type.String({ minLength: 1 }),
    descriptions: StageTextConfigSchema,
    progress: StageProgressConfigSchema,
    rankingType: Type.Literal(RankingType.PARTICIPANTS),
    strategy: Type.Union([
      Type.Literal(ElectionStrategy.NONE),
      Type.Literal(ElectionStrategy.CONDORCET),
    ]),
    enableSelfVoting: Type.Boolean(),
    revealAudience: Type.Union([
      Type.Literal(RevealAudience.CURRENT_PARTICIPANT),
      Type.Literal(RevealAudience.ALL_PARTICIPANTS),
    ]),
  },
  strict,
);

// ************************************************************************* //
// updateRankingStageParticipantAnswer endpoint                             //
// ************************************************************************* //

/** RankingStageParticipantAnswer input validation. */
export const RankingStageParticipantAnswerData = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    strategy: Type.Union([
      Type.Literal(ElectionStrategy.NONE),
      Type.Literal(ElectionStrategy.CONDORCET),
    ]),
    kind: Type.Literal(StageKind.RANKING),
    rankingList: Type.Array(Type.String()),
    rankingItems: Type.Array(RankingItemData),
  },
  strict,
);

export const UpdateRankingStageParticipantAnswerData = Type.Object(
  {
    experimentId: Type.String({ minLength: 1 }),
    cohortId: Type.String({ minLength: 1 }),
    participantPublicId: Type.String({ minLength: 1 }),
    participantPrivateId: Type.String({ minLength: 1 }),
    stageId: Type.String({ minLength: 1 }),
    strategy: Type.Union([
      Type.Literal(ElectionStrategy.NONE),
      Type.Literal(ElectionStrategy.CONDORCET),
    ]),
    rankingItems: Type.Array(RankingItemData),
    rankingList: Type.Array(Type.String()),
  },
  strict,
);

export type UpdateRankingStageParticipantAnswerData = Static<
  typeof UpdateRankingStageParticipantAnswerData
>;
