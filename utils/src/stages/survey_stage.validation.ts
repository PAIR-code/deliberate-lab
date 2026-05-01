import {Type, type Static} from '@sinclair/typebox';
import {BaseStageConfig, StageKind} from './stage';
import {
  BaseStageConfigSchema,
  type StageValidationResult,
} from './stage.schemas';
import {
  MultipleChoiceDisplayType,
  SurveyQuestionKind,
  SurveyStageConfig,
  SurveyPerParticipantStageConfig,
  SurveyQuestion,
} from './survey_stage';
import {ConditionSchema} from '../utils/condition.validation';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ************************************************************************* //
// writeExperiment, updateStageConfig endpoints                              //
// ************************************************************************* //

/** TextSurveyQuestion input validation. */
export const TextSurveyQuestionData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(SurveyQuestionKind.TEXT),
    questionTitle: Type.String(),
    condition: Type.Optional(Type.Union([Type.Null(), ConditionSchema])),
    minCharCount: Type.Optional(Type.Union([Type.Null(), Type.Number()])),
    maxCharCount: Type.Optional(Type.Union([Type.Null(), Type.Number()])),
  },
  {$id: 'TextSurveyQuestion', ...strict},
);

/** CheckSurveyQuestion input validation. */
export const CheckSurveyQuestionData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(SurveyQuestionKind.CHECK),
    questionTitle: Type.String(),
    isRequired: Type.Boolean(),
    condition: Type.Optional(Type.Union([Type.Null(), ConditionSchema])),
  },
  {$id: 'CheckSurveyQuestion', ...strict},
);

/** MultipleChoiceItem input validation. */
export const MultipleChoiceItemData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    imageId: Type.String(),
    text: Type.String(),
  },
  {$id: 'MultipleChoiceItem', ...strict},
);

/** MultipleChoiceSurveyQuestion input validation. */
export const MultipleChoiceSurveyQuestionData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(SurveyQuestionKind.MULTIPLE_CHOICE),
    questionTitle: Type.String(),
    options: Type.Array(MultipleChoiceItemData),
    correctAnswerId: Type.Union([Type.Null(), Type.String()]),
    displayType: Type.Optional(
      Type.Enum(MultipleChoiceDisplayType, {$id: 'MultipleChoiceDisplayType'}),
    ),
    condition: Type.Optional(Type.Union([Type.Null(), ConditionSchema])),
  },
  {$id: 'MultipleChoiceSurveyQuestion', ...strict},
);

/** ScaleSurveyQuestion input validation. */
export const ScaleSurveyQuestionData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(SurveyQuestionKind.SCALE),
    questionTitle: Type.String(),
    upperValue: Type.Integer(),
    upperText: Type.String(),
    lowerValue: Type.Integer(),
    lowerText: Type.String(),
    middleText: Type.Optional(Type.String()),
    useSlider: Type.Optional(Type.Boolean()),
    stepSize: Type.Optional(Type.Integer({minimum: 1})),
    condition: Type.Optional(Type.Union([Type.Null(), ConditionSchema])),
  },
  {$id: 'ScaleSurveyQuestion', ...strict},
);

/** SurveyQuestion input validation. */
export const SurveyQuestionData = Type.Union([
  TextSurveyQuestionData,
  CheckSurveyQuestionData,
  MultipleChoiceSurveyQuestionData,
  ScaleSurveyQuestionData,
]);

/** SurveyStageConfig input validation. */
export const SurveyStageConfigData = Type.Composite(
  [
    BaseStageConfigSchema,
    Type.Object(
      {
        kind: Type.Literal(StageKind.SURVEY),
        questions: Type.Array(SurveyQuestionData),
      },
      strict,
    ),
  ],
  {$id: 'SurveyStageConfig', ...strict},
);

/** SurveyPerParticipantStageConfig input validation. */
export const SurveyPerParticipantStageConfigData = Type.Composite(
  [
    BaseStageConfigSchema,
    Type.Object(
      {
        kind: Type.Literal(StageKind.SURVEY_PER_PARTICIPANT),
        questions: Type.Array(SurveyQuestionData),
        enableSelfSurvey: Type.Boolean(),
      },
      strict,
    ),
  ],
  {$id: 'SurveyPerParticipantStageConfig', ...strict},
);

// ************************************************************************* //
// updateSurveyStageParticipantAnswer endpoint                               //
// ************************************************************************* //

/** TextSurveyAnswer input validation. */
export const TextSurveyAnswerData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(SurveyQuestionKind.TEXT),
    answer: Type.String(),
  },
  {$id: 'TextSurveyAnswer', ...strict},
);

/** CheckSurveyAnswer input validation. */
export const CheckSurveyAnswerData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(SurveyQuestionKind.CHECK),
    isChecked: Type.Boolean(),
  },
  {$id: 'CheckSurveyAnswer', ...strict},
);

