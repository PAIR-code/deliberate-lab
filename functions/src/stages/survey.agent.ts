import {
  APIKeyConfig,
  BasePromptConfig,
  ParticipantProfileExtended,
  SurveyStageConfig,
  SurveyQuestionKind,
  createAgentParticipantSurveyQuestionPrompt,
  createSurveyStageParticipantAnswer,
  getSurveyStagePromptContext,
  SurveyQuestion,
  SurveyAnswer,
} from '@deliberation-lab/utils';
import {processModelResponse} from '../agent.utils';
import {getStructuredPrompt} from '../prompt.utils';
import {app} from '../app';

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

  const prompt = await getStructuredPrompt(
    experimentId,
    participant.currentCohortId,
    [participant.privateId],
    stage.id,
    participant,
    participant.agentConfig,
    promptConfig,
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
    promptConfig.structuredOutputConfig,
    promptConfig.numRetries,
  );

  const response = rawResponse.text ?? '';

  // Parse response according to question kind. Then, return survey answer.
  // TODO: Use structured output
  try {
    switch (question.kind) {
      case SurveyQuestionKind.TEXT:
        return {
          id: question.id,
          kind: SurveyQuestionKind.TEXT,
          answer: response.trim(),
        };
      case SurveyQuestionKind.CHECK:
        return {
          id: question.id,
          kind: SurveyQuestionKind.CHECK,
          isChecked: response.trim().toLowerCase() === 'true',
        };
      case SurveyQuestionKind.MULTIPLE_CHOICE:
        return {
          id: question.id,
          kind: SurveyQuestionKind.MULTIPLE_CHOICE,
          choiceId: response.trim(),
        };
      case SurveyQuestionKind.SCALE:
        return {
          id: question.id,
          kind: SurveyQuestionKind.SCALE,
          value: Number(response.trim()),
        };
      default:
        return undefined;
    }
  } catch (error) {
    console.log(error);
    return undefined;
  }
}
