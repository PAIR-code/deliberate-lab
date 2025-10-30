import {ParticipantProfileExtended} from '../participant';
import {InfoStageConfig} from './info_stage';
import {StageConfig, StageContextData, StageKind} from './stage';
import {BaseStageHandler} from './stage.handler';

export class InfoStageHandler extends BaseStageHandler {
  getStageDisplayForPrompt(
    participants: ParticipantProfileExtended[],
    stageContext: StageContextData,
  ) {
    const stage = stageContext.stage as InfoStageConfig;
    return stage.infoLines.join('\n');
  }
}
