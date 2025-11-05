import {createModelGenerationConfig} from '../agent';
import {ParticipantProfileExtended} from '../participant';
import {StructuredOutputType} from '../structured_output';
import {createDefaultPromptFromText} from '../structured_prompt';
import {SurveyStageConfig, SurveyStageParticipantAnswer} from './survey_stage';
import {
  generateSurveySchema,
  getSurveyAnswersText,
  getSurveySummaryText,
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
      prompt: createDefaultPromptFromText(promptText),
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
  ) {
    const stage = stageContext.stage as SurveyStageConfig;

    // If no participants with answers, just return the text
    if (participants.length === 0) {
      return getSurveySummaryText(stage);
    }

    const participantAnswers = stageContext.privateAnswers as {
      participantPublicId: string;
      participantDisplayName: string;
      answer: SurveyStageParticipantAnswer;
    }[];
    return getSurveyAnswersText(participantAnswers, stage.questions, true);
  }
}
