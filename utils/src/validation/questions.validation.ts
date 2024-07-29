import { Type } from '@sinclair/typebox';
import { SurveyQuestionKind } from '../types/questions.types';
import { ItemData } from './lost_at_sea.validation';

/** Shorthand for strict TypeBox object validation */
const strict = { additionalProperties: false } as const;

// ********************************************************************************************* //
//                                              CONFIGS                                          //
// ********************************************************************************************* //

/** Text question config */
export const TextQuestionConfigData = Type.Object(
  {
    kind: Type.Literal(SurveyQuestionKind.Text),
    id: Type.Number(),
    questionText: Type.String({ minLength: 1 }),
  },
  strict,
);

/** Check question config */
export const CheckQuestionConfigData = Type.Object(
  {
    kind: Type.Literal(SurveyQuestionKind.Check),
    id: Type.Number(),
    questionText: Type.String({ minLength: 1 }),
  },
  strict,
);

/** Multiple choice question config */
export const MultipleChoiceQuestionConfigData = Type.Object(
  {
    kind: Type.Literal(SurveyQuestionKind.MultipleChoice),
    id: Type.Number(),
    questionText: Type.String({ minLength: 1 }),
    options: Type.Array(Type.Object({
      id: Type.Number(),
      text: Type.String({ minLength: 1 }),
    })),
  },
  strict,
)

/** Lost at Sea question data */
export const LostAtSeaQuestionData = Type.Object(
  {
    id: Type.Number(),
    questionText: Type.String({ minLength: 1 }),
    item1: ItemData,
    item2: ItemData,
  },
  strict,
);

/** Scale question config */
export const ScaleQuestionConfigData = Type.Object(
  {
    kind: Type.Literal(SurveyQuestionKind.Scale),
    id: Type.Number(),
    questionText: Type.String({ minLength: 1 }),
    upperBound: Type.String({ minLength: 1 }),
    lowerBound: Type.String({ minLength: 1 }),
  },
  strict,
);

// ********************************************************************************************* //
//                                              ANSWERS                                          //
// ********************************************************************************************* //

/** Text question answer data */
export const TextQuestionAnswerData = Type.Object(
  {
    kind: Type.Literal(SurveyQuestionKind.Text),
    id: Type.Number(),
    answerText: Type.String(),
  },
  strict,
);

/** Check question answer data */
export const CheckQuestionAnswerData = Type.Object(
  {
    kind: Type.Literal(SurveyQuestionKind.Check),
    id: Type.Number(),
    checkMark: Type.Boolean(),
  },
  strict,
);

/** Multiple choice question answer data */
export const MultipleChoiceQuestionAnswerData = Type.Object (
  {
    kind: Type.Literal(SurveyQuestionKind.MultipleChoice),
    id: Type.Number(),
    choice: Type.Number(),
  }
)

/** Lost at Sea question answer data */
export const LostAtSeaQuestionAnswerData = Type.Object(
  {
    id: Type.Number(),
    choice: ItemData,
    confidence: Type.Optional(Type.Number({ minimum: 0, maximum: 10 })),
  },
  strict,
);

/** Scale question answer data */
export const ScaleQuestionAnswerData = Type.Object(
  {
    kind: Type.Literal(SurveyQuestionKind.Scale),
    id: Type.Number(),
    score: Type.Number({ minimum: 0, maximum: 10 }),
  },
  strict,
);
