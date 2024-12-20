import { generateId } from '../shared';
import {
  BaseStageConfig,
  BaseStageParticipantAnswer,
  StageGame,
  StageKind,
  createStageTextConfig,
  createStageProgressConfig,
} from './stage';
import {
  MultipleChoiceItem
} from './survey_stage';

/** Comprehension stage types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

export interface ComprehensionStageConfig extends BaseStageConfig {
  kind: StageKind.COMPREHENSION;
  questions: ComprehensionQuestion[];
}

export enum ComprehensionQuestionKind {
  TEXT = 'text',
  MULTIPLE_CHOICE = 'mc',
}

export interface BaseComprehensionQuestion {
  id: string;
  kind: ComprehensionQuestionKind;
  questionTitle: string;
}

export type ComprehensionQuestion =
  | TextComprehensionQuestion
  | MultipleChoiceComprehensionQuestion;

export interface TextComprehensionQuestion extends BaseComprehensionQuestion {
  kind: ComprehensionQuestionKind.TEXT;
  correctAnswer: string;
}

export interface MultipleChoiceComprehensionQuestion extends BaseComprehensionQuestion {
  kind: ComprehensionQuestionKind.MULTIPLE_CHOICE;
  options: MultipleChoiceItem[];
  correctAnswerId: string;
}

export interface ComprehensionStageParticipantAnswer extends BaseStageParticipantAnswer {
  kind: StageKind.COMPREHENSION;
  answerMap: Record<string, string>; // question ID to answer
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create info stage. */
export function createComprehensionStage(
  config: Partial<ComprehensionStageConfig> = {}
): ComprehensionStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.COMPREHENSION,
    game: config.game ?? StageGame.NONE,
    name: config.name ?? 'Comprehension check',
    descriptions: config.descriptions ?? createStageTextConfig(),
    progress: config.progress ?? createStageProgressConfig(),
    questions: config.questions ?? [],
  };
}

/** Create multiple choice comprehension question. */
export function createMultipleChoiceComprehensionQuestion(
  config: Partial<MultipleChoiceComprehensionQuestion> = {},
  correctAnswerId: string,
): MultipleChoiceComprehensionQuestion {
  return {
    id: config.id ?? generateId(),
    kind: ComprehensionQuestionKind.MULTIPLE_CHOICE,
    questionTitle: config.questionTitle ?? '',
    options: config.options ?? [],
    correctAnswerId,
  }
}

/** Create comprehension stage participant answer. */
export function createComprehensionStageParticipantAnswer(
  config: Partial<ComprehensionStageParticipantAnswer> = {}
): ComprehensionStageParticipantAnswer {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.COMPREHENSION,
    answerMap: config.answerMap ?? {},
  }
}
