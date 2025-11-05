import {
  StructuredOutputDataType,
  StructuredOutputSchema,
} from '../structured_output';
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
  createSurveyStageParticipantAnswer,
  createSurveyPerParticipantStageParticipantAnswer,
} from './survey_stage';

/** Prompt constants and utils for interacting with survey stage. */

/** Helper function to format scale question text */
function formatScaleText(scaleQuestion: ScaleSurveyQuestion): string {
  let scaleText = `Scale: ${scaleQuestion.lowerValue} = ${scaleQuestion.lowerText}`;
  if (scaleQuestion.middleText) {
    const middleValue = Math.floor(
      (scaleQuestion.lowerValue + scaleQuestion.upperValue) / 2,
    );
    scaleText += `, ${middleValue} = ${scaleQuestion.middleText}`;
  }
  scaleText += `, ${scaleQuestion.upperValue} = ${scaleQuestion.upperText}`;
  return scaleText;
}

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

/** Generate StructuredOutputSchema for a given survey question. */
function getSchemaForQuestion(
  question: SurveyQuestion,
): StructuredOutputSchema {
  const description = question.questionTitle;

  switch (question.kind) {
    case SurveyQuestionKind.TEXT:
      return {type: StructuredOutputDataType.STRING, description};
    case SurveyQuestionKind.CHECK:
      return {type: StructuredOutputDataType.BOOLEAN, description};
    case SurveyQuestionKind.MULTIPLE_CHOICE:
      return {
        type: StructuredOutputDataType.STRING,
        description,
        enumItems: question.options.map((option) => option.id),
      };
    case SurveyQuestionKind.SCALE:
      // Since the range isn't enforced by the schema type,
      // include the lower/upper values in the description
      return {
        type: StructuredOutputDataType.INTEGER,
        description: `${description} (from ${question.lowerValue} to ${question.upperValue})`,
      };
  }
}

/** Generate SurveyStage structured output schema for agent participant. */
export function generateSurveySchema(
  questions: SurveyQuestion[],
): StructuredOutputSchema {
  const properties = questions.map((question) => {
    return {name: question.id, schema: getSchemaForQuestion(question)};
  });

  return {
    type: StructuredOutputDataType.OBJECT,
    properties,
  };
}

/** Generate SurveyPerParticipantStage structured output schema for agent. */
export function generateSurveyPerParticipantSchema(
  questions: SurveyQuestion[],
): StructuredOutputSchema {
  const properties = questions.map((question) => {
    // For each question, schema is a list of { participantId, answer } items
    return {
      name: question.id,
      description: question.questionTitle,
      schema: {
        type: StructuredOutputDataType.ARRAY,
        description:
          'A list of {participantId, answer} items where each item is your answer to the question regarding a specific participant ID from the list of participants',
        arrayItems: {
          type: StructuredOutputDataType.OBJECT,
          properties: [
            {
              name: 'participantId',
              schema: {
                type: StructuredOutputDataType.STRING,
                description:
                  'The ID of the participant whom you are answering the question about',
              },
            },
            {
              name: 'answer',
              schema: getSchemaForQuestion(question),
            },
          ],
        }, // end list of {participantId, answer} items
      }, // end schema for question
    };
  });

  return {
    type: StructuredOutputDataType.OBJECT,
    properties,
  };
}

/** Convert model response into SurveyAnswer. */
function parseAnswerForQuestion(
  question: SurveyQuestion,
  rawAnswer: unknown,
): SurveyAnswer | undefined {
  if (rawAnswer === undefined) return undefined;

  switch (question.kind) {
    case SurveyQuestionKind.TEXT:
      return {
        id: question.id,
        kind: question.kind,
        answer: rawAnswer as string,
      };
    case SurveyQuestionKind.CHECK:
      return {
        id: question.id,
        kind: question.kind,
        isChecked: rawAnswer as boolean,
      };
    case SurveyQuestionKind.MULTIPLE_CHOICE:
      return {
        id: question.id,
        kind: question.kind,
        choiceId: rawAnswer as string,
      };
    case SurveyQuestionKind.SCALE:
      return {
        id: question.id,
        kind: question.kind,
        value: rawAnswer as number,
      };
  }
  return undefined;
}

/** Convert model response into SurveyStageParticipantAnswer
 *  based on expected structured output schema.
 */
export function parseSurveyResponse(
  stage: SurveyStageConfig,
  responseMap: Record<string, unknown>,
): SurveyStageParticipantAnswer {
  const answerMap: Record<string, SurveyAnswer> = {};

  for (const question of stage.questions) {
    const rawAnswer = responseMap[question.id];
    const surveyAnswer = parseAnswerForQuestion(question, rawAnswer);
    if (surveyAnswer) {
      answerMap[question.id] = surveyAnswer;
    }
  }

  return createSurveyStageParticipantAnswer({
    id: stage.id,
    answerMap,
  });
}

/** Parse SurveyPerParticipant raw model response. */
export function parseSurveyPerParticipantResponse(
  stage: SurveyPerParticipantStageConfig,
  // Expected map from question to list of { participantId, answer }
  responseMap: Record<string, unknown[]>,
): SurveyPerParticipantStageParticipantAnswer {
  const answerMap: Record<string, Record<string, SurveyAnswer>> = {};

  for (const question of stage.questions) {
    const participantAnswers = responseMap[question.id];
    for (const raw of participantAnswers) {
      const {participantId, answer} = raw as {
        participantId: string;
        answer: unknown;
      };
      if (participantId && answer) {
        if (!answerMap[participantId]) {
          answerMap[participantId] = {};
        }
        const surveyAnswer = parseAnswerForQuestion(question, answer);
        if (surveyAnswer) {
          answerMap[participantId][question.id] = surveyAnswer;
        }
      }
    }
  }

  return createSurveyPerParticipantStageParticipantAnswer({
    id: stage.id,
    answerMap,
  });
}

/** Get text for Survey or SurveyPerParticipant stage display.
 *  (no participant answers included).
 */
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
        questionText += ` (${formatScaleText(scaleQ)})`;
        break;
    }

    return questionText;
  });

  return `## Survey Questions:\n${questionSummaries.join('\n')}`;
}

/** Get text for Survey or SurveyPerParticipant stage display.
 *  with participant answers included.
 */
export function getSurveyAnswersText(
  participantAnswers: Array<{
    participantPublicId: string;
    participantDisplayName: string;
    answer:
      | SurveyStageParticipantAnswer
      | SurveyPerParticipantStageParticipantAnswer;
  }>,
  questions: SurveyQuestion[],
  alwaysShowParticipantNames = false,
): string {
  if (participantAnswers.length === 0) {
    return '';
  }

  const answerSummaries: string[] = [];

  for (const {
    participantPublicId,
    participantDisplayName,
    answer,
  } of participantAnswers) {
    // Include participant names based on configuration or if multiple participants
    const showNames =
      alwaysShowParticipantNames || participantAnswers.length > 1;
    const prefix = showNames ? `* Participant ${participantDisplayName}:` : '';

    if (answer.kind === StageKind.SURVEY) {
      const surveyAnswer = answer as SurveyStageParticipantAnswer;
      const responses = formatSurveyResponses(
        surveyAnswer.answerMap,
        questions,
      );
      if (responses.length > 0) {
        answerSummaries.push(`\n${prefix}\n${responses.join('\n')}`);
      }
    } else if (answer.kind === StageKind.SURVEY_PER_PARTICIPANT) {
      const perParticipantAnswer =
        answer as SurveyPerParticipantStageParticipantAnswer;
      // For survey per participant, we need to format differently
      const responses: string[] = [];
      for (const questionId in perParticipantAnswer.answerMap) {
        const question = questions.find((q) => q.id === questionId);
        if (!question) continue;

        responses.push(`  * ${question.questionTitle}:`);
        for (const targetParticipantId in perParticipantAnswer.answerMap[
          questionId
        ]) {
          const surveyAnswer =
            perParticipantAnswer.answerMap[questionId][targetParticipantId];
          const formattedAnswer = formatSingleAnswer(surveyAnswer, question);
          responses.push(
            `    * About ${targetParticipantId}: ${formattedAnswer}`,
          );
        }
      }
      if (responses.length > 0) {
        answerSummaries.push(`\n${prefix}\n${responses.join('\n')}`);
      }
    }
  }

  return answerSummaries.length > 0
    ? `## Survey Responses: ${answerSummaries.join('\n')}`
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
    responses.push(`  * ${question.questionTitle}: ${formattedAnswer}`);
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
      return `${scaleAnswer.value} (${formatScaleText(scaleQuestion)})`;

    default:
      return '(unknown answer type)';
  }
}
