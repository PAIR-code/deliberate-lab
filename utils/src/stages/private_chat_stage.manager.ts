import {ParticipantProfileExtended} from '../participant';
import {createDefaultPromptFromText} from '../structured_prompt';
import {PrivateChatStageConfig} from './private_chat_stage';
import {
  DEFAULT_AGENT_PRIVATE_MEDIATOR_CHAT_PROMPT,
  DEFAULT_AGENT_PARTICIPANT_CHAT_PROMPT,
  createChatPromptConfig,
  getChatPromptMessageHistory,
} from './chat_stage.prompts';
import {
  StageConfig,
  StageContextData,
  StageKind,
  StageParticipantAnswer,
  StagePublicData,
} from './stage';
import {StageHandler} from './stage.manager';

export class PrivateChatStageHandler
  implements StageHandler<PrivateChatStageConfig>
{
  getStageDisplayForPrompt(
    participants: ParticipantProfileExtended[],
    stageContext: StageContextData,
  ) {
    const conversations: string[] = [];
    const stage = stageContext.stage as PrivateChatStageConfig;

    for (const participant of participants) {
      const history = getChatPromptMessageHistory(
        stageContext.privateChatMap[participant.publicId],
        stage,
      );
      conversations.push(
        `Private chat with ${participant.name} (${participant.publicId})\n${history}`,
      );
    }

    return conversations.join('\n\n');
  }

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
