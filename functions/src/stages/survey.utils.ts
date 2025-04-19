import {
  ExperimenterData,
  ParticipantProfileExtended,
  SurveyStageConfig,
  SurveyQuestionKind,
  createAgentParticipantSurveyQuestionPrompt,
  createModelGenerationConfig,
  createSurveyStageParticipantAnswer,
  getSurveyStagePromptContext,
  getSurveyStageQuestion,
} from '@deliberation-lab/utils';
import {getAgentResponse} from '../agent.utils';
import {getPastStagesPromptContext} from './stage.utils';

/** Use LLM call to generation agent participant response to survey stage. */
export async function getAgentParticipantSurveyStageResponse(
  experimentId: string,
  experimenterData: ExperimenterData, // for making LLM call
  participant: ParticipantProfileExtended,
  stage: SurveyStageConfig,
) {
  // If participant is not an agent, return
  if (!participant.agentConfig) {
    return;
  }

  const answerMap: Record<string, SurveyAnswer> = {};
  // For each question, call getAgentParticipantSurveyQuestionResponse
  // and add to answer map
  for (const question of stage.questions) {
    const answer = await getAgentParticipantSurveyQuestionResponse(
      experimentId,
      experimenterData,
      stage,
      participant,
      question,
      answerMap,
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
  experimenterData: ExperimenterData, // for making LLM call
  stage: StageConfig,
  participant: ParticipantProfileExtended,
  question: SurveyQuestion, // current question
  answerMap: Record<string, SurveyAnswer>, // answers collected so far
): SurveyAnswer {
  const pastStagesPrompt = await getPastStagesPromptContext(
    experimentId,
    stage.id,
    participant.privateId,
    true, // TODO: Use prompt settings for includeStageInfo
  );

  // Get context for answered questions in current stage
  // Iterate through stage questions an add context for ones with
  // answers
  const currentQuestionIndex = stage.questions.findIndex(
    (q) => q.id === question.id,
  );
  const pastQuestions = stage.questions.slice(0, currentQuestionIndex);
  const pastQuestionsPrompt = getSurveyStagePromptContext(
    stage,
    true, // TODO: Use prompt settings for includeStageInfo
    pastQuestions,
    answerMap,
  );

  const questionPrompt = createAgentParticipantSurveyQuestionPrompt(question);
  const prompt = `${pastStagesPrompt}\n${pastQuestionsPrompt}\n${questionPrompt}`;

  // Build generation config
  // TODO: Use generation config from agent persona prompt
  const generationConfig = createModelGenerationConfig();

  // Call LLM API
  // TODO: Use structured output
  const rawResponse = await getAgentResponse(
    experimenterData,
    prompt,
    participant.agentConfig.modelSettings,
    generationConfig,
  );
  const response = rawResponse.text;

  // Check console log for response
  console.log(
    'SENDING AGENT PARTICIPANT PROMPT FOR SURVEY STAGE\n',
    `Experiment: ${experimentId}\n`,
    `Participant: ${participant.publicId}\n`,
    `Stage: ${stage.name} (${stage.kind})\n`,
    `Question: ${question.questionTitle}\n`,
    response,
  );

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
          isChecked: response.trim().lower() === 'true',
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
