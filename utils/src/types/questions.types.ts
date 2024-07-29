/** Survey question types */

export enum SurveyQuestionKind {
  Text = 'TextQuestion',
  Check = 'CheckQuestion',
  MultipleChoice = 'MultipleChoiceQuestion',
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

export interface MultipleChoiceQuestionConfig extends BaseQuestionConfig {
  kind: SurveyQuestionKind.MultipleChoice;
  options: MultipleChoiceItem[];
}

export interface MultipleChoiceItem {
  id: number;
  text: string;
}

export interface ScaleQuestionConfig extends BaseQuestionConfig {
  kind: SurveyQuestionKind.Scale;

  upperBound: string; // Description for the upper bound of the scale
  lowerBound: string; // Description for the lower bound of the scale
}

export type QuestionConfig =
  | TextQuestionConfig
  | CheckQuestionConfig
  | MultipleChoiceQuestionConfig
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

export interface MultipleChoiceQuestionAnswer extends BaseQuestionAnswer {
  kind: SurveyQuestionKind.MultipleChoice;
  choice: number; // ID of MultipleChoiceItem chosen
}

export interface ScaleQuestionAnswer extends BaseQuestionAnswer {
  kind: SurveyQuestionKind.Scale;

  score: number; // Score on a scale of 0 to 10
}

export type QuestionAnswer =
  | TextQuestionAnswer
  | CheckQuestionAnswer
  | MultipleChoiceQuestionAnswer
  | ScaleQuestionAnswer;