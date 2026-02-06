import {createModelGenerationConfig} from '../agent';
import {ParticipantProfileExtended} from '../participant';
import {StructuredOutputType} from '../structured_output';
import {createDefaultParticipantPrompt} from '../structured_prompt';
import {VariableDefinition} from '../variables';
import {
  SurveyPerParticipantStageConfig,
  SurveyPerParticipantStageParticipantAnswer,
} from './survey_stage';
import {
  generateSurveyPerParticipantSchema,
  getSurveyPerParticipantStageDisplayPromptString,
  parseSurveyPerParticipantResponse,
} from './survey_stage.prompts';
import {StageContextData} from './stage';
import {AgentParticipantStageActions, BaseStageHandler} from './stage.handler';
import {resolveSurveyQuestionVariables} from './survey_stage.manager';

export class SurveyPerParticipantStageHandler extends BaseStageHandler {
  resolveTemplateVariablesInStage(
    stage: SurveyPerParticipantStageConfig,
    variableDefinitions: Record<string, VariableDefinition>,
    valueMap: Record<string, string>,
  ) {
    const updatedStage = super.resolveTemplateVariablesInStage(
      stage,
      variableDefinitions,
      valueMap,
    ) as SurveyPerParticipantStageConfig;

    const questions = resolveSurveyQuestionVariables(
      updatedStage.questions,
      variableDefinitions,
      valueMap,
    );

    return {...updatedStage, questions};
  }

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
      // Parsing could error if model response is of the wrong
      // structured output shape.
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
      prompt: createDefaultParticipantPrompt(promptText),
      includeScaffoldingInPrompt: true,
      generationConfig: createModelGenerationConfig(),
      structuredOutputConfig: {
        enabled: true,
        type: StructuredOutputType.JSON_SCHEMA,
        schema,
        appendToPrompt: true,
      },
      numRetries: 3,
    };
  }

  getStageDisplayForPrompt(
    participants: ParticipantProfileExtended[],
    stageContext: StageContextData,
    includeScaffolding: boolean,
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
    return `${perParticipantContext}\n${getSurveyPerParticipantStageDisplayPromptString(participantAnswers, stage.questions)}`;
  }
}
