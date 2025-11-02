import {ParticipantProfileExtended} from '../participant';
import {InfoStageConfig} from './info_stage';
import {StageConfig, StageContextData, StageKind} from './stage';
import {StageHandler} from './stage.manager';

export class InfoStageHandler implements StageHandler<InfoStageConfig> {
  getStageDisplayForPrompt(
    participants: ParticipantProfileExtended[],
    stageContext: StageContextData,
  ) {
    const stage = stageContext.stage as InfoStageConfig;
    return stage.infoLines.join('\n');
  }

  getDefaultMediatorStructuredPrompt(stageId: string) {
    return undefined;
  }

  getDefaultParticipantStructuredPrompt(stageId: string) {
    return undefined;
  }
}
