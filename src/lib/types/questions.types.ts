/** Survey question types */

import { uniqueId } from 'lodash';
import { ItemPairWithRatings } from './items.types';

export enum SurveyQuestionKind {
  Text = 'TextQuestion',
  Check = 'CheckQuestion',
  Rating = 'RatingQuestion',
  Scale = 'ScaleQuestion',
}

export interface AbstractQuestion {
  kind: SurveyQuestionKind;
  id: string;
}

export interface TextQuestion extends AbstractQuestion {
  kind: SurveyQuestionKind.Text;

  questionText: string;
  answerText: string;
}

export interface CheckQuestion extends AbstractQuestion {
  kind: SurveyQuestionKind.Check;

  questionText: string;
  checkMark: boolean | null;
}

export interface RatingQuestion extends AbstractQuestion {
  kind: SurveyQuestionKind.Rating;

  questionText: string;
  rating: ItemPairWithRatings;
}

export interface ScaleQuestion extends AbstractQuestion {
  kind: SurveyQuestionKind.Scale;

  questionText: string;
  upperBound: string;
  lowerBound: string;
  score: number | null; //  10 point scale.
}

export type Question = TextQuestion | RatingQuestion | ScaleQuestion | CheckQuestion;

export interface Survey {
  questions: Question[];
}

// ********************************************************************************************* //
//                                           DEFAULTS                                            //
// ********************************************************************************************* //

export const getDefaultTextQuestion = (): TextQuestion => {
  return {
    kind: SurveyQuestionKind.Text,
    id: uniqueId(),
    questionText: '',
    answerText: '',
  };
};

export const getDefaultCheckQuestion = (): CheckQuestion => {
  return {
    kind: SurveyQuestionKind.Check,
    id: uniqueId(),
    questionText: '',
    checkMark: null,
  };
};

export const getDefaultItemRatingsQuestion = (): RatingQuestion => {
  return {
    kind: SurveyQuestionKind.Rating,
    id: uniqueId(),
    questionText: '',
    rating: {
      item1: { name: '', imageUrl: '' },
      item2: { name: '', imageUrl: '' },
      choice: null,
      confidence: null,
    },
  };
};

export const getDefaultScaleQuestion = (): ScaleQuestion => {
  return {
    kind: SurveyQuestionKind.Scale,
    id: uniqueId(),
    questionText: '',
    upperBound: '',
    lowerBound: '',
    score: null,
  };
};

export const getDefaultSurveyConfig = (): Survey => {
  return {
    questions: [],
  };
};
