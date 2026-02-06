/**
 * Condition utilities for resolving target values from stage answers.
 *
 * This module provides functions to extract condition target values from
 * various stage answer data structures, enabling condition evaluation
 * across different contexts (survey display, prompt building, transfers, etc).
 */

import {
  ConditionTargetReference,
  getConditionTargetKey,
  extractMultipleConditionDependencies,
  extractConditionDependencies,
  evaluateCondition,
  Condition,
} from './condition';
import {StageKind, StageConfig, StageParticipantAnswer} from '../stages/stage';
import {
  SurveyStageConfig,
  SurveyPerParticipantStageConfig,
  SurveyStageParticipantAnswer,
  SurveyPerParticipantStageParticipantAnswer,
  SurveyAnswer,
  SurveyQuestion,
  SurveyQuestionKind,
  MultipleChoiceSurveyQuestion,
  extractAnswerValue,
} from '../stages/survey_stage';

/**
 * Get condition dependency values from a map of stage answers.
 *
 * This is the primary utility for getting condition values from completed stage answers.
 * It handles both regular Survey stages and SurveyPerParticipant stages.
 *
 * @param dependencies - The condition target references to resolve
 * @param stageAnswers - Map of stageId to StageParticipantAnswer
 * @param targetParticipantId - For SurveyPerParticipant stages, which participant's answers to use
 * @returns Map of target keys (stageId::questionId) to their resolved values
 */
export function getConditionDependencyValues(
  dependencies: ConditionTargetReference[],
  stageAnswers: Record<string, StageParticipantAnswer>,
  targetParticipantId?: string,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  for (const targetRef of dependencies) {
    const dataKey = getConditionTargetKey(targetRef);
    const stageAnswer = stageAnswers[targetRef.stageId];

    if (!stageAnswer || !('answerMap' in stageAnswer)) {
      continue;
    }

    if (stageAnswer.kind === StageKind.SURVEY) {
      const surveyAnswer = stageAnswer as SurveyStageParticipantAnswer;
      const answer = surveyAnswer.answerMap[targetRef.questionId];
      if (answer) {
        values[dataKey] = extractAnswerValue(answer);
      }
    } else if (stageAnswer.kind === StageKind.SURVEY_PER_PARTICIPANT) {
      // For SurveyPerParticipant stages, we need targetParticipantId to know which answer to use
      if (targetParticipantId) {
        const surveyAnswer =
          stageAnswer as SurveyPerParticipantStageParticipantAnswer;
        const participantAnswers = surveyAnswer.answerMap[targetRef.questionId];
        if (participantAnswers && participantAnswers[targetParticipantId]) {
          values[dataKey] = extractAnswerValue(
            participantAnswers[targetParticipantId],
          );
        }
      }
    }
  }

  return values;
}

/**
 * Get condition dependency values, including current stage answers that may not be persisted yet.
 *
 * Use this when evaluating conditions during active survey completion, where the current
 * stage's answers are in a local map (not yet saved to Firestore).
 *
 * @param dependencies - The condition target references to resolve
 * @param currentStageId - The ID of the stage currently being worked on
 * @param currentStageAnswers - Map of questionId to SurveyAnswer for the current stage
 * @param allStageAnswers - Map of stageId to StageParticipantAnswer for other stages
 * @param targetParticipantId - For SurveyPerParticipant stages, which participant's answers to use
 */
export function getConditionDependencyValuesWithCurrentStage(
  dependencies: ConditionTargetReference[],
  currentStageId: string,
  currentStageAnswers: Record<string, SurveyAnswer>,
  allStageAnswers?: Record<string, StageParticipantAnswer>,
  targetParticipantId?: string,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  for (const targetRef of dependencies) {
    const dataKey = getConditionTargetKey(targetRef);

    if (targetRef.stageId === currentStageId) {
      // Reference to current stage - use local answers
      const answer = currentStageAnswers[targetRef.questionId];
      if (answer) {
        values[dataKey] = extractAnswerValue(answer);
      }
    } else if (allStageAnswers) {
      // Reference to another stage - use persisted answers
      const stageValues = getConditionDependencyValues(
        [targetRef],
        allStageAnswers,
        targetParticipantId,
      );
      Object.assign(values, stageValues);
    }
  }

  return values;
}

/**
 * Evaluate a condition against stage answers.
 *
 * Convenience function that combines dependency extraction, value resolution,
 * and condition evaluation in one call.
 *
 * @param condition - The condition to evaluate
 * @param stageAnswers - Map of stageId to StageParticipantAnswer
 * @param targetParticipantId - For SurveyPerParticipant stages, which participant's answers to use
 * @returns true if condition passes (or if condition is undefined)
 */
export function evaluateConditionWithStageAnswers(
  condition: Condition | undefined,
  stageAnswers: Record<string, StageParticipantAnswer>,
  targetParticipantId?: string,
): boolean {
  if (!condition) return true;

  const dependencies = extractMultipleConditionDependencies([condition]);
  const targetValues = getConditionDependencyValues(
    dependencies,
    stageAnswers,
    targetParticipantId,
  );

  return evaluateCondition(condition, targetValues);
}

/**
 * Filter items with conditions based on stage answers.
 *
 * Generic utility to filter any array of items that have optional conditions.
 *
 * @param items - Array of items, each potentially having a `condition` property
 * @param stageAnswers - Map of stageId to StageParticipantAnswer
 * @param targetParticipantId - For SurveyPerParticipant stages, which participant's answers to use
 * @returns Filtered array containing only items whose conditions pass
 */
