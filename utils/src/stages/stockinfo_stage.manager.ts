import {ParticipantProfileExtended} from '../participant';
import {VariableDefinition} from '../variables';
import {
  containsTemplateVariables,
  resolveTemplateVariables,
} from '../variables.template';
import {StageContextData} from './stage';
import {BaseStageHandler} from './stage.handler';
import {StockInfoStageConfig} from './stockinfo_stage';
import {getStockInfoSummaryText} from './stockinfo_stage.utils';

export class StockInfoStageHandler extends BaseStageHandler {
  resolveTemplateVariablesInStage(
    stage: StockInfoStageConfig,
    variableDefinitions: Record<string, VariableDefinition>,
    valueMap: Record<string, string>,
  ) {
    const updatedStage = super.resolveTemplateVariablesInStage(
      stage,
      variableDefinitions,
      valueMap,
    ) as StockInfoStageConfig;

    // Resolve visibleStockIds if present
    if (updatedStage.visibleStockIds?.length) {
      const resolvedIds = updatedStage.visibleStockIds.map((id) =>
        containsTemplateVariables(id)
          ? resolveTemplateVariables(id, variableDefinitions, valueMap)
          : id,
      );
      return {...updatedStage, visibleStockIds: resolvedIds};
    }

    return updatedStage;
  }

  getStageDisplayForPrompt(
    _participants: ParticipantProfileExtended[],
    stageContext: StageContextData,
    _includeScaffolding: boolean,
  ) {
    const stage = stageContext.stage as StockInfoStageConfig;
    return getStockInfoSummaryText(stage);
  }
}
