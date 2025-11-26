import {ParticipantProfileExtended} from '../participant';
import {StageConfig, StageContextData, StageKind} from './stage';
import {BaseStageHandler} from './stage.handler';
import {TOSStageConfig} from './tos_stage';

export class TOSStageHandler extends BaseStageHandler {
  getStageDisplayForPrompt(
    participants: ParticipantProfileExtended[],
    stageContext: StageContextData,
    includeScaffolding: boolean,
  ) {
    const stage = stageContext.stage as TOSStageConfig;
    return stage.tosLines.join('\n');
  }
}
