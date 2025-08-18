import {
  ChatMessage,
  SurveyAnswer,
  SurveyQuestion,
  SurveyQuestionKind,
  TextSurveyAnswer,
  TextSurveyQuestion,
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
    // Check text character validation separately
    if (
      question.kind === SurveyQuestionKind.TEXT &&
      answer?.kind === SurveyQuestionKind.TEXT
    ) {
      if (!isTextAnswerValid(answer, question)) {
        return false;
      }
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

/** Checks whether text answer meets character count requirements. */
export function isTextAnswerValid(
  answer: TextSurveyAnswer,
  question: TextSurveyQuestion,
): boolean {
  const length = answer.answer.trim().length;
  // Only need to check minimum since maxlength attribute prevents exceeding max
  if (question.minCharCount !== undefined && length < question.minCharCount) {
    return false;
  }
  return true;
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
