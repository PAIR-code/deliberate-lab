/** Survey question types */

import { ItemName } from './items.types';

export enum SurveyQuestionKind {
  Text = 'TextQuestion',
  Check = 'CheckQuestion',
  Rating = 'RatingQuestion',
  Scale = 'ScaleQuestion',
}

// ********************************************************************************************* //
//                                           CONFIGS                                             //
// ********************************************************************************************* //

interface BaseQuestionConfig {
  kind: SurveyQuestionKind;
  id: number; // Note that the question id is not related to the question's position in the survey
  questionText: string;
}

export interface TextQuestionConfig extends BaseQuestionConfig {
  kind: SurveyQuestionKind.Text;
}

export interface CheckQuestionConfig extends BaseQuestionConfig {
  kind: SurveyQuestionKind.Check;
}

export interface RatingQuestionConfig extends BaseQuestionConfig {
  kind: SurveyQuestionKind.Rating;

  item1: ItemName;
  item2: ItemName;
}

export interface ScaleQuestionConfig extends BaseQuestionConfig {
  kind: SurveyQuestionKind.Scale;

  upperBound: string; // Description for the upper bound of the scale
  lowerBound: string; // Description for the lower bound of the scale
}

export type QuestionConfig =
  | TextQuestionConfig
  | CheckQuestionConfig
  | RatingQuestionConfig
  | ScaleQuestionConfig;

// ********************************************************************************************* //
//                                           ANSWERS                                             //
// ********************************************************************************************* //

interface BaseQuestionAnswer {
  kind: SurveyQuestionKind;
  id: number;
}

export interface TextQuestionAnswer extends BaseQuestionAnswer {
  kind: SurveyQuestionKind.Text;

  answerText: string;
}

export interface CheckQuestionAnswer extends BaseQuestionAnswer {
  kind: SurveyQuestionKind.Check;

  checkMark: boolean;
}

export interface RatingQuestionAnswer extends BaseQuestionAnswer {
  kind: SurveyQuestionKind.Rating;

  choice: ItemName;
  confidence: number; // Confidence in the choice, from 0 to 1
}

export interface ScaleQuestionAnswer extends BaseQuestionAnswer {
  kind: SurveyQuestionKind.Scale;

  score: number; // Score on a scale of 0 to 10
}

export type QuestionAnswer =
  | TextQuestionAnswer
  | CheckQuestionAnswer
  | RatingQuestionAnswer
  | ScaleQuestionAnswer;

// ********************************************************************************************* //
//                                       DEFAULT CONFIGS                                         //
// ********************************************************************************************* //

export const getDefaultTextQuestion = (): TextQuestionConfig => {
  return {
    id: 0,
    kind: SurveyQuestionKind.Text,
    questionText: '',
  };
};

export const getDefaultCheckQuestion = (): CheckQuestionConfig => {
  return {
    id: 0,
    kind: SurveyQuestionKind.Check,
    questionText: '',
  };
};

export const getDefaultItemRatingsQuestion = (): RatingQuestionConfig => {
  return {
    id: 0,
    kind: SurveyQuestionKind.Rating,
    questionText: '',
    item1: 'sextant',
    item2: 'shavingMirror',
  };
};

export const getDefaultScaleQuestion = (): ScaleQuestionConfig => {
  return {
    id: 0,
    kind: SurveyQuestionKind.Scale,
    questionText: '',
    upperBound: '',
    lowerBound: '',
  };
};
