import {createModelGenerationConfig} from '../agent';
import {ParticipantProfileExtended} from '../participant';
import {StructuredOutputType} from '../structured_output';
import {createDefaultParticipantPrompt} from '../structured_prompt';
import {VariableDefinition} from '../variables';
import {resolveTemplateVariables} from '../variables.template';
import {
  MultipleChoiceSurveyQuestion,
  ScaleSurveyQuestion,
  SurveyQuestion,
  SurveyQuestionKind,
  SurveyStageConfig,
  SurveyStageParticipantAnswer,
} from './survey_stage';
import {
  generateSurveySchema,
  getSurveyStageDisplayPromptString,
  parseSurveyResponse,
} from './survey_stage.prompts';
import {StageContextData} from './stage';
import {AgentParticipantStageActions, BaseStageHandler} from './stage.handler';

/**
 * Resolves template variables in survey questions.
 * Handles questionTitle for all types, options.text for multiple choice,
 * and lowerText/upperText/middleText for scale questions.
 */
export function resolveSurveyQuestionVariables(
  questions: SurveyQuestion[],
  variableDefinitions: Record<string, VariableDefinition>,
  valueMap: Record<string, string>,
): SurveyQuestion[] {
  return questions.map((question) => {
    // Resolve questionTitle for all question types
    const baseResolved = {
      ...question,
      questionTitle: resolveTemplateVariables(
        question.questionTitle,
        variableDefinitions,
        valueMap,
      ),
    };

    // Handle type-specific fields
    switch (question.kind) {
      case SurveyQuestionKind.MULTIPLE_CHOICE: {
        const mcQuestion = baseResolved as MultipleChoiceSurveyQuestion;
        return {
          ...mcQuestion,
          options: mcQuestion.options.map((option) => ({
            ...option,
            text: resolveTemplateVariables(
              option.text,
              variableDefinitions,
              valueMap,
            ),
          })),
        };
      }
      case SurveyQuestionKind.SCALE: {
        const scaleQuestion = baseResolved as ScaleSurveyQuestion;
        return {
          ...scaleQuestion,
          lowerText: resolveTemplateVariables(
            scaleQuestion.lowerText,
            variableDefinitions,
            valueMap,
          ),
          upperText: resolveTemplateVariables(
            scaleQuestion.upperText,
            variableDefinitions,
            valueMap,
          ),
          middleText: resolveTemplateVariables(
            scaleQuestion.middleText,
            variableDefinitions,
            valueMap,
          ),
        };
      }
      default:
        return baseResolved;
    }
  });
}

export class SurveyStageHandler extends BaseStageHandler {
  resolveTemplateVariablesInStage(
    stage: SurveyStageConfig,
    variableDefinitions: Record<string, VariableDefinition>,
    valueMap: Record<string, string>,
  ) {
    const updatedStage = super.resolveTemplateVariablesInStage(
      stage,
      variableDefinitions,
      valueMap,
    ) as SurveyStageConfig;

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
