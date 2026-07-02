import {ParticipantProfileExtended, getNameFromPublicId} from '../participant';
import {
  SECONDARY_PROFILE_SET_ID,
  TERTIARY_PROFILE_SET_ID,
  PROFILE_SET_ANIMALS_2_ID,
  PROFILE_SET_NATURE_ID,
} from '../profile_sets';
import {
  ChatParticipantInstructionsPromptItem,
  DEFAULT_AGENT_PARTICIPANT_PROMPT_INSTRUCTIONS,
  MediatorPromptConfig,
  ParticipantPromptConfig,
  PromptItemType,
  createDefaultStageContextPromptItem,
  createTextPromptItem,
} from '../structured_prompt';
import {ChatStageConfig} from './chat_stage';
import {
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
    // Get participant names (exclude observers)
    const participantNames = stageContext.participants
      .filter((participant) => !participant.isObserver)
      .map((participant) =>
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
      prompt: [
        createTextPromptItem(DEFAULT_AGENT_PARTICIPANT_PROMPT_INSTRUCTIONS),
        createTextPromptItem('--- Participant description ---'),
        {type: PromptItemType.PROFILE_INFO},
        {type: PromptItemType.PROFILE_CONTEXT},
        createDefaultStageContextPromptItem(''),
        {
          type: PromptItemType.CHAT_PARTICIPANT_INSTRUCTIONS,
        } as ChatParticipantInstructionsPromptItem,
      ],
    });
  }
}
