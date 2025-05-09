import {getBaseStagePrompt} from './stage.prompts';
import {
  SurveyAnswer,
  SurveyStageConfig,
  SurveyQuestion,
  SurveyQuestionKind,
} from './survey_stage';

/** Prompt constants and utils for interacting with survey stage. */

/** Get survey stage context (e.g., to include in prompt)
 *  for given questions and answers.
 */
export function getSurveyStagePromptContext(
  stageConfig: SurveyStageConfig,
  includeStageInfo: boolean,
  questions: SurveyQuestion[],
  answerMap: Record<string, SurveyAnswer>,
) {
  return [
    getBaseStagePrompt(stageConfig, includeStageInfo),
    questions
      .map((question) =>
        getSurveyStageQuestion(question, answerMap[question.id]),
      )
      .join('\n\n'),
  ].join('\n');
}

/** Get survey question context for prompt. */
function getSurveyStageQuestion(
  question: SurveyQuestion,
  answer: SurveyAnswer | undefined,
) {
  switch (question.kind) {
    case SurveyQuestionKind.TEXT:
      const freeformAnswer = `\nYour answer: ${answer?.kind === SurveyQuestionKind.TEXT ? answer.answer : 'none'}`;
      return `Question: ${question.questionTitle}${freeformAnswer}`;
    case SurveyQuestionKind.CHECK:
      const checkAnswer = `\nAnswer: ${answer?.kind === SurveyQuestionKind.CHECK ? answer.isChecked : 'none'}`;
      return `Question: ${question.questionTitle}${checkAnswer}`;
    case SurveyQuestionKind.MULTIPLE_CHOICE:
      const options = question.options
        .map((option) => `- ${option.text}`)
        .join('\n');
      const mcText =
        answer?.kind === SurveyQuestionKind.MULTIPLE_CHOICE
          ? (question.options.find(
              (question) => question.id === answer.choiceId,
            )?.text ?? 'none')
          : 'none';
      return `Question: ${question.questionTitle}\nAnswer: ${mcText}`;
    case SurveyQuestionKind.SCALE:
      const scaleAnswer = `\nAnswer: ${answer?.kind === SurveyQuestionKind.SCALE ? answer.value : 'none'}`;
      return `Question: ${question.questionTitle}${scaleAnswer}`;
    default:
      return '';
  }
}

/** Create prompt for current agent participant to complete
 *  survey question.
 */
export function createAgentParticipantSurveyQuestionPrompt(
  question: SurveyQuestion,
) {
  switch (question.kind) {
    case SurveyQuestionKind.TEXT:
      return `Please answer the following question: ${question.questionTitle}`;
    case SurveyQuestionKind.CHECK:
      return `${question.questionTitle}\nRespond true if you agree, otherwise false.`;
    case SurveyQuestionKind.MULTIPLE_CHOICE:
      const options = question.options
        .map((option) => `- ${option.id}: ${option.text}`)
        .join('\n');
      return `${question.questionTitle}\n${options}\nRespond with the ID of the choice you'd like to pick:`;
    case SurveyQuestionKind.SCALE:
      return `${question.questionTitle}\nRespond with a number between ${question.lowerValue} and ${question.upperValue}, where ${question.lowerValue} is ${question.lowerText} and ${question.upperValue} is ${question.upperText}.`;
    default:
      return '';
  }
}