export function filterByCondition<T extends {condition?: Condition}>(
  items: T[],
  stageAnswers: Record<string, StageParticipantAnswer>,
  targetParticipantId?: string,
): T[] {
  // Extract all dependencies upfront for efficiency
  const allConditions = items
    .map((item) => item.condition)
    .filter((c): c is Condition => c !== undefined);

  if (allConditions.length === 0) {
    return items;
  }

  const allDependencies = extractMultipleConditionDependencies(allConditions);
  const targetValues = getConditionDependencyValues(
    allDependencies,
    stageAnswers,
    targetParticipantId,
  );

  return items.filter((item) => {
    if (!item.condition) return true;
    return evaluateCondition(item.condition, targetValues);
  });
}

// ============================================================================
// Condition Target Utilities
// ============================================================================

/**
 * Readable representation of a possible target for a condition.
 * Used to populate dropdowns in condition editors.
 */
export interface ConditionTarget {
  ref: ConditionTargetReference;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'choice';
  choices?: Array<{id: string; label: string}>;
  stageName?: string;
}

/** Convert survey questions to condition targets for the editor UI. */
export function surveyQuestionsToConditionTargets(
  questions: SurveyQuestion[],
  stageId: string,
  stageName?: string,
): ConditionTarget[] {
  return questions.map((q) => {
    let type: ConditionTarget['type'] = 'text';
    let choices: ConditionTarget['choices'] = undefined;

    switch (q.kind) {
      case SurveyQuestionKind.TEXT:
        type = 'text';
        break;
      case SurveyQuestionKind.CHECK:
        type = 'boolean';
        break;
      case SurveyQuestionKind.SCALE:
        type = 'number';
        break;
      case SurveyQuestionKind.MULTIPLE_CHOICE:
        type = 'choice';
        const mcQuestion = q as MultipleChoiceSurveyQuestion;
        choices = mcQuestion.options.map((opt) => ({
          id: opt.id,
          label: opt.text || `Option ${opt.id}`,
        }));
        break;
    }

    const ref: ConditionTargetReference = {
      stageId: stageId,
      questionId: q.id,
    };

    const label = q.questionTitle || `Question ${q.id}`;

    return {
      ref,
      label,
      type,
      choices,
      stageName,
    };
  });
}

/**
 * Get condition targets from stages preceding (and optionally including) the specified stage.
 *
 * @param stages - All stages in the experiment
 * @param currentStageId - The ID of the current stage
 * @param options - Configuration options
 * @param options.includeCurrentStage - Whether to include the current stage (default: true)
 * @param options.currentStageQuestionIndex - If including current stage, only include questions before this index
 * @returns Array of condition targets from qualifying stages
 */
export function getConditionTargetsFromStages(
  stages: StageConfig[],
  currentStageId: string,
  options: {
    includeCurrentStage?: boolean;
    currentStageQuestionIndex?: number;
  } = {},
): ConditionTarget[] {
  const {includeCurrentStage = true, currentStageQuestionIndex} = options;

  const currentStageIndex = stages.findIndex(
    (stage) => stage.id === currentStageId,
  );

  if (currentStageIndex < 0) {
    return [];
  }

  const targets: ConditionTarget[] = [];

  const endIndex = includeCurrentStage
    ? currentStageIndex + 1
    : currentStageIndex;

  for (let i = 0; i < endIndex; i++) {
    const stage = stages[i];

    if (
      stage.kind === StageKind.SURVEY ||
      stage.kind === StageKind.SURVEY_PER_PARTICIPANT
    ) {
      const surveyStage = stage as
        | SurveyStageConfig
        | SurveyPerParticipantStageConfig;

      let questions = surveyStage.questions;

      // If this is the current stage and we have a question index, slice the questions
      if (i === currentStageIndex && currentStageQuestionIndex !== undefined) {
        questions = questions.slice(0, currentStageQuestionIndex);
      }

      const stageTargets = surveyQuestionsToConditionTargets(
        questions,
        stage.id,
        stage.name,
      );
      targets.push(...stageTargets);
    }
  }

  return targets;
}

/**
 * Sanitize survey question conditions to ensure they only reference valid targets.
 *
 * A condition is invalid if it references:
 * - A question that doesn't exist in the list
 * - A question that comes at or after the current question's position
 *
 * Invalid conditions are cleared (set to undefined) to prevent rendering issues.
 *
 * @param questions - The list of survey questions to sanitize
 * @param stageId - The ID of the stage containing these questions
 * @returns A new array with invalid conditions cleared
 */
export function sanitizeSurveyQuestionConditions<
  T extends {id: string; condition?: Condition},
>(questions: T[], stageId: string): T[] {
  // Build a map of question ID to its index in the ordering
  const questionIndexMap = new Map<string, number>();
  questions.forEach((q, idx) => {
    questionIndexMap.set(q.id, idx);
  });

  return questions.map((question, index) => {
    if (!question.condition) return question;

    const dependencies = extractConditionDependencies(question.condition);

    // Check if any dependency in the same stage is invalid
    const hasInvalidDependency = dependencies.some((dep) => {
      if (dep.stageId !== stageId) return false; // Other stages are fine

      const refIndex = questionIndexMap.get(dep.questionId);
      // Invalid if: question doesn't exist, or comes at/after current position
      return refIndex === undefined || refIndex >= index;
    });

    if (hasInvalidDependency) {
      return {...question, condition: undefined};
    }
    return question;
  });
}
