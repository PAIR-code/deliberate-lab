import {Type, type Static} from '@sinclair/typebox';
import {StageKind} from './stage';
import {
  StageProgressConfigSchema,
  StageTextConfigSchema,
} from './stage.validation';
import {SurveyQuestionKind} from './survey_stage';
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
    condition: Type.Optional(ConditionSchema),
    minCharCount: Type.Optional(Type.Number()),
    maxCharCount: Type.Optional(Type.Number()),
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
    condition: Type.Optional(ConditionSchema),
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
    condition: Type.Optional(ConditionSchema),
  },
  {$id: 'MultipleChoiceSurveyQuestion', ...strict},
);

/** ScaleSurveyQuestion input validation. */
export const ScaleSurveyQuestionData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(SurveyQuestionKind.SCALE),
    questionTitle: Type.String(),
    upperValue: Type.Number(),
    upperText: Type.String(),
    lowerValue: Type.Number(),
    lowerText: Type.String(),
    middleText: Type.Optional(Type.String()),
    useSlider: Type.Optional(Type.Boolean()),
    stepSize: Type.Optional(Type.Number({minimum: 1})),
    condition: Type.Optional(ConditionSchema),
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
export const SurveyStageConfigData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(StageKind.SURVEY),
    name: Type.String({minLength: 1}),
    descriptions: Type.Ref(StageTextConfigSchema),
    progress: Type.Ref(StageProgressConfigSchema),
    questions: Type.Array(SurveyQuestionData),
  },
  {$id: 'SurveyStageConfig', ...strict},
);

/** SurveyPerParticipantStageConfig input validation. */
export const SurveyPerParticipantStageConfigData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(StageKind.SURVEY_PER_PARTICIPANT),
    name: Type.String({minLength: 1}),
    descriptions: Type.Ref(StageTextConfigSchema),
    progress: Type.Ref(StageProgressConfigSchema),
    questions: Type.Array(SurveyQuestionData),
    enableSelfSurvey: Type.Boolean(),
  },
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
