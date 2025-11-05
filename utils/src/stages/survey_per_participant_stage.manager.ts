import {createModelGenerationConfig} from '../agent';
import {ParticipantProfileExtended} from '../participant';
import {StructuredOutputType} from '../structured_output';
import {createDefaultPromptFromText} from '../structured_prompt';
import {
  SurveyPerParticipantStageConfig,
  SurveyPerParticipantStageParticipantAnswer,
} from './survey_stage';
import {
  generateSurveyPerParticipantSchema,
  getSurveyAnswersText,
  getSurveySummaryText,
  parseSurveyPerParticipantResponse,
} from './survey_stage.prompts';
import {StageConfig, StageContextData, StageKind} from './stage';
import {AgentParticipantStageActions, BaseStageHandler} from './stage.handler';

export class SurveyPerParticipantStageHandler extends BaseStageHandler {
  getAgentParticipantActionsForStage(): AgentParticipantStageActions {
    return {callApi: true, moveToNextStage: true};
  }

  extractAgentParticipantAnswerFromResponse(
    participant: ParticipantProfileExtended,
    stage: SurveyPerParticipantStageConfig,
    response: unknown,
  ): SurveyPerParticipantStageParticipantAnswer | undefined {
    try {
      // Expect response to be a map of questionId to answer list
      // (based on default participant structured output schema)
      const responseMap = response as Record<string, unknown[]>;
      return parseSurveyPerParticipantResponse(stage, responseMap);
    } catch (error) {
      return undefined;
    }
  }

  getDefaultParticipantStructuredPrompt(
    stage: SurveyPerParticipantStageConfig,
  ) {
    const promptText =
      'Based on the context above, please answer each survey question for each participant specified above.';

    const schema = generateSurveyPerParticipantSchema(stage.questions);

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
    const stage = stageContext.stage as SurveyPerParticipantStageConfig;

    // Note that we list all participants in the cohort, even though
    // the surveyPerParticipant may have enableSelfSurvey disabled.
    // In that case, the extra response in the map (i.e., agent answering
    // question about themself) will be stored in the answer, but not
    // rendered in the frontend stage (since there will be no field for it).
    const participantItems = stageContext.participants.map(
      (p) => `${p.name} (${p.publicId})`,
    );
    const perParticipantContext = `In this stage, answer each survey question with each of the following participants in question: ${participantItems}`;

    // If no participants with answers, just return the text
    if (participants.length === 0) {
      return `${perParticipantContext}\n${getSurveySummaryText(stage)}`;
    }

    // Only send in answers for participants specified in param
    const participantAnswers = (
      stageContext.privateAnswers as {
        participantPublicId: string;
        participantDisplayName: string;
        answer: SurveyPerParticipantStageParticipantAnswer;
      }[]
    ).filter((item) =>
      participants.find((p) => p.publicId === item.participantPublicId),
    );
    return `${perParticipantContext}\n${getSurveyAnswersText(participantAnswers, stage.questions, true)}`;
  }
}
