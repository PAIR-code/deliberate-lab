import {
  ChatMessage,
  CheckSurveyAnswer,
  ConditionTargetReference,
  evaluateCondition,
  extractConditionDependencies,
  extractMultipleConditionDependencies,
  MultipleChoiceSurveyAnswer,
  ScaleSurveyAnswer,
  StageKind,
  StageParticipantAnswer,
  SurveyAnswer,
  SurveyQuestion,
  SurveyQuestionKind,
  SurveyStageParticipantAnswer,
  SurveyPerParticipantStageParticipantAnswer,
  TextSurveyAnswer,
  UnifiedTimestamp,
} from '@deliberation-lab/utils';
import {Timestamp} from 'firebase/firestore';

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
    if (!isSurveyAnswerComplete(answer)) {
      return false;
    }
  }

  return true;
}

/** Checks whether given survey answer is complete. */
export function isSurveyAnswerComplete(answer: SurveyAnswer | undefined) {
  if (
    !answer ||
    (answer.kind === SurveyQuestionKind.CHECK && !answer.isChecked) ||
    (answer.kind === SurveyQuestionKind.TEXT && answer.answer.trim() === '')
  ) {
    return false;
  }
  return true;
}

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
  const targetValues = getConditionDependencyValues(
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
  const targetValues = getConditionDependencyValues(
    dependencies,
    currentStageId,
    currentStageAnswers,
    allStageAnswers,
    targetParticipantId,
  );

  return evaluateCondition(question.condition, targetValues);
}

/** Get the actual answer values for the specified dependencies. */
function getConditionDependencyValues(
  dependencies: ConditionTargetReference[],
  currentStageId: string,
  currentStageAnswers: Record<string, SurveyAnswer>,
  allStageAnswers?: Record<string, StageParticipantAnswer>,
  targetParticipantId?: string, // For survey-per-participant: which participant is being evaluated
): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  for (const targetRef of dependencies) {
    // Build the key for this dependency
    // Using :: as separator since it's unlikely to appear in IDs
    const dataKey = `${targetRef.stageId}::${targetRef.questionId}`;

    if (targetRef.stageId === currentStageId) {
      // Reference to current stage
      const answer = currentStageAnswers[targetRef.questionId];
      if (answer) {
        values[dataKey] = extractAnswerValue(answer);
      }
    } else if (allStageAnswers && allStageAnswers[targetRef.stageId]) {
      // Reference to another stage
      const stageAnswer = allStageAnswers[targetRef.stageId];
      if (stageAnswer && 'answerMap' in stageAnswer) {
        if (stageAnswer.kind === StageKind.SURVEY) {
          // Regular survey stage
          const surveyAnswer = stageAnswer as SurveyStageParticipantAnswer;
          const answer = surveyAnswer.answerMap[targetRef.questionId];
          if (answer) {
            values[dataKey] = extractAnswerValue(answer);
          }
        } else if (stageAnswer.kind === StageKind.SURVEY_PER_PARTICIPANT) {
          // Survey-per-participant: get answer about the target participant
          const surveyAnswer =
            stageAnswer as SurveyPerParticipantStageParticipantAnswer;

          // For cross-stage references, we need targetParticipantId to know which answer to use
          if (
            targetParticipantId &&
            surveyAnswer.answerMap[targetRef.questionId]
          ) {
            const participantAnswers =
              surveyAnswer.answerMap[targetRef.questionId];
            if (participantAnswers && participantAnswers[targetParticipantId]) {
              const answer = participantAnswers[targetParticipantId];
              values[dataKey] = extractAnswerValue(answer);
            }
          }
        }
      }
    }
  }

  return values;
}

/** Extract the value from a survey answer */
function extractAnswerValue(
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

/** Returns the timestamp of the first chat message, or null if none. */
export function getChatStartTimestamp(
  chatStageId: string,
  chatMap: Record<string, ChatMessage[]>,
): UnifiedTimestamp | null {
  const messages = chatMap[chatStageId] ?? [];
  if (messages.length) {
    return messages[0].timestamp;
  }
  return null;
}

/** Returns time elapsed in seconds since chat started, or null if not started. */
export function getChatTimeElapsedInSeconds(
  chatStageId: string,
  chatMap: Record<string, ChatMessage[]>,
): number | null {
  const start = getChatStartTimestamp(chatStageId, chatMap);
  if (!start) return null;
  return Timestamp.now().seconds - start.seconds;
}

/** Returns time remaining in seconds for the chat, or null if not started or no limit. */
export function getChatTimeRemainingInSeconds(
  chatStage: {id: string; timeLimitInMinutes: number | null} | null | undefined,
  chatMap: Record<string, ChatMessage[]>,
): number | null {
  if (!chatStage || !chatStage.timeLimitInMinutes) return null;
  const elapsed = getChatTimeElapsedInSeconds(chatStage.id, chatMap);
  if (elapsed == null) return null;
  const remaining = chatStage.timeLimitInMinutes * 60 - elapsed;
  return remaining > 0 ? Math.floor(remaining) : 0;
}
