import {
  StageKind,
  SurveyAnswer,
  SurveyQuestion,
  SurveyQuestionKind
} from '@deliberation-lab/utils';

/** Returns required questions from survey stage. */
export function getRequiredSurveyQuestions(
  questions: SurveyQuestion[]
) {
  return questions.filter(
    question => !(question.kind === SurveyQuestionKind.CHECK && !question.isRequired)
  );
}

/** Returns optional questions from survey stage. */
export function getOptionalSurveyQuestions(
  questions: SurveyQuestion[]
) {
  return questions.filter(
    question => question.kind !== SurveyQuestionKind.CHECK || !question.isRequired
  );
}

/** Checks whether all required questions are answered. */
export function isSurveyComplete(
  questions: SurveyQuestion[], answerMap: Record<string, SurveyAnswer>
) {
  const required = getRequiredSurveyQuestions(questions);
  for (const question of required) {
    const answer = answerMap[question.id];
    if (
      !answer ||
      (answer.kind === SurveyQuestionKind.CHECK && !answer.isChecked) ||
      (answer.kind === SurveyQuestionKind.TEXT && answer.answer.trim() === '')
    ) {
      return false;
    }
  }

  return true;
}