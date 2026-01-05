import {VariableDefinition} from '../variables';
import {resolveTemplateVariables} from '../variables.template';
import {FlipCardStageConfig} from './flipcard_stage';
import {BaseStageHandler} from './stage.handler';

export class FlipCardStageHandler extends BaseStageHandler {
  resolveTemplateVariablesInStage(
    stage: FlipCardStageConfig,
    variableDefinitions: Record<string, VariableDefinition>,
    valueMap: Record<string, string>,
  ) {
    const updatedStage = super.resolveTemplateVariablesInStage(
      stage,
      variableDefinitions,
      valueMap,
    ) as FlipCardStageConfig;

    const cards = updatedStage.cards.map((card) => ({
      ...card,
      title: resolveTemplateVariables(
        card.title,
        variableDefinitions,
        valueMap,
      ),
      frontContent: resolveTemplateVariables(
        card.frontContent,
        variableDefinitions,
        valueMap,
      ),
      backContent: resolveTemplateVariables(
        card.backContent,
        variableDefinitions,
        valueMap,
      ),
    }));

    return {...updatedStage, cards};
  }
}
