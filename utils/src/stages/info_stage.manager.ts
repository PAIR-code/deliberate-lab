import {ParticipantProfileExtended} from '../participant';
import {VariableDefinition} from '../variables';
import {resolveTemplateVariables} from '../variables.template';
import {InfoStageConfig} from './info_stage';
import {StageConfig, StageContextData, StageKind} from './stage';
import {BaseStageHandler} from './stage.handler';

export class InfoStageHandler extends BaseStageHandler {
  resolveTemplateVariablesInStage(
    stage: InfoStageConfig,
    variableDefinitions: Record<string, VariableDefinition>,
    valueMap: Record<string, string>,
  ) {
    const updatedStage = super.resolveTemplateVariablesInStage(
      stage,
      variableDefinitions,
      valueMap,
    ) as InfoStageConfig;
    const infoLines = updatedStage.infoLines.map((line) =>
      resolveTemplateVariables(line, variableDefinitions, valueMap),
    );
    return {...updatedStage, infoLines};
  }

  getStageDisplayForPrompt(
    participants: ParticipantProfileExtended[],
    stageContext: StageContextData,
    includeScaffolding: boolean,
  ) {
    const stage = stageContext.stage as InfoStageConfig;
    return stage.infoLines.join('\n');
  }
}
