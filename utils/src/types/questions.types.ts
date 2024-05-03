/** Survey question types */

import { uniqueId } from "../utils/algebraic.utils";
import { ExcludeProps } from "../utils/object.utils";
import { ItemPairWithRatings, getDefaultItemRating } from "./items.types";
import { TosAndUserProfile } from "./participants.types";

export enum SurveyQuestionKind {
  Text = "TextQuestion",
  Check = "CheckQuestion",
  Rating = "RatingQuestion",
  Scale = "ScaleQuestion",
}

export interface AbstractQuestion {
  kind: SurveyQuestionKind;
  questionText: string;

  id: string;
}

/** The actual response data to be sent to the backend */
export type QuestionAnswer<T> = ExcludeProps<T, AbstractQuestion>;

export interface TextQuestion extends AbstractQuestion {
  kind: SurveyQuestionKind.Text;

  answerText: string;
}

export interface CheckQuestion extends AbstractQuestion {
  kind: SurveyQuestionKind.Check;

  checkMark: boolean | null;
}

export interface RatingQuestion extends AbstractQuestion, ItemPairWithRatings {
  kind: SurveyQuestionKind.Rating;
}

export interface ScaleQuestion extends AbstractQuestion {
  kind: SurveyQuestionKind.Scale;

  upperBound: string; // Descriptor for the upper bound of the scale
  lowerBound: string; // Descriptor for the lower bound of the scale
  score: number | null; //  10 point scale.
}

export type Question =
  | TextQuestion
  | RatingQuestion
  | ScaleQuestion
  | CheckQuestion;

export type QuestionUpdate =
  | QuestionAnswer<TextQuestion>
  | QuestionAnswer<CheckQuestion>
  | QuestionAnswer<RatingQuestion>
  | QuestionAnswer<ScaleQuestion>;

export interface Survey {
  questions: Question[];
}

// ********************************************************************************************* //
//                                             UTILS                                             //
// ********************************************************************************************* //

/** Asserts that the input question is of the given type, and returns it */
export const questionAsKind = <T extends Question>(
  question: Question,
  kind: SurveyQuestionKind
): T => {
  if (question.kind !== kind) {
    throw new Error(`Expected question of kind ${kind}, got ${question.kind}`);
  }

  return question as T;
};

// ********************************************************************************************* //
//                                           DEFAULTS                                            //
// ********************************************************************************************* //

export const getDefaultTextQuestion = (): TextQuestion => {
  return {
    kind: SurveyQuestionKind.Text,
    id: uniqueId(),
    questionText: "",
    answerText: "",
  };
};

export const getDefaultCheckQuestion = (): CheckQuestion => {
  return {
    kind: SurveyQuestionKind.Check,
    id: uniqueId(),
    questionText: "",
    checkMark: null,
  };
};

export const getDefaultItemRatingsQuestion = (): RatingQuestion => {
  return {
    kind: SurveyQuestionKind.Rating,
    id: uniqueId(),
    questionText: "",
    ...getDefaultItemRating(),
  };
};

export const getDefaultScaleQuestion = (): ScaleQuestion => {
  return {
    kind: SurveyQuestionKind.Scale,
    id: uniqueId(),
    questionText: "",
    upperBound: "",
    lowerBound: "",
    score: null,
  };
};

export const getDefaultSurveyConfig = (): Survey => {
  return {
    questions: [],
  };
};

export const getDefaultTosAndUserProfileConfig = (): TosAndUserProfile => {
  return {
    pronouns: "",
    avatarUrl: "",
    name: "",
    tosLines: [""],
    acceptTosTimestamp: null,
  };
};
