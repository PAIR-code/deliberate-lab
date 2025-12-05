import {generateId} from '../shared';
import {
  Condition,
  evaluateCondition,
  extractConditionDependencies,
  extractMultipleConditionDependencies,
} from '../utils/condition';
import {getConditionDependencyValuesWithCurrentStage} from '../utils/condition.utils';
import {
  BaseStageConfig,
  BaseStageParticipantAnswer,
  BaseStagePublicData,
  StageKind,
  StageParticipantAnswer,
  createStageProgressConfig,
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

/** Special "survey per participant" stage
 * with each question asked for each participant. */
export interface SurveyPerParticipantStageConfig extends BaseStageConfig {
  kind: StageKind.SURVEY_PER_PARTICIPANT;
  enableSelfSurvey: boolean; // Whether to show survey for oneself.
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
  condition?: Condition; // Optional condition for showing/hiding the question
}

export interface TextSurveyQuestion extends BaseSurveyQuestion {
  kind: SurveyQuestionKind.TEXT;
  minCharCount?: number; // Minimum character count for validation
  maxCharCount?: number; // Maximum character count for validation
}

export interface CheckSurveyQuestion extends BaseSurveyQuestion {
  kind: SurveyQuestionKind.CHECK;
  isRequired: boolean; // Whether a check is required.
}

export interface MultipleChoiceSurveyQuestion extends BaseSurveyQuestion {
  kind: SurveyQuestionKind.MULTIPLE_CHOICE;
  options: MultipleChoiceItem[];
  // ID of correct MultipleChoiceItem, or null if no correct answer
  correctAnswerId: string | null;
}

export interface MultipleChoiceItem {
  id: string;
  imageId: string; // image URL, or empty if no image provided
  text: string;
}

export interface ScaleSurveyQuestion extends BaseSurveyQuestion {
  kind: SurveyQuestionKind.SCALE;
  upperValue: number;
  upperText: string;
  lowerValue: number; // min 0
  lowerText: string;
  middleText: string; // Optional text to display in the center of the scale
  useSlider: boolean; // Whether to display as slider instead of radio buttons
  stepSize: number; // Step size for the scale (defaults to 1)
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

/** Special "survey per participant" stage
 * with each question asked for each participant. */
export interface SurveyPerParticipantStageParticipantAnswer extends BaseStageParticipantAnswer {
  kind: StageKind.SURVEY_PER_PARTICIPANT;
  // map of question ID to (map of participant public ID to answer)
  answerMap: Record<string, Record<string, SurveyAnswer>>;
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
  config: Partial<SurveyStageConfig> = {},
): SurveyStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.SURVEY,
    name: config.name ?? 'Survey',
    descriptions: config.descriptions ?? createStageTextConfig(),
    progress: config.progress ?? createStageProgressConfig(),
    questions: config.questions ?? [],
  };
}

/** Create special "survey per participant" stage
 * with each question asked for each participant. */
export function createSurveyPerParticipantStage(
  config: Partial<SurveyPerParticipantStageConfig> = {},
): SurveyPerParticipantStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.SURVEY_PER_PARTICIPANT,
    name: config.name ?? 'Survey per participant',
    descriptions: config.descriptions ?? createStageTextConfig(),
    progress: config.progress ?? createStageProgressConfig(),
    questions: config.questions ?? [],
    enableSelfSurvey: config.enableSelfSurvey ?? false,
  };
}

/** Create checkbox question. */
export function createCheckSurveyQuestion(
  config: Partial<CheckSurveyQuestion> = {},
): CheckSurveyQuestion {
  return {
    id: config.id ?? generateId(),
    kind: SurveyQuestionKind.CHECK,
    questionTitle: config.questionTitle ?? '',
    isRequired: config.isRequired ?? false,
    condition: config.condition,
  };
}

/** Create text question. */
export function createTextSurveyQuestion(
  config: Partial<TextSurveyQuestion> = {},
): TextSurveyQuestion {
  return {
    id: config.id ?? generateId(),
    kind: SurveyQuestionKind.TEXT,
    questionTitle: config.questionTitle ?? '',
    minCharCount: config.minCharCount,
    maxCharCount: config.maxCharCount,
    condition: config.condition,
  };
}

/** Create multiple choice question. */
export function createMultipleChoiceSurveyQuestion(
  config: Partial<MultipleChoiceSurveyQuestion> = {},
): MultipleChoiceSurveyQuestion {
  return {
    id: config.id ?? generateId(),
    kind: SurveyQuestionKind.MULTIPLE_CHOICE,
    questionTitle: config.questionTitle ?? '',
    options: config.options ?? [],
    correctAnswerId: config.correctAnswerId ?? null,
    condition: config.condition,
  };
}

/** Create multiple choice item. */
export function createMultipleChoiceItem(
  config: Partial<MultipleChoiceItem> = {},
): MultipleChoiceItem {
  return {
    id: config.id ?? generateId(),
    imageId: config.imageId ?? '',
    text: config.text ?? '',
  };
}

/** Create scale question. */
export function createScaleSurveyQuestion(
  config: Partial<ScaleSurveyQuestion> = {},
): ScaleSurveyQuestion {
  return {
    id: config.id ?? generateId(),
    kind: SurveyQuestionKind.SCALE,
    questionTitle: config.questionTitle ?? '',
    upperValue: config.upperValue ?? 10,
    upperText: config.upperText ?? '',
    lowerValue: config.lowerValue ?? 0,
    lowerText: config.lowerText ?? '',
    middleText: config.middleText ?? '',
    useSlider: config.useSlider ?? false,
    stepSize: config.stepSize ?? 1,
    condition: config.condition,
  };
}

