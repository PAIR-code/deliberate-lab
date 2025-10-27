import {ChatStageConfig} from './chat_stage';
import {StageKind} from './stage';
import {StageHandler} from './stage.manager';

export class GroupChatStageHandler implements StageHandler<ChatStageConfig> {
  getDefaultMediatorStructuredPrompt(stageId: string) {
    return undefined;
  }

  getDefaultParticipantStructuredPrompt(stageId: string) {
    return undefined;
  }
}
