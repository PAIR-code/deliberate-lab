import {
  StageKind,
  SurveyAnswer,
  SurveyStageConfig,
  SurveyQuestionKind
} from '@deliberation-lab/utils';

/** Returns required questions from survey stage. */
export function getRequiredSurveyQuestions(stage: SurveyStageConfig) {
  return stage.questions.filter(
    question => !(question.kind === SurveyQuestionKind.CHECK && !question.isRequired)
  );
}

/** Returns optional questions from survey stage. */
export function getOptionalSurveyQuestions(stage: SurveyStageConfig) {
  return stage.questions.filter(
    question => question.kind !== SurveyQuestionKind.CHECK || !question.isRequired
  );
}

/** Checks whether all required questions are answered. */
export function isSurveyComplete(
  stage: SurveyStageConfig, answerMap: Record<string, SurveyAnswer>
) {
  const questions = getRequiredSurveyQuestions(stage);
  for (const question of questions) {
    const answer = answerMap[question.id];
    if (
      !answer ||
      (answer.kind === SurveyQuestionKind.CHECK && !answer.isChecked)
    ) {
      return false;
    }
  }

  return true;
}