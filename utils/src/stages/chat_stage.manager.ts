import {ParticipantProfileExtended, getNameFromPublicId} from '../participant';
import {
  SECONDARY_PROFILE_SET_ID,
  TERTIARY_PROFILE_SET_ID,
  PROFILE_SET_ANIMALS_2_ID,
  PROFILE_SET_NATURE_ID,
} from '../profile_sets';
import {createDefaultPromptFromText} from '../structured_prompt';
import {ChatStageConfig} from './chat_stage';
import {
  DEFAULT_AGENT_MEDIATOR_PROMPT,
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

export class GroupChatStageHandler implements StageHandler<ChatStageConfig> {
  getStageDisplayForPrompt(
    participants: ParticipantProfileExtended[],
    stageContext: StageContextData,
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
    // Get participant names
    const participantNames = participants.map((participant) =>
      getNameFromPublicId(
        [participant],
        participant.publicId,
        getProfileSetId(),
        true,
        true,
      ),
    );
    return `Group chat participants: ${participantNames.join(', ')}\n${getChatPromptMessageHistory(messages, stage)}`;
  }

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
