import {ParticipantProfileExtended} from '../participant';
import {
  MediatorPromptConfig,
  ParticipantPromptConfig,
  createDefaultPromptFromText,
} from '../structured_prompt';
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
import {BaseStageHandler} from './stage.handler';

export class PrivateChatStageHandler extends BaseStageHandler {
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

  getDefaultMediatorStructuredPrompt(
    stage: PrivateChatStageConfig,
  ): MediatorPromptConfig | undefined {
    return createChatPromptConfig(stage.id, StageKind.CHAT, {
      prompt: createDefaultPromptFromText(
        DEFAULT_AGENT_PRIVATE_MEDIATOR_CHAT_PROMPT,
      ),
    });
  }

  getDefaultParticipantStructuredPrompt(
    stage: PrivateChatStageConfig,
  ): ParticipantPromptConfig | undefined {
    return createChatPromptConfig(stage.id, StageKind.CHAT, {
      prompt: createDefaultPromptFromText(
        DEFAULT_AGENT_PARTICIPANT_CHAT_PROMPT,
      ),
    });
  }
}
