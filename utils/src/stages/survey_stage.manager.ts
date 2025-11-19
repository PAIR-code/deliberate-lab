import {createModelGenerationConfig} from '../agent';
import {ParticipantProfileExtended} from '../participant';
import {StructuredOutputType} from '../structured_output';
import {createDefaultParticipantPrompt} from '../structured_prompt';
import {SurveyStageConfig, SurveyStageParticipantAnswer} from './survey_stage';
import {
  generateSurveySchema,
  getSurveyStageDisplayPromptString,
  parseSurveyResponse,
} from './survey_stage.prompts';
import {StageContextData} from './stage';
import {AgentParticipantStageActions, BaseStageHandler} from './stage.handler';

export class SurveyStageHandler extends BaseStageHandler {
  getAgentParticipantActionsForStage(): AgentParticipantStageActions {
    return {callApi: true, moveToNextStage: true};
  }

  extractAgentParticipantAnswerFromResponse(
    participant: ParticipantProfileExtended,
    stage: SurveyStageConfig,
    response: unknown,
  ): SurveyStageParticipantAnswer | undefined {
    try {
      // Expect response to be a map of questionId to answer
      // (based on default participant structured output schema)
      const responseMap = response as Record<string, unknown>;
      return parseSurveyResponse(stage, responseMap);
    } catch (error) {
      // Parsing could error if model response is of the wrong
      // structured output shape.
      return undefined;
    }
  }

  getDefaultParticipantStructuredPrompt(stage: SurveyStageConfig) {
    const promptText =
      'Please answer the following survey questions based on the context above.';

    const schema = generateSurveySchema(stage.questions);

    return {
      id: stage.id,
      type: stage.kind,
      prompt: createDefaultParticipantPrompt(promptText),
      includeScaffoldingInPrompt: true,
      generationConfig: createModelGenerationConfig(),
      structuredOutputConfig: {
        enabled: true,
        type: StructuredOutputType.JSON_SCHEMA,
        schema,
        appendToPrompt: true,
        explanationField: '', // Not used for this stage
      },
      numRetries: 3,
    };
  }

  getStageDisplayForPrompt(
    participants: ParticipantProfileExtended[],
    stageContext: StageContextData,
    includeScaffolding: boolean,
  ) {
    const stage = stageContext.stage as SurveyStageConfig;

    // Only send in answers for participants specified in param
    const participantAnswers = (
      stageContext.privateAnswers as {
        participantPublicId: string;
        participantDisplayName: string;
        answer: SurveyStageParticipantAnswer;
      }[]
    ).filter((item) =>
      participants.find((p) => p.publicId === item.participantPublicId),
    );
    return getSurveyStageDisplayPromptString(
      participantAnswers,
      stage.questions,
    );
  }
}
