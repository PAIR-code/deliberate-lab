import {ParticipantProfileExtended} from '../participant';
import {VariableDefinition} from '../variables';
import {
  containsTemplateVariables,
  resolveTemplateVariables,
} from '../variables.template';
import {
  AssetAllocationStageConfig,
  AssetAllocationStageParticipantAnswer,
} from './asset_allocation_stage';
import {getAssetAllocationAnswersText} from './asset_allocation_stage.utils';
import {StageContextData} from './stage';
import {BaseStageHandler} from './stage.handler';

export class AssetAllocationStageHandler extends BaseStageHandler {
  resolveTemplateVariablesInStage(
    stage: AssetAllocationStageConfig,
    variableDefinitions: Record<string, VariableDefinition>,
    valueMap: Record<string, string>,
  ) {
    const updatedStage = super.resolveTemplateVariablesInStage(
      stage,
      variableDefinitions,
      valueMap,
    ) as AssetAllocationStageConfig;

    // Helper to resolve template variables
    const resolve = (text: string) =>
      containsTemplateVariables(text)
        ? resolveTemplateVariables(text, variableDefinitions, valueMap)
        : text;

    // Resolve stockAId and stockBId if present
    const stockConfig = {...updatedStage.stockConfig};
    if (stockConfig.stockAId) {
      stockConfig.stockAId = resolve(stockConfig.stockAId);
    }
    if (stockConfig.stockBId) {
      stockConfig.stockBId = resolve(stockConfig.stockBId);
    }

    return {...updatedStage, stockConfig};
  }

  getStageDisplayForPrompt(
    _participants: ParticipantProfileExtended[],
    stageContext: StageContextData,
    _includeScaffolding: boolean,
  ) {
    const assetParticipantAnswers = stageContext.privateAnswers as {
      participantPublicId: string;
      participantDisplayName: string;
      answer: AssetAllocationStageParticipantAnswer;
    }[];
    return getAssetAllocationAnswersText(assetParticipantAnswers, true);
  }
}
