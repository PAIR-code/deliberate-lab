import {getBaseStagePrompt} from './stage.prompts';
import {StageKind} from './stage';
import {
  SurveyAnswer,
  SurveyStageConfig,
  SurveyPerParticipantStageConfig,
  SurveyStageParticipantAnswer,
  SurveyPerParticipantStageParticipantAnswer,
  SurveyQuestion,
  SurveyQuestionKind,
  TextSurveyQuestion,
  TextSurveyAnswer,
  CheckSurveyQuestion,
  CheckSurveyAnswer,
  MultipleChoiceSurveyQuestion,
  MultipleChoiceSurveyAnswer,
  ScaleSurveyQuestion,
  ScaleSurveyAnswer,
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

// ************************************************************************* //
// PROMPT UTILITIES FOR STAGECONTEXT                                         //
// ************************************************************************* //

export function getSurveySummaryText(
  stage: SurveyStageConfig | SurveyPerParticipantStageConfig,
): string {
  const questionSummaries = stage.questions.map((question) => {
    let questionText = `* ${question.questionTitle}`;

    switch (question.kind) {
      case SurveyQuestionKind.TEXT:
        const textQ = question as TextSurveyQuestion;
        if (textQ.minCharCount || textQ.maxCharCount) {
          const constraints = [];
          if (textQ.minCharCount)
            constraints.push(`min ${textQ.minCharCount} chars`);
          if (textQ.maxCharCount)
            constraints.push(`max ${textQ.maxCharCount} chars`);
          questionText += ` (Text response: ${constraints.join(', ')})`;
        } else {
          questionText += ' (Text response)';
        }
        break;
      case SurveyQuestionKind.CHECK:
        const checkQ = question as CheckSurveyQuestion;
        questionText += ` (Checkbox${checkQ.isRequired ? ', required' : ''})`;
        break;
      case SurveyQuestionKind.MULTIPLE_CHOICE:
        const mcQ = question as MultipleChoiceSurveyQuestion;
        const options = mcQ.options.map((opt) => opt.text).join(', ');
        questionText += ` (Multiple choice: ${options})`;
        break;
      case SurveyQuestionKind.SCALE:
        const scaleQ = question as ScaleSurveyQuestion;
        questionText += ` (Scale ${scaleQ.lowerValue}-${scaleQ.upperValue}: ${scaleQ.lowerText} to ${scaleQ.upperText})`;
        break;
    }

    return questionText;
  });

  return `## Survey Questions:\n${questionSummaries.join('\n')}`;
}

export function getSurveyAnswersText(
  participantAnswers: Array<{
    participantId: string;
    answer:
      | SurveyStageParticipantAnswer
      | SurveyPerParticipantStageParticipantAnswer;
  }>,
  questions: SurveyQuestion[],
): string {
  if (participantAnswers.length === 0) {
    return '';
  }

  const answerSummaries: string[] = [];

  for (const {participantId, answer} of participantAnswers) {
    // Only include Participant IDs if there are multiple participants.
    const prefix =
      participantAnswers.length > 1 ? `\nParticipant ${participantId}:` : '';

    if (answer.kind === StageKind.SURVEY) {
      const surveyAnswer = answer as SurveyStageParticipantAnswer;
      const responses = formatSurveyResponses(
        surveyAnswer.answerMap,
        questions,
      );
      if (responses.length > 0) {
        answerSummaries.push(`${prefix}\n${responses.join('\n')}`);
      }
    } else if (answer.kind === StageKind.SURVEY_PER_PARTICIPANT) {
      const perParticipantAnswer =
        answer as SurveyPerParticipantStageParticipantAnswer;
      // For survey per participant, we need to format differently
      const responses: string[] = [];
      for (const questionId in perParticipantAnswer.answerMap) {
        const question = questions.find((q) => q.id === questionId);
        if (!question) continue;

        responses.push(`  ${question.questionTitle}:`);
        for (const targetParticipantId in perParticipantAnswer.answerMap[
          questionId
        ]) {
          const surveyAnswer =
            perParticipantAnswer.answerMap[questionId][targetParticipantId];
          const formattedAnswer = formatSingleAnswer(surveyAnswer, question);
          responses.push(
            `    About ${targetParticipantId}: ${formattedAnswer}`,
          );
        }
      }
      if (responses.length > 0) {
        answerSummaries.push(`${prefix}\n${responses.join('\n')}`);
      }
    }
  }

  return answerSummaries.length > 0
    ? `## Survey Responses:\n${answerSummaries.join('\n')}`
    : '';
}

function formatSurveyResponses(
  answerMap: Record<string, SurveyAnswer>,
  questions: SurveyQuestion[],
): string[] {
  const responses: string[] = [];

  for (const question of questions) {
    const answer = answerMap[question.id];
    if (!answer) continue;

    const formattedAnswer = formatSingleAnswer(answer, question);
    responses.push(`  ${question.questionTitle}: ${formattedAnswer}`);
  }

  return responses;
}

function formatSingleAnswer(
  answer: SurveyAnswer,
  question: SurveyQuestion,
): string {
  switch (answer.kind) {
    case SurveyQuestionKind.TEXT:
      const textAnswer = answer as TextSurveyAnswer;
      return textAnswer.answer || '(no response)';

    case SurveyQuestionKind.CHECK:
      const checkAnswer = answer as CheckSurveyAnswer;
      return checkAnswer.isChecked ? 'Checked' : 'Not checked';

    case SurveyQuestionKind.MULTIPLE_CHOICE:
      const mcAnswer = answer as MultipleChoiceSurveyAnswer;
      const mcQuestion = question as MultipleChoiceSurveyQuestion;
      const selectedOption = mcQuestion.options.find(
        (opt) => opt.id === mcAnswer.choiceId,
      );
      return selectedOption ? selectedOption.text : '(no selection)';

    case SurveyQuestionKind.SCALE:
      const scaleAnswer = answer as ScaleSurveyAnswer;
      const scaleQuestion = question as ScaleSurveyQuestion;
      // Show: value (Scale: X-Y, labels with optional middle)
      // e.g., "7 (Scale: 0-10, Strongly Disagree to Strongly Agree)"
      // or "5 (Scale: 0-10, Strongly Disagree, Neutral, Strongly Agree)"
      const labelText = scaleQuestion.middleText
        ? `${scaleQuestion.lowerText}, ${scaleQuestion.middleText}, ${scaleQuestion.upperText}`
        : `${scaleQuestion.lowerText} to ${scaleQuestion.upperText}`;
      return `${scaleAnswer.value} (Scale: ${scaleQuestion.lowerValue}-${scaleQuestion.upperValue}, ${labelText})`;

    default:
      return '(unknown answer type)';
  }
}
