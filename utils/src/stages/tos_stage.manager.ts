import {ParticipantProfileExtended} from '../participant';
import {StageConfig, StageContextData, StageKind} from './stage';
import {StageHandler} from './stage.manager';
import {TOSStageConfig} from './tos_stage';

export class TOSStageHandler implements StageHandler<TOSStageConfig> {
  getStageDisplayForPrompt(
    participants: ParticipantProfileExtended[],
    stageContext: StageContextData,
  ) {
    const stage = stageContext.stage as TOSStageConfig;
    return stage.tosLines.join('\n');
  }

  getDefaultMediatorStructuredPrompt(stageId: string) {
    return undefined;
  }

  getDefaultParticipantStructuredPrompt(stageId: string) {
    return undefined;
  }
}
