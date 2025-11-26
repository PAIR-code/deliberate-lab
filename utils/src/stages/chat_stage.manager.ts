import {ParticipantProfileExtended, getNameFromPublicId} from '../participant';
import {
  SECONDARY_PROFILE_SET_ID,
  TERTIARY_PROFILE_SET_ID,
  PROFILE_SET_ANIMALS_2_ID,
  PROFILE_SET_NATURE_ID,
} from '../profile_sets';
import {
  MediatorPromptConfig,
  ParticipantPromptConfig,
  createDefaultParticipantPrompt,
} from '../structured_prompt';
import {ChatStageConfig} from './chat_stage';
import {
  DEFAULT_MEDIATOR_GROUP_CHAT_PROMPT_INSTRUCTIONS,
  DEFAULT_AGENT_PARTICIPANT_CHAT_PROMPT,
  createChatPromptConfig,
  createDefaultMediatorGroupChatPrompt,
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

export class GroupChatStageHandler extends BaseStageHandler {
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
    const stage = stageContext.stage as ChatStageConfig;
    const messages = stageContext.publicChatMessages;

    // Handle profile set ID workaround
    const getProfileSetId = () => {
      if (stage.id.includes(SECONDARY_PROFILE_SET_ID)) {
        return PROFILE_SET_ANIMALS_2_ID;
      } else if (stage.id.includes(TERTIARY_PROFILE_SET_ID)) {
        return PROFILE_SET_NATURE_ID;
      }
      return '';
    };
    // Get participant names (from all active participants)
    const participantNames = stageContext.participants.map((participant) =>
      getNameFromPublicId(
        [participant],
        participant.publicId,
        getProfileSetId(),
        true,
        true,
      ),
    );

    const users = `Participants in chat: ${participantNames.join(', ')}`;
    const history = getChatPromptMessageHistory(messages, stage);
    const transcript = includeScaffolding
      ? `\n\n--- Start of chat transcript ---\n${history}\n--- End of chat transcript ---\n`
      : history;

    return `${users}\n${transcript}`;
  }

  getDefaultMediatorStructuredPrompt(
    stage: ChatStageConfig,
  ): MediatorPromptConfig | undefined {
    return createChatPromptConfig(stage.id, StageKind.CHAT, {
      prompt: createDefaultMediatorGroupChatPrompt(stage.id),
    });
  }

  getDefaultParticipantStructuredPrompt(
    stage: ChatStageConfig,
  ): ParticipantPromptConfig | undefined {
    return createChatPromptConfig(stage.id, StageKind.CHAT, {
      prompt: createDefaultParticipantPrompt(
        DEFAULT_AGENT_PARTICIPANT_CHAT_PROMPT,
      ),
    });
  }
}
