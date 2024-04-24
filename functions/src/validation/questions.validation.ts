/* eslint-disable @typescript-eslint/no-explicit-any */
/** Validation for the questions */

import { Type, type Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

// Copied from questions.types.ts
export enum SurveyQuestionKind {
  Text = 'TextQuestion',
  Check = 'CheckQuestion',
  Rating = 'RatingQuestion',
  Scale = 'ScaleQuestion',
}

// ********************************************************************************************* //
//                                         DEFINITIONS                                           //
// ********************************************************************************************* //

// Text Question

export const TextQuestionUpdate = Type.Object(
  {
    answerText: Type.String(),
  },
  { additionalProperties: false },
);

export type TextQuestionUpdate = Static<typeof TextQuestionUpdate>;

// Check Question

export const CheckQuestionUpdate = Type.Object(
  {
    checkMark: Type.Boolean(),
  },
  { additionalProperties: false },
);

export type CheckQuestionUpdate = Static<typeof CheckQuestionUpdate>;

// Rating Question

export const RatingQuestionUpdate = Type.Object(
  {
    choice: Type.String(),
    confidence: Type.Number({ minimum: 0, maximum: 1 }),
  },
  { additionalProperties: false },
);

export type RatingQuestionUpdate = Static<typeof RatingQuestionUpdate>;

// Scale Question

export const ScaleQuestionUpdate = Type.Object(
  {
    score: Type.Number({ minimum: 0, maximum: 10 }),
  },
  { additionalProperties: false },
);

export type ScaleQuestionUpdate = Static<typeof ScaleQuestionUpdate>;

// ********************************************************************************************* //
//                                             UTILS                                             //
// ********************************************************************************************* //

/** Merge incoming update with the question data in place.
 *
 * @param question Existing question data from database
 * @param data Incoming update data from the request
 * @returns true if the update is valid and the merge was successful, false otherwise
 */
export const validateQuestionUpdateAndMerge = (question: any, data: any): boolean => {
  let valid = false;

  switch (question.kind as SurveyQuestionKind) {
    case SurveyQuestionKind.Text:
      valid = Value.Check(TextQuestionUpdate, data);
      break;
    case SurveyQuestionKind.Check:
      valid = Value.Check(CheckQuestionUpdate, data);
      break;

    case SurveyQuestionKind.Rating:
      valid = Value.Check(RatingQuestionUpdate, data);
      break;

    case SurveyQuestionKind.Scale:
      valid = Value.Check(ScaleQuestionUpdate, data);
      break;

    default:
      valid = false;
  }

  if (!valid) return false;

  // Merge the data in place
  Object.assign(question, data);

  return true;
};
