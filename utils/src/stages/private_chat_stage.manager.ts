import {createDefaultPromptFromText} from '../structured_prompt';
import {PrivateChatStageConfig} from './private_chat_stage';
import {
  DEFAULT_AGENT_PRIVATE_MEDIATOR_CHAT_PROMPT,
  DEFAULT_AGENT_PARTICIPANT_CHAT_PROMPT,
  createChatPromptConfig,
} from './chat_stage.prompts';
import {StageKind} from './stage';
import {StageHandler} from './stage.manager';

export class PrivateChatStageHandler
  implements StageHandler<PrivateChatStageConfig>
{
  getDefaultMediatorStructuredPrompt(stageId: string) {
    return createChatPromptConfig(stageId, StageKind.CHAT, {
      prompt: createDefaultPromptFromText(
        DEFAULT_AGENT_PRIVATE_MEDIATOR_CHAT_PROMPT,
      ),
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
