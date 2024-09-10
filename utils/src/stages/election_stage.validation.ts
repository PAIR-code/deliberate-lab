import { Type, type Static } from '@sinclair/typebox';
import { StageKind } from './stage';
import { StageGameSchema, StageTextConfigSchema } from './stage.validation';
import { ElectionItem } from './election_stage';

/** Shorthand for strict TypeBox object validation */
const strict = { additionalProperties: false } as const;

// ************************************************************************* //
// writeExperiment, updateStageConfig endpoints                              //
// ************************************************************************* //

/** ElectionItem input validation. */
export const ElectionItemData = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    text: Type.String(),
  },
  strict,
);

/** ElectionStageConfig input validation. */
export const ElectionStageConfigData = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    kind: Type.Literal(StageKind.ELECTION),
    game: StageGameSchema,
    name: Type.String({ minLength: 1 }),
    descriptions: StageTextConfigSchema,
    isParticipantElection: Type.Boolean(),
    electionItems: Type.Array(ElectionItemData),
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
    kind: Type.Literal(StageKind.ELECTION),
    rankingList: Type.Array(Type.String()),
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
    rankingList: Type.Array(Type.String()),
  },
  strict,
);

export type UpdateElectionStageParticipantAnswerData = Static<typeof UpdateElectionStageParticipantAnswerData>;