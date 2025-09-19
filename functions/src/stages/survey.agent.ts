import {
  APIKeyConfig,
  BasePromptConfig,
  ParticipantProfileExtended,
  SurveyStageConfig,
  SurveyQuestionKind,
  createSurveyStageParticipantAnswer,
  SurveyQuestion,
  SurveyAnswer,
  StructuredOutputConfig,
  StructuredOutputSchema,
  StructuredOutputType,
  StructuredOutputDataType,
  MultipleChoiceSurveyQuestion,
  ScaleSurveyQuestion,
} from '@deliberation-lab/utils';
import {processModelResponse} from '../agent.utils';
import {getStructuredPrompt} from '../prompt.utils';
import {app} from '../app';

/** Create a structured output config tailored for the survey question type. */
function createStructuredOutputConfigForSurvey(
  question: SurveyQuestion,
): StructuredOutputConfig {
  const responseField = 'response';
  let schema: StructuredOutputSchema;

  switch (question.kind) {
    case SurveyQuestionKind.TEXT:
      schema = {
        type: StructuredOutputDataType.OBJECT,
        properties: [
          {
            name: responseField,
            schema: {
              type: StructuredOutputDataType.STRING,
              description: "The user's freeform text answer.",
            },
          },
        ],
      };
      break;
    case SurveyQuestionKind.CHECK:
      schema = {
        type: StructuredOutputDataType.OBJECT,
        properties: [
          {
            name: responseField,
            schema: {
              type: StructuredOutputDataType.BOOLEAN,
              description: 'True if the checkbox is checked, false otherwise.',
            },
          },
        ],
      };
      break;
    case SurveyQuestionKind.MULTIPLE_CHOICE:
      const mcQuestion = question as MultipleChoiceSurveyQuestion;
      schema = {
        type: StructuredOutputDataType.OBJECT,
        properties: [
          {
            name: responseField,
            schema: {
              type: StructuredOutputDataType.ENUM,
              description: 'The ID of the selected choice.',
              enumItems: mcQuestion.options.map((o) => o.id),
            },
          },
        ],
      };
      break;
    case SurveyQuestionKind.SCALE:
      const scaleQuestion = question as ScaleSurveyQuestion;
      const isInteger =
        Number.isInteger(scaleQuestion.lowerValue) &&
        Number.isInteger(scaleQuestion.upperValue) &&
        Number.isInteger(scaleQuestion.stepSize ?? 1);
      schema = {
        type: StructuredOutputDataType.OBJECT,
        properties: [
          {
            name: responseField,
            schema: {
              type: isInteger
                ? StructuredOutputDataType.INTEGER
                : StructuredOutputDataType.NUMBER,
              description: `The selected value on the scale from ${scaleQuestion.lowerValue} to ${scaleQuestion.upperValue}.`,
            },
          },
        ],
      };
      break;
  }

  return {
    enabled: true,
    appendToPrompt: true,
    type: StructuredOutputType.JSON_SCHEMA,
    schema: schema,
  };
}

/** Use LLM call to generation agent participant response to survey stage. */
export async function getAgentParticipantSurveyStageResponse(
  experimentId: string,
  apiKeyConfig: APIKeyConfig, // for making LLM call
  participant: ParticipantProfileExtended,
  stage: SurveyStageConfig,
) {
  // If participant is not an agent, return
  if (!participant.agentConfig) {
    return;
  }

  const promptConfig = (
    await app
      .firestore()
      .collection('experiments')
      .doc(experimentId)
      .collection('agentParticipants')
      .doc(participant.agentConfig.agentId)
      .collection('prompts')
      .doc(stage.id)
      .get()
  ).data() as BasePromptConfig | undefined;

  if (!promptConfig) {
    console.log(
      `No prompt config found for agent ${participant.agentConfig.agentId} in stage ${stage.id}`,
    );
    return;
  }

  const answerMap: Record<string, SurveyAnswer> = {};
  // For each question, call getAgentParticipantSurveyQuestionResponse
  // and add to answer map
  for (const question of stage.questions) {
    const answer = await getAgentParticipantSurveyQuestionResponse(
      experimentId,
      apiKeyConfig,
      stage,
      participant,
      question,
      answerMap,
      promptConfig,
    );
    if (answer) {
      answerMap[question.id] = answer;
    }
  }

  // Use answer map to assemble final stage answer
  const participantAnswer = createSurveyStageParticipantAnswer({
    id: stage.id,
    answerMap,
  });
  console.log(
    '✅ SurveyStageParticipantAnswer\n',
    JSON.stringify(participantAnswer),
  );
  return participantAnswer;
}

async function getAgentParticipantSurveyQuestionResponse(
  experimentId: string,
  apiKeyConfig: APIKeyConfig, // for making LLM call
  stage: SurveyStageConfig,
  participant: ParticipantProfileExtended,
  question: SurveyQuestion, // current question
  answerMap: Record<string, SurveyAnswer>, // answers collected so far
  promptConfig: BasePromptConfig,
): Promise<SurveyAnswer | undefined> {
  if (!participant.agentConfig) {
    return;
  }

  const structuredOutputConfig = createStructuredOutputConfigForSurvey(question);

  const prompt = await getStructuredPrompt(
    experimentId,
    participant.currentCohortId,
    [participant.privateId],
    stage.id,
    participant,
    participant.agentConfig,
    {...promptConfig, structuredOutputConfig}, // Override with dynamic config
    {question, answerMap},
  );

  const rawResponse = await processModelResponse(
    experimentId,
    participant.currentCohortId,
    participant.privateId,
    stage.id,
    participant,
    participant.publicId,
    participant.privateId,
    `Survey question: ${question.id}`, // description
    apiKeyConfig,
    prompt,
    participant.agentConfig.modelSettings,
    promptConfig.generationConfig,
    structuredOutputConfig, // Use the dynamic config here too
    promptConfig.numRetries,
  );

  if (!rawResponse.parsedResponse) {
    console.error('Failed to get parsed response from model for survey question.');
    return undefined;
  }

  const responseValue = rawResponse.parsedResponse.response;

  try {
    switch (question.kind) {
      case SurveyQuestionKind.TEXT:
        return {
          id: question.id,
          kind: SurveyQuestionKind.TEXT,
          answer: responseValue as string,
        };
      case SurveyQuestionKind.CHECK:
        return {
          id: question.id,
          kind: SurveyQuestionKind.CHECK,
          isChecked: responseValue as boolean,
        };
      case SurveyQuestionKind.MULTIPLE_CHOICE:
        return {
          id: question.id,
          kind: SurveyQuestionKind.MULTIPLE_CHOICE,
          choiceId: responseValue as string,
        };
      case SurveyQuestionKind.SCALE:
        return {
          id: question.id,
          kind: SurveyQuestionKind.SCALE,
          value: responseValue as number,
        };
      default:
        return undefined;
    }
  } catch (error) {
    console.log(error);
    return undefined;
  }
}