/** MultipleChoiceSurveyAnswer input validation. */
export const MultipleChoiceSurveyAnswerData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(SurveyQuestionKind.MULTIPLE_CHOICE),
    choiceId: Type.String({minLength: 1}),
  },
  {$id: 'MultipleChoiceSurveyAnswer', ...strict},
);

/** ScaleSurveyAnswer input validation. */
export const ScaleSurveyAnswerData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(SurveyQuestionKind.SCALE),
    value: Type.Number(),
  },
  {$id: 'ScaleSurveyAnswer', ...strict},
);

/** SurveyAnswer input validation. */
export const SurveyAnswerData = Type.Union([
  TextSurveyAnswerData,
  CheckSurveyAnswerData,
  MultipleChoiceSurveyAnswerData,
  ScaleSurveyAnswerData,
]);

/** SurveyStageParticipantAnswer input validation. */
export const SurveyStageParticipantAnswerData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(StageKind.SURVEY),
    answerMap: Type.Record(Type.String({minLength: 1}), SurveyAnswerData),
  },
  strict,
);

/** SurveyPerParticipantStageParticipantAnswer input validation. */
export const SurveyPerParticipantStageParticipantAnswerData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(StageKind.SURVEY_PER_PARTICIPANT),
    answerMap: Type.Record(
      Type.String({minLength: 1}),
      Type.Record(Type.String({minLength: 1}), SurveyAnswerData),
    ),
  },
  strict,
);

/** Update survey stage endpoint validation. */
export const UpdateSurveyStageParticipantAnswerData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    cohortId: Type.String({minLength: 1}),
    participantPrivateId: Type.String({minLength: 1}),
    participantPublicId: Type.String({minLength: 1}),
    surveyStageParticipantAnswer: SurveyStageParticipantAnswerData,
  },
  strict,
);

export type UpdateSurveyStageParticipantAnswerData = Static<
  typeof UpdateSurveyStageParticipantAnswerData
>;

/** Update survey-per-participant stage endpoint validation. */
export const UpdateSurveyPerParticipantStageParticipantAnswerData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    participantPrivateId: Type.String({minLength: 1}),
    surveyPerParticipantStageParticipantAnswer:
      SurveyPerParticipantStageParticipantAnswerData,
  },
  strict,
);

export type UpdateSurveyPerParticipantStageParticipantAnswerData = Static<
  typeof UpdateSurveyPerParticipantStageParticipantAnswerData
>;

/** Validate multiple choice and scale questions inside survey stages. */
export function validateSurveyQuestions(
  questions: SurveyQuestion[],
): StageValidationResult {
  if (!questions || questions.length === 0) {
    return {
      valid: false,
      error: 'Survey stage must contain at least one question',
    };
  }

  for (const q of questions) {
    if (q.kind === SurveyQuestionKind.SCALE) {
      if (
        !Number.isInteger(q.lowerValue) ||
        !Number.isInteger(q.upperValue) ||
        (q.stepSize !== undefined && !Number.isInteger(q.stepSize))
      ) {
        return {
          valid: false,
          error: `Scale question "${q.questionTitle}" lower value, upper value, and step size must be integers`,
        };
      }
      if (q.lowerValue >= q.upperValue) {
        return {
          valid: false,
          error: `Scale question "${q.questionTitle}" has lower value (${q.lowerValue}) greater than or equal to upper value (${q.upperValue})`,
        };
      }
      const range = q.upperValue - q.lowerValue;
      const step = q.stepSize ?? 1;
      if (step <= 0) {
        return {
          valid: false,
          error: `Scale question "${q.questionTitle}" step size (${step}) must be greater than 0`,
        };
      }
      if (range % step !== 0) {
        return {
          valid: false,
          error: `Scale question "${q.questionTitle}" step size (${step}) must divide max-min (${range}) exactly`,
        };
      }
    }
    if (q.kind === SurveyQuestionKind.MULTIPLE_CHOICE) {
      if (!q.options || q.options.length === 0) {
        return {
          valid: false,
          error: `Multiple choice question "${q.questionTitle}" must have at least one option`,
        };
      }
      if (q.correctAnswerId != null && q.correctAnswerId !== '') {
        const hasOption = q.options.some((opt) => opt.id === q.correctAnswerId);
        if (!hasOption) {
          return {
            valid: false,
            error: `Multiple choice question "${q.questionTitle}" has a correct answer ID "${q.correctAnswerId}" that doesn't match any option ID`,
          };
        }
      }
    }
  }
  return {valid: true};
}

export function validateSurveyStageConfig(
  stage: BaseStageConfig,
): StageValidationResult {
  const {questions} = stage as SurveyStageConfig;
  return validateSurveyQuestions(questions);
}

export function validateSurveyPerParticipantStageConfig(
  stage: BaseStageConfig,
): StageValidationResult {
  const {questions} = stage as SurveyPerParticipantStageConfig;
  return validateSurveyQuestions(questions);
}
