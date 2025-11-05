import {VariableItem} from '../variables';
import {resolveTemplateVariables} from '../variables.template';
import {MultiAssetAllocationStageConfig} from './asset_allocation_stage';
import {BaseStageHandler} from './stage.handler';

export class MultiAssetAllocationStageHandler extends BaseStageHandler {
  resolveTemplateVariablesInStage(
    stage: MultiAssetAllocationStageConfig,
    variableMap: Record<string, VariableItem>,
    valueMap: Record<string, string>,
  ) {
    const updatedStage = super.resolveTemplateVariablesInStage(
      stage,
      variableMap,
      valueMap,
    ) as MultiAssetAllocationStageConfig;
    const stockOptions = updatedStage.stockOptions.map((stock) => {
      return {
        ...stock,
        name: resolveTemplateVariables(stock.name, variableMap, valueMap),
        description: resolveTemplateVariables(
          stock.description,
          variableMap,
          valueMap,
        ),
      };
    });
    return {...updatedStage, stockOptions};
  }
}
