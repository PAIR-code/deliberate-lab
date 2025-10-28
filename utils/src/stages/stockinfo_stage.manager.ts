import {ParticipantProfileExtended} from '../participant';
import {StageConfig, StageContextData, StageKind} from './stage';
import {StageHandler} from './stage.manager';
import {StockInfoStageConfig} from './stockinfo_stage';
import {getStockInfoSummaryText} from './stockinfo_stage.utils';

export class StockInfoStageHandler
  implements StageHandler<StockInfoStageConfig>
{
  getStageDisplayForPrompt(
    participants: ParticipantProfileExtended[],
    stageContext: StageContextData,
  ) {
    const stage = stageContext.stage as StockInfoStageConfig;
    return getStockInfoSummaryText(stage);
  }

  getDefaultMediatorStructuredPrompt(stageId: string) {
    return undefined;
  }

  getDefaultParticipantStructuredPrompt(stageId: string) {
    return undefined;
  }
}
