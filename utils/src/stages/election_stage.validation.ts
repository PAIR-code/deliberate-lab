import { Type, type Static } from '@sinclair/typebox';
import { StageKind } from './stage';
import {
  StageGameSchema,
  StageProgressConfigSchema,
  StageTextConfigSchema
} from './stage.validation';
import { ElectionItem, ElectionStrategy, ElectionType } from './election_stage';

/** Shorthand for strict TypeBox object validation */
const strict = { additionalProperties: false } as const;

// ************************************************************************* //
// writeExperiment, updateStageConfig endpoints                              //
// ************************************************************************* //

/** ElectionItem input validation. */
export const ElectionItemData = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    imageId: Type.String(),
    text: Type.String(),
  },
  strict,
);

/** ElectionStageConfig input validation. */
export const ItemElectionStageConfigData = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    kind: Type.Literal(StageKind.ELECTION),
    game: StageGameSchema,
    name: Type.String({ minLength: 1 }),
    descriptions: StageTextConfigSchema,
    progress: StageProgressConfigSchema,
    electionType: Type.Literal(ElectionType.ITEMS),
    strategy: Type.Union([Type.Literal(ElectionStrategy.NONE), Type.Literal(ElectionStrategy.CONDORCET)]),
    electionItems: Type.Array(ElectionItemData),
  },
  strict,
);


export const ParticipantElectionStageConfigData = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    kind: Type.Literal(StageKind.ELECTION),
    game: StageGameSchema,
    name: Type.String({ minLength: 1 }),
    descriptions: StageTextConfigSchema,
    progress: StageProgressConfigSchema,
    electionType: Type.Literal(ElectionType.PARTICIPANTS),
    strategy: Type.Union([Type.Literal(ElectionStrategy.NONE), Type.Literal(ElectionStrategy.CONDORCET)]),
    enableSelfVoting: Type.Boolean(),
  },
  strict,
);

// ************************************************************************* //
// updateElectionStageParticipantAnswer endpoint                             //
// ************************************************************************* //

/** ElectionStageParticipantAnswer input validation. */
export const ElectionStageParticipantAnswerData = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    strategy: Type.Union([Type.Literal(ElectionStrategy.NONE), Type.Literal(ElectionStrategy.CONDORCET)]),
    kind: Type.Literal(StageKind.ELECTION),
    rankingList: Type.Array(Type.String()),
    electionItems: Type.Array(ElectionItemData),
  },
  strict,
);

export const UpdateElectionStageParticipantAnswerData = Type.Object(
  {
    experimentId: Type.String({ minLength: 1 }),
    cohortId: Type.String({ minLength: 1 }),
    participantPublicId: Type.String({ minLength: 1 }),
    participantPrivateId: Type.String({ minLength: 1}),
    stageId: Type.String({ minLength: 1 }),
    strategy: Type.Union([Type.Literal(ElectionStrategy.NONE), Type.Literal(ElectionStrategy.CONDORCET)]),
    electionItems: Type.Array(ElectionItemData),
    rankingList: Type.Array(Type.String()),
  },
  strict,
);

export type UpdateElectionStageParticipantAnswerData = Static<typeof UpdateElectionStageParticipantAnswerData>;