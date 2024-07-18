import { TObject, Type, type Static } from '@sinclair/typebox';
import { ChatContext, MediatorKind } from '../types/mediator.types';
import { PayoutCurrency } from '../types/payout.types';
import { SurveyQuestionKind } from '../types/questions.types';
import { BaseStageConfig, StageConfig, StageKind } from '../types/stages.types';
import { Vote } from '../types/votes.types';
import { ChatAboutItemsConfigData, SimpleChatConfigData } from './chats.validation';
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
import { PayoutBundleData, ScoringBundleData } from './payout.validation';

/** Shorthand for strict TypeBox object validation */
const strict = { additionalProperties: false } as const;

// ********************************************************************************************* //
//                                              CONFIGS                                          //
// ********************************************************************************************* //
/** Info stage config */
export const InfoConfigData = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    kind: Type.Literal(StageKind.Info),
    name: Type.String({ minLength: 1 }),
    composite: Type.Optional(Type.Boolean()),
    game: Type.Optional(Type.String({ minLength: 1 })),
    description: Type.Optional(Type.String()),
    popupText: Type.Optional(Type.String()),
    infoLines: Type.Array(Type.String({ minLength: 1 })),
  },
  strict,
);

/** Terms of service stage config */
export const TermsOfServiceConfigData = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    kind: Type.Literal(StageKind.TermsOfService),
    name: Type.String({ minLength: 1 }),
    composite: Type.Optional(Type.Boolean()),
    game: Type.Optional(Type.String({ minLength: 1 })),
    description: Type.Optional(Type.String()),
    popupText: Type.Optional(Type.String()),
    tosLines: Type.Array(Type.String({ minLength: 1 })),
  },
  strict,
);

/** Profile stage config */
export const ProfileStageConfigData = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    kind: Type.Literal(StageKind.SetProfile),
    name: Type.String({ minLength: 1 }),
    composite: Type.Optional(Type.Boolean()),
    game: Type.Optional(Type.String({ minLength: 1 })),
    description: Type.Optional(Type.String()),
    popupText: Type.Optional(Type.String()),
  },
  strict,
);

/** Survey stage config */
export const SurveyStageConfigData = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    kind: Type.Literal(StageKind.TakeSurvey),
    name: Type.String({ minLength: 1 }),
    composite: Type.Optional(Type.Boolean()),
    game: Type.Optional(Type.String({ minLength: 1 })),
    description: Type.Optional(Type.String()),
    popupText: Type.Optional(Type.String()),
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
    id: Type.String({ minLength: 1 }),
    kind: Type.Literal(StageKind.GroupChat),
    name: Type.String({ minLength: 1 }),
    composite: Type.Optional(Type.Boolean()),
    game: Type.Optional(Type.String({ minLength: 1 })),
    description: Type.Optional(Type.String()),
    popupText: Type.Optional(Type.String()),
    chatId: Type.String({ minLength: 1 }),
    chatConfig: Type.Union([ChatAboutItemsConfigData, SimpleChatConfigData]),
    mediators: Type.Array(
      Type.Object(
        {
          id: Type.String(),
          kind: Type.Union([
            Type.Literal(MediatorKind.Automatic),
            Type.Literal(MediatorKind.Manual),
          ]),
          name: Type.String(),
          avatar: Type.String(),
          prompt: Type.String(),
          model: Type.String(),
          chatContext: Type.Union([
            Type.Literal(ChatContext.Message),
            Type.Literal(ChatContext.Discussion),
            Type.Literal(ChatContext.All),
          ]),
          filterMediatorMessages: Type.Boolean(),
        },
        strict,
      ),
    ),
  },
  strict,
);

/** Vote for leader stage config */
export const VoteForLeaderConfigData = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    kind: Type.Literal(StageKind.VoteForLeader),
    name: Type.String({ minLength: 1 }),
    composite: Type.Optional(Type.Boolean()),
    game: Type.Optional(Type.String({ minLength: 1 })),
    description: Type.Optional(Type.String()),
    popupText: Type.Optional(Type.String()),
  },
  strict,
);

/** Payout stage config */
export const PayoutConfigData = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    kind: Type.Literal(StageKind.Payout),
    name: Type.String({ minLength: 1 }),
    composite: Type.Literal(true),
    game: Type.Optional(Type.String({ minLength: 1})),
    payouts: Type.Array(PayoutBundleData),
    scoring: Type.Optional(Type.Array(ScoringBundleData)),
    currency: Type.Union([
      Type.Literal(PayoutCurrency.USD),
      Type.Literal(PayoutCurrency.EUR),
    ]),
    description: Type.Optional(Type.String()),
    popupText: Type.Optional(Type.String()),
  },
  strict,
);

/** Reveal stage results config */
export const RevealConfigData = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    kind: Type.Literal(StageKind.Reveal),
    name: Type.String({ minLength: 1 }),
    composite: Type.Literal(true),
    game: Type.Optional(Type.String({ minLength: 1 })),
    stagesToReveal: Type.Array(Type.String({ minLength: 1 })),
    description: Type.Optional(Type.String()),
    popupText: Type.Optional(Type.String()),
  },
  strict,
);

export const CONFIG_DATA = {
  [StageKind.Info]: InfoConfigData,
  [StageKind.TermsOfService]: TermsOfServiceConfigData,
  [StageKind.SetProfile]: ProfileStageConfigData,
  [StageKind.TakeSurvey]: SurveyStageConfigData,
  [StageKind.GroupChat]: GroupChatStageConfigData,
  [StageKind.VoteForLeader]: VoteForLeaderConfigData,
  [StageKind.Payout]: PayoutConfigData,
  [StageKind.Reveal]: RevealConfigData,
};

/** Access wrapper for calls without type errors when analyzing typebox validation backtrace */
export const getConfigData = (kind: unknown) => CONFIG_DATA[kind as StageKind] as TObject;


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
    stageId: Type.String({ minLength: 1 }),
    stage: Type.Union([SurveyStageAnswerData, VoteForLeaderStageAnswerData]),
  },
  strict,
);

export type StageAnswerData = Static<typeof StageAnswerData>;


// ********************************************************************************************* //
//                                          STAGE CREATION                                       //
// ********************************************************************************************* //

/** This function validates front-end editable fields in stage creation. */
export function validateStageConfigs(stages: StageConfig[]): string[] {
  const errors: string[] = [];

  stages.forEach((stage, index) => {
    const baseErrors = validateBaseStageConfig(stage, index);

    switch (stage.kind) {
      case StageKind.Info:
        if (!stage.infoLines || !Array.isArray(stage.infoLines) ||
        (stage.infoLines.length === 1 && stage.infoLines[0] === "")) {
          baseErrors.push("Info fields must be nonempty.");
        }
        break;

      case StageKind.TermsOfService:
        if (!stage.tosLines || !Array.isArray(stage.tosLines) ||
        (stage.tosLines.length === 1 && stage.tosLines[0] === "")) {
          baseErrors.push("Terms of service content must be nonempty.");
        }
        break;

      case StageKind.SetProfile:
        // No additional required fields
        break;

      case StageKind.VoteForLeader:
        break;

      case StageKind.Payout:
        break;

      case StageKind.Reveal:
        break;
      
      case StageKind.GroupChat:
        break;
        
      case StageKind.TakeSurvey:
        if (!stage.questions || !Array.isArray(stage.questions) || stage.questions.length === 0) {
          baseErrors.push("Survey stages must include at least one question.");
        }

        stage.questions.forEach(question => {
          if (!question.questionText) {
            baseErrors.push("Question text is required.");
          }

          switch(question.kind) {
            case SurveyQuestionKind.Scale:
              if (!question.upperBound || !question.lowerBound) {
                baseErrors.push("Bounds text is required.");
              }
              break;
            default:
              break;
          }
        });

        break;

      default:
        baseErrors.push("Unknown stage kind.");
    }

    if (baseErrors.length > 0) {
      errors.push(`${baseErrors.join(' ')}`);
    }
  });

  return errors;
}

function validateBaseStageConfig(stage: BaseStageConfig, index: number): string[] {
  const errors: string[] = [];

  if (!stage.name || typeof stage.name !== 'string') {
    errors.push("Stage name is required.");
  }

  return errors;
}