import {createDefaultPromptFromText} from '../structured_prompt';
import {ChatStageConfig} from './chat_stage';
import {
  DEFAULT_AGENT_MEDIATOR_PROMPT,
  DEFAULT_AGENT_PARTICIPANT_CHAT_PROMPT,
  createChatPromptConfig,
} from './chat_stage.prompts';
import {StageKind} from './stage';
import {StageHandler} from './stage.manager';

export class GroupChatStageHandler implements StageHandler<ChatStageConfig> {
  getDefaultMediatorStructuredPrompt(stageId: string) {
    return createChatPromptConfig(stageId, StageKind.CHAT, {
      prompt: createDefaultPromptFromText(DEFAULT_AGENT_MEDIATOR_PROMPT),
    });
  }

  getDefaultParticipantStructuredPrompt(stageId: string) {
    return createChatPromptConfig(stageId, StageKind.CHAT, {
      prompt: createDefaultPromptFromText(
        DEFAULT_AGENT_PARTICIPANT_CHAT_PROMPT,
      ),
    });
  }
}
