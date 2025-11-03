import {ParticipantProfileExtended} from '../participant';
import {VariableItem} from '../variables';
import {resolveTemplateVariables} from '../variables.template';
import {InfoStageConfig} from './info_stage';
import {StageConfig, StageContextData, StageKind} from './stage';
import {BaseStageHandler} from './stage.handler';

export class InfoStageHandler extends BaseStageHandler {
  resolveTemplateVariablesInStage(
    stage: InfoStageConfig,
    variableMap: Record<string, VariableItem>,
    valueMap: Record<string, string>,
  ) {
    const infoLines = stage.infoLines.map((line) =>
      resolveTemplateVariables(line, variableMap, valueMap),
    );
    return {...stage, infoLines};
  }

  getStageDisplayForPrompt(
    participants: ParticipantProfileExtended[],
    stageContext: StageContextData,
  ) {
    const stage = stageContext.stage as InfoStageConfig;
    return stage.infoLines.join('\n');
  }
}
