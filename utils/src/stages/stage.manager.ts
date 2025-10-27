import {
  MediatorPromptConfig,
  ParticipantPromptConfig,
} from '../structured_prompt';
import {GroupChatStageHandler} from './chat_stage.manager';
import {PrivateChatStageHandler} from './private_chat_stage.manager';
import {StageConfig, StageKind} from './stage';

/** Manages stage handlers for different stage types. */
export class StageManager {
  private handlerMap: Map<string, StageHandler<StageConfig>> = new Map();

  constructor() {
    this.handlerMap.set(StageKind.CHAT, new GroupChatStageHandler());
    this.handlerMap.set(StageKind.PRIVATE_CHAT, new PrivateChatStageHandler());
  }

  getDefaultMediatorStructuredPrompt(stage: StageConfig) {
    return (
      this.handlerMap
        .get(stage.kind)
        ?.getDefaultMediatorStructuredPrompt(stage.id) ?? undefined
    );
  }

  getDefaultParticipantStructuredPrompt(stage: StageConfig) {
    return (
      this.handlerMap
        .get(stage.kind)
        ?.getDefaultParticipantStructuredPrompt(stage.id) ?? undefined
    );
  }
}

/** Manages actions (e.g., retrieving and editing) for stages.
 * Can be extended to handle a specific stage type.
 */
export interface StageHandler<StageConfig> {
  getDefaultMediatorStructuredPrompt(
    stageId: string,
  ): MediatorPromptConfig | undefined;
  getDefaultParticipantStructuredPrompt(
    stageId: string,
  ): ParticipantPromptConfig | undefined;
}
