import {ParticipantProfileExtended} from '../participant';
import {StageConfig, StageContextData, StageKind} from './stage';
import {BaseStageHandler} from './stage.handler';
import {StockInfoStageConfig} from './stockinfo_stage';
import {getStockInfoSummaryText} from './stockinfo_stage.utils';

export class StockInfoStageHandler extends BaseStageHandler {
  getStageDisplayForPrompt(
    participants: ParticipantProfileExtended[],
    stageContext: StageContextData,
  ) {
    const stage = stageContext.stage as StockInfoStageConfig;
    return getStockInfoSummaryText(stage);
  }
}
