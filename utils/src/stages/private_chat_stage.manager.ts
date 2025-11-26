import {ParticipantProfileExtended} from '../participant';
import {
  MediatorPromptConfig,
  ParticipantPromptConfig,
  createDefaultPromptFromText,
  createDefaultParticipantPrompt,
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
import {AgentParticipantStageActions, BaseStageHandler} from './stage.handler';

export class PrivateChatStageHandler extends BaseStageHandler {
  getAgentParticipantActionsForStage(
    participant: ParticipantProfileExtended,
    stage: StageConfig,
  ): AgentParticipantStageActions {
    return {callApi: false, moveToNextStage: false};
  }

  getStageDisplayForPrompt(
    participants: ParticipantProfileExtended[],
    stageContext: StageContextData,
    includeScaffolding: boolean,
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
      prompt: createDefaultParticipantPrompt(
        DEFAULT_AGENT_PARTICIPANT_CHAT_PROMPT,
      ),
    });
  }
}
