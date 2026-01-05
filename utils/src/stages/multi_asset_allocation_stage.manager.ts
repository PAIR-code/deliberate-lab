import {VariableDefinition} from '../variables';
import {resolveTemplateVariables} from '../variables.template';
import {MultiAssetAllocationStageConfig} from './asset_allocation_stage';
import {BaseStageHandler} from './stage.handler';

export class MultiAssetAllocationStageHandler extends BaseStageHandler {
  resolveTemplateVariablesInStage(
    stage: MultiAssetAllocationStageConfig,
    variableDefinitions: Record<string, VariableDefinition>,
    valueMap: Record<string, string>,
  ) {
    const updatedStage = super.resolveTemplateVariablesInStage(
      stage,
      variableDefinitions,
      valueMap,
    ) as MultiAssetAllocationStageConfig;
    const stockOptions = updatedStage.stockOptions.map((stock) => {
      return {
        ...stock,
        name: resolveTemplateVariables(
          stock.name,
          variableDefinitions,
          valueMap,
        ),
        description: resolveTemplateVariables(
          stock.description,
          variableDefinitions,
          valueMap,
        ),
      };
    });
    return {...updatedStage, stockOptions};
  }
}
