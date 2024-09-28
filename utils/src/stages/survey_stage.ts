import { generateId } from '../shared';
import {
  BaseStageConfig,
  BaseStageParticipantAnswer,
  BaseStagePublicData,
  StageGame,
  StageKind,
  createStageProgressConfig,
  createStageTextConfig,
  RevealAudience,
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
  revealAudience: RevealAudience;
  revealScorableOnly: boolean;
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
  // ID of correct MultipleChoiceItem, or null if no correct answer
  correctAnswerId: string|null;
}

export interface MultipleChoiceItem {
  id: string;
  imageId: string; // or empty if no image provided
  text: string;
}

export interface ScaleSurveyQuestion extends BaseSurveyQuestion {
  kind: SurveyQuestionKind.SCALE;
  upperValue: number;
  upperText: string;
  lowerValue: number; // min 0
  lowerText: string;
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
  isChecked: boolean;
}

export interface MultipleChoiceSurveyAnswer extends BaseSurveyAnswer {
  kind: SurveyQuestionKind.MULTIPLE_CHOICE;
  choiceId: string; // ID of MultipleChoiceItem selected
}

export interface ScaleSurveyAnswer extends BaseSurveyAnswer {
  kind: SurveyQuestionKind.SCALE;
  value: number; // number value selected
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
    id: config.id ?? generateId(),
    kind: StageKind.SURVEY,
    game: config.game ?? StageGame.NONE,
    name: config.name ?? 'Survey',
    descriptions: config.descriptions ?? createStageTextConfig(),
    progress: config.progress ?? createStageProgressConfig(),
    questions: config.questions ?? [],
    revealAudience: config.revealAudience ?? RevealAudience.CURRENT_PARTICIPANT,
    revealScorableOnly: config.revealScorableOnly ?? false,
  };
}

/** Create checkbox question. */
export function createCheckSurveyQuestion(
  config: Partial<CheckSurveyQuestion> = {}
): CheckSurveyQuestion {
  return {
    id: config.id ?? generateId(),
    kind: SurveyQuestionKind.CHECK,
    questionTitle: config.questionTitle ?? '',
  }
}

/** Create text question. */
export function createTextSurveyQuestion(
  config: Partial<TextSurveyQuestion> = {}
): TextSurveyQuestion {
  return {
    id: config.id ?? generateId(),
    kind: SurveyQuestionKind.TEXT,
    questionTitle: config.questionTitle ?? '',
  }
}

/** Create multiple choice question. */
export function createMultipleChoiceSurveyQuestion(
  config: Partial<MultipleChoiceSurveyQuestion> = {}
): MultipleChoiceSurveyQuestion {
  return {
    id: config.id ?? generateId(),
    kind: SurveyQuestionKind.MULTIPLE_CHOICE,
    questionTitle: config.questionTitle ?? '',
    options: config.options ?? [],
    correctAnswerId: config.correctAnswerId ?? null,
  }
}

/** Create multiple choice item. */
export function createMultipleChoiceItem(
  config: Partial<MultipleChoiceItem> = {}
): MultipleChoiceItem {
  return {
    id: config.id ?? generateId(),
    imageId: config.imageId ?? '',
    text: config.text ?? '',
  }
}

/** Create scale question. */
export function createScaleSurveyQuestion(
  config: Partial<ScaleSurveyQuestion> = {}
): ScaleSurveyQuestion {
  return {
    id: config.id ?? generateId(),
    kind: SurveyQuestionKind.SCALE,
    questionTitle: config.questionTitle ?? '',
    upperValue: config.upperValue ?? 10,
    upperText: config.upperText ?? '',
    lowerValue: config.lowerValue ?? 0,
    lowerText: config.lowerText ?? '',
  }
}

/** Create survey stage participant answer. */
export function createSurveyStageParticipantAnswer(
  config: Partial<SurveyStageParticipantAnswer> = {}
): SurveyStageParticipantAnswer {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.SURVEY,
    answerMap: config.answerMap ?? {},
  }
}

/** Create survey stage public data. */
export function createSurveyStagePublicData(
  id: string, // stage ID
): SurveyStagePublicData {
  return {
    id,
    kind: StageKind.SURVEY,
    participantAnswerMap: {},
  };
}

/** Returns true if any multiple choice options contain an image. */
export function isMultipleChoiceImageQuestion(
  question: MultipleChoiceSurveyQuestion
) {
  for (const option of question.options) {
    if (option.imageId.length > 0) {
      return true;
    }
  }
  return false;
}