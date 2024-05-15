import { SurveyQuestionKind } from '@llm-mediation-experiments/utils';
import { Type } from '@sinclair/typebox';
import { ItemData } from './items.validation';

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

/** Rating question config */
export const RatingQuestionConfigData = Type.Object(
  {
    kind: Type.Literal(SurveyQuestionKind.Rating),
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
    answerText: Type.String({ minLength: 1 }),
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

/** Rating question answer data */
export const RatingQuestionAnswerData = Type.Object(
  {
    kind: Type.Literal(SurveyQuestionKind.Rating),
    id: Type.Number(),
    choice: ItemData,
    confidence: Type.Number({ minimum: 0, maximum: 1 }),
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
