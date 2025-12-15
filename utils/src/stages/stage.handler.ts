import {ParticipantProfileExtended} from '../participant';
import {VariableDefinition} from '../variables';
import {resolveTemplateVariables} from '../variables.template';
import {
  MediatorPromptConfig,
  ParticipantPromptConfig,
} from '../structured_prompt';
import {StageConfig, StageContextData, StageParticipantAnswer} from './stage';

/** Specifies what actions should be taken for the agent participant
 * to "complete" the stage.
 */
export interface AgentParticipantStageActions {
  callApi: boolean;
  moveToNextStage: boolean;
}

/** Base implementation of StageHandler (manages actions/editing for stage).
 * Can be extended to handle a specific stage type.
 */
export class BaseStageHandler {
  resolveTemplateVariablesInStage(
    stage: StageConfig,
    variableDefinitions: Record<string, VariableDefinition>,
    valueMap: Record<string, string>,
  ) {
    // By default, resolve variables in stage descriptions
    const primaryText = resolveTemplateVariables(
      stage.descriptions.primaryText,
      variableDefinitions,
      valueMap,
    );
    const infoText = resolveTemplateVariables(
      stage.descriptions.infoText,
      variableDefinitions,
      valueMap,
    );
    const descriptions = {...stage.descriptions, primaryText, infoText};
    return {...stage, descriptions};
  }

  getAgentParticipantActionsForStage(
    participant: ParticipantProfileExtended,
    stage: StageConfig,
  ): AgentParticipantStageActions {
    // By default, do not change anything and just proceed to next stage
    return {callApi: false, moveToNextStage: true};
  }

  extractAgentParticipantAnswerFromResponse(
    participant: ParticipantProfileExtended,
    stage: StageConfig,
    response: unknown,
  ): StageParticipantAnswer | undefined {
    return undefined;
  }

  getDefaultMediatorStructuredPrompt(
    stage: StageConfig,
  ): MediatorPromptConfig | undefined {
    return undefined;
  }

  getDefaultParticipantStructuredPrompt(
    stage: StageConfig,
  ): ParticipantPromptConfig | undefined {
    return undefined;
  }

  // TODO: Consider how to handle variables when populating stage display
  // with multiple participants (who could have different variable values).
  getStageDisplayForPrompt(
    participants: ParticipantProfileExtended[],
    stageContext: StageContextData,
    includeScaffolding: boolean,
  ) {
    return '';
  }
}
