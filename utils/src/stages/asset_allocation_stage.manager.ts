import {ParticipantProfileExtended} from '../participant';
import {
  AssetAllocationStageConfig,
  AssetAllocationStageParticipantAnswer,
} from './asset_allocation_stage';
import {
  getAssetAllocationSummaryText,
  getAssetAllocationAnswersText,
} from './asset_allocation_stage.utils';
import {StageConfig, StageContextData, StageKind} from './stage';
import {BaseStageHandler} from './stage.handler';

export class AssetAllocationStageHandler extends BaseStageHandler {
  getStageDisplayForPrompt(
    participants: ParticipantProfileExtended[],
    stageContext: StageContextData,
    includeScaffolding: boolean,
  ) {
    const stage = stageContext.stage as AssetAllocationStageConfig;
    const assetAllocationDisplay = getAssetAllocationSummaryText(stage);

    const assetParticipantAnswers = stageContext.privateAnswers as {
      participantPublicId: string;
      participantDisplayName: string;
      answer: AssetAllocationStageParticipantAnswer;
    }[];
    return getAssetAllocationAnswersText(assetParticipantAnswers, true);
  }
}
