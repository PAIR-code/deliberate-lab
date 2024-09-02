import { generateId } from '../shared';
import {
  BaseStageConfig,
  BaseStageParticipantAnswer,
  BaseStagePublicData,
  StageGame,
  StageKind,
  createStageTextConfig,
} from './stage';

/** Survey stage types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

/**
 * SurveyStageConfig.
 *
 * This is saved as a stage doc under experiments/{experimentId}/stages
 */
export interface SurveyStageConfig extends BaseStageConfig {
  kind: StageKind.SURVEY;
  questions: SurveyQuestion[];
}

export enum SurveyQuestionKind {
  TEXT = 'text',
  CHECK = 'check', // checkbox
  MULTIPLE_CHOICE = 'mc', // multiple choice
  SCALE = 'scale', // e.g., "on a scale of 1 to 7"
}

export interface BaseSurveyQuestion {
  id: string;
  kind: SurveyQuestionKind;
  questionTitle: string;
}

export interface TextSurveyQuestion extends BaseSurveyQuestion {
  kind: SurveyQuestionKind.TEXT;
}

export interface CheckSurveyQuestion extends BaseSurveyQuestion {
  kind: SurveyQuestionKind.CHECK;
}

export interface MultipleChoiceSurveyQuestion extends BaseSurveyQuestion {
  kind: SurveyQuestionKind.MULTIPLE_CHOICE;
  options: MultipleChoiceItem[];
}

export interface MultipleChoiceItem {
  id: string;
  text: string;
  points: number; // number of points gained if selected (default to 0)
}

export interface ScaleSurveyQuestion extends BaseSurveyQuestion {
  kind: SurveyQuestionKind.SCALE;
  options: ScaleItem[];
}

export interface ScaleItem {
  id: string;
  value: number; // e.g., 1
  description: string; // e.g., "least likely"
}

export type SurveyQuestion =
  | TextSurveyQuestion
  | CheckSurveyQuestion
  | MultipleChoiceSurveyQuestion
  | ScaleSurveyQuestion;

/**
 * SurveyStageParticipantAnswer.
 *
 * This is saved as a stage doc (with stage ID as doc ID) under
 * experiments/{experimentId}/participants/{participantPrivateId}/stageData
 */
export interface SurveyStageParticipantAnswer extends BaseStageParticipantAnswer {
  kind: StageKind.SURVEY;
  answerMap: Record<string, SurveyAnswer>; // map of question ID to answer
}

export interface BaseSurveyAnswer {
  id: string;
  kind: SurveyQuestionKind;
}

export interface TextSurveyAnswer extends BaseSurveyAnswer {
  kind: SurveyQuestionKind.TEXT;
  answer: string; // Text response
}

export interface CheckSurveyAnswer extends BaseSurveyAnswer {
  kind: SurveyQuestionKind.CHECK;
  answer: boolean;
}

export interface MultipleChoiceSurveyAnswer extends BaseSurveyAnswer {
  kind: SurveyQuestionKind.MULTIPLE_CHOICE;
  answer: string; // ID of MultipleChoiceItem selected
}

export interface ScaleSurveyAnswer extends BaseSurveyAnswer {
  kind: SurveyQuestionKind.SCALE;
  answer: string; // ID of ScaleItem selected
}

export type SurveyAnswer =
  | TextSurveyAnswer
  | CheckSurveyAnswer
  | MultipleChoiceSurveyAnswer
  | ScaleSurveyAnswer;

/**
 * SurveyStagePublicData.
 *
 * This is saved as a stage doc (with stage ID as doc ID) under
 * experiments/{experimentId}/cohorts/{cohortId}/publicStageData
 */
export interface SurveyStagePublicData extends BaseStagePublicData {
  kind: StageKind.SURVEY;
  // Maps from participant to participant's answer map (question ID to answer)
  participantAnswerMap: Record<string, Record<string, SurveyAnswer>>;
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create survey stage. */
export function createSurveyStage(
  config: Partial<SurveyStageConfig> = {}
): SurveyStageConfig {
  return {
    id: generateId(),
    kind: StageKind.SURVEY,
    game: config.game ?? StageGame.NONE,
    name: config.name ?? 'Survey',
    descriptions: config.descriptions ?? createStageTextConfig(),
    questions: config.questions ?? [],
  };
}
