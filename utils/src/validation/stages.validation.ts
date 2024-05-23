import { Type, type Static } from '@sinclair/typebox';
import { StageKind } from '../types/stages.types';
import { Vote } from '../types/votes.types';
import { ChatAboutItemsConfigData } from './chats.validation';
import {
  CheckQuestionAnswerData,
  CheckQuestionConfigData,
  RatingQuestionAnswerData,
  RatingQuestionConfigData,
  ScaleQuestionAnswerData,
  ScaleQuestionConfigData,
  TextQuestionAnswerData,
  TextQuestionConfigData,
} from './questions.validation';

/** Shorthand for strict TypeBox object validation */
const strict = { additionalProperties: false } as const;

// ********************************************************************************************* //
//                                              CONFIGS                                          //
// ********************************************************************************************* //
/** Terms of service stage config */
export const InfoConfigData = Type.Object(
  {
    kind: Type.Literal(StageKind.Info),
    name: Type.String({ minLength: 1 }),
    infoLines: Type.Array(Type.String({ minLength: 1 })),
  },
  strict,
);

/** Terms of service stage config */
export const TermsOfServiceConfigData = Type.Object(
  {
    kind: Type.Literal(StageKind.TermsOfService),
    name: Type.String({ minLength: 1 }),
    tosLines: Type.Array(Type.String({ minLength: 1 })),
  },
  strict,
);

/** Profile stage config */
export const ProfileStageConfigData = Type.Object(
  {
    kind: Type.Literal(StageKind.SetProfile),
    name: Type.String({ minLength: 1 }),
  },
  strict,
);

/** Survey stage config */
export const SurveyStageConfigData = Type.Object(
  {
    kind: Type.Literal(StageKind.TakeSurvey),
    name: Type.String({ minLength: 1 }),
    questions: Type.Array(
      Type.Union([
        TextQuestionConfigData,
        CheckQuestionConfigData,
        RatingQuestionConfigData,
        ScaleQuestionConfigData,
      ]),
    ),
  },
  strict,
);

/** Group chat stage config */
export const GroupChatStageConfigData = Type.Object(
  {
    kind: Type.Literal(StageKind.GroupChat),
    name: Type.String({ minLength: 1 }),
    chatId: Type.String({ minLength: 1 }),
    chatConfig: Type.Union([ChatAboutItemsConfigData]),
  },
  strict,
);

/** Vote for leader stage config */
export const VoteForLeaderConfigData = Type.Object(
  {
    kind: Type.Literal(StageKind.VoteForLeader),
    name: Type.String({ minLength: 1 }),
  },
  strict,
);

/** Reveal leader after vote stage config */
export const RevealVotedConfigData = Type.Object(
  {
    kind: Type.Literal(StageKind.RevealVoted),
    name: Type.String({ minLength: 1 }),
    pendingVoteStageName: Type.String({ minLength: 1 }),
  },
  strict,
);

// ********************************************************************************************* //
//                                              ANSWERS                                          //
// ********************************************************************************************* //

/** Survey stage answer data */
export const SurveyStageAnswerData = Type.Object(
  {
    kind: Type.Literal(StageKind.TakeSurvey),
    answers: Type.Record(
      Type.Number({ minimum: 0 }),
      Type.Union([
        TextQuestionAnswerData,
        CheckQuestionAnswerData,
        RatingQuestionAnswerData,
        ScaleQuestionAnswerData,
      ]),
    ),
  },
  strict,
);

/** Vote for leader stage answer data */
export const VoteForLeaderStageAnswerData = Type.Object(
  {
    kind: Type.Literal(StageKind.VoteForLeader),
    votes: Type.Record(
      Type.String({ minLength: 1 }),
      Type.Union([
        Type.Literal(Vote.Positive),
        Type.Literal(Vote.Neutral),
        Type.Literal(Vote.Negative),
        Type.Literal(Vote.NotRated),
      ]),
    ),
  },
  strict,
);

/** Stage answer data */
export const StageAnswerData = Type.Object(
  {
    experimentId: Type.String({ minLength: 1 }),
    participantId: Type.String({ minLength: 1 }),
    stageName: Type.String({ minLength: 1 }),
    stage: Type.Union([SurveyStageAnswerData, VoteForLeaderStageAnswerData]),
  },
  strict,
);

export type StageAnswerData = Static<typeof StageAnswerData>;
