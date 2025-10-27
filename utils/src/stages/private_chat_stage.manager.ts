import {PrivateChatStageConfig} from './private_chat_stage';
import {StageKind} from './stage';
import {StageHandler} from './stage.manager';

export class PrivateChatStageHandler
  implements StageHandler<PrivateChatStageConfig>
{
  getDefaultMediatorStructuredPrompt(stageId: string) {
    return undefined;
  }

  getDefaultParticipantStructuredPrompt(stageId: string) {
    return undefined;
  }
}