/** Create survey stage participant answer. */
export function createSurveyStageParticipantAnswer(
  config: Partial<SurveyStageParticipantAnswer> = {},
): SurveyStageParticipantAnswer {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.SURVEY,
    answerMap: config.answerMap ?? {},
  };
}

/** Create special "survey per participant" stage answer
 * with each question asked for each participant. */
export function createSurveyPerParticipantStageParticipantAnswer(
  config: Partial<SurveyPerParticipantStageParticipantAnswer> = {},
): SurveyPerParticipantStageParticipantAnswer {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.SURVEY_PER_PARTICIPANT,
    answerMap: config.answerMap ?? {},
  };
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
  question: MultipleChoiceSurveyQuestion,
) {
  for (const option of question.options) {
    if (option.imageId.length > 0) {
      return true;
    }
  }
  return false;
}

// ************************************************************************* //
// VISIBILITY UTILITIES                                                      //
// ************************************************************************* //

/** Returns only questions that should be visible based on their conditions. */
export function getVisibleSurveyQuestions(
  questions: SurveyQuestion[],
  currentStageId: string,
  currentStageAnswers: Record<string, SurveyAnswer>,
  allStageAnswers?: Record<string, StageParticipantAnswer>, // Map of stageId to answer data
  targetParticipantId?: string, // For survey-per-participant: which participant is being evaluated
): SurveyQuestion[] {
  // Extract all dependencies from all question conditions
  const allDependencies = extractMultipleConditionDependencies(
    questions.map((q) => q.condition),
  );

  // Get the actual values for all condition targets
  const targetValues = getConditionDependencyValuesWithCurrentStage(
    allDependencies,
    currentStageId,
    currentStageAnswers,
    allStageAnswers,
    targetParticipantId,
  );

  return questions.filter((question) => {
    if (!question.condition) {
      return true; // No condition means always show
    }
    return evaluateCondition(question.condition, targetValues);
  });
}

/** Evaluate a single question's visibility. */
export function isQuestionVisible(
  question: SurveyQuestion,
  currentStageId: string,
  currentStageAnswers: Record<string, SurveyAnswer>,
  allStageAnswers?: Record<string, StageParticipantAnswer>,
  targetParticipantId?: string, // For survey-per-participant: which participant is being evaluated
): boolean {
  if (!question.condition) {
    return true; // No condition means always show
  }

  // Extract only this question's dependencies
  const dependencies = extractConditionDependencies(question.condition);

  // Get the actual values for this question's condition targets
  const targetValues = getConditionDependencyValuesWithCurrentStage(
    dependencies,
    currentStageId,
    currentStageAnswers,
    allStageAnswers,
    targetParticipantId,
  );

  return evaluateCondition(question.condition, targetValues);
}

/** Extract the value from a survey answer */
export function extractAnswerValue(
  answer: SurveyAnswer,
): string | number | boolean | undefined {
  switch (answer.kind) {
    case SurveyQuestionKind.CHECK:
      return (answer as CheckSurveyAnswer).isChecked;
    case SurveyQuestionKind.MULTIPLE_CHOICE:
      return (answer as MultipleChoiceSurveyAnswer).choiceId;
    case SurveyQuestionKind.SCALE:
      return (answer as ScaleSurveyAnswer).value;
    case SurveyQuestionKind.TEXT:
      return (answer as TextSurveyAnswer).answer;
    default:
      return undefined;
  }
}

// ************************************************************************* //
// HELPER FUNCTIONS                                                          //
// ************************************************************************* //

/** Returns required questions from survey stage. */
export function getRequiredSurveyQuestions(questions: SurveyQuestion[]) {
  return questions.filter(
    (question) =>
      !(question.kind === SurveyQuestionKind.CHECK && !question.isRequired),
  );
}

/** Returns optional questions from survey stage. */
export function getOptionalSurveyQuestions(questions: SurveyQuestion[]) {
  return questions.filter(
    (question) =>
      question.kind !== SurveyQuestionKind.CHECK || !question.isRequired,
  );
}

/** Checks whether all required questions are answered. */
export function isSurveyComplete(
  questions: SurveyQuestion[],
  answerMap: Record<string, SurveyAnswer>,
) {
  const required = getRequiredSurveyQuestions(questions);
  for (const question of required) {
    const answer = answerMap[question.id];
    if (!isSurveyAnswerComplete(answer, question)) {
      return false;
    }
  }

  return true;
}

/** Checks whether given survey answer is complete.
 * Optionally include SurveyQuestion if there are additional validation constraints.
 */
export function isSurveyAnswerComplete(
  answer: SurveyAnswer | undefined,
  question?: SurveyQuestion,
) {
  if (!answer) {
    return false;
  }

  switch (answer.kind) {
    case SurveyQuestionKind.CHECK:
      return (answer as CheckSurveyAnswer).isChecked;

    case SurveyQuestionKind.TEXT:
      const textAnswer = answer as TextSurveyAnswer;
      // Check if text exists
      if (textAnswer.answer.trim() === '') {
        return false;
      }
      // Check character count requirements if question provided
      if (question && question.kind === SurveyQuestionKind.TEXT) {
        const textQuestion = question as TextSurveyQuestion;
        const length = textAnswer.answer.trim().length;
        if (
          textQuestion.minCharCount !== undefined &&
          length < textQuestion.minCharCount
        ) {
          return false;
        }
      }
      return true;
    default:
      // All other answer types are complete as long as they exist
      return true;
  }
}
