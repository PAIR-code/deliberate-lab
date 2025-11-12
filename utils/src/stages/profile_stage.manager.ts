import {createModelGenerationConfig} from '../agent';
import {ParticipantProfileExtended} from '../participant';
import {
  ParticipantPromptConfig,
  createDefaultPromptFromText,
} from '../structured_prompt';
import {ProfileStageConfig, ProfileType} from './profile_stage';
import {
  createProfilePrompt,
  createProfileStructuredOutputConfig,
} from './profile_stage.prompts';
import {StageKind} from './stage';
import {AgentParticipantStageActions, BaseStageHandler} from './stage.handler';

export class ProfileStageHandler extends BaseStageHandler {
  getAgentParticipantActionsForStage(
    participant: ParticipantProfileExtended,
    stage: ProfileStageConfig,
  ): AgentParticipantStageActions {
    const stageProfileType = stage.profileType as ProfileType;
    const agentConfig = participant.agentConfig;

    // No action if not agent or not a manually settable profile type
    if (
      !agentConfig ||
      stageProfileType === ProfileType.ANONYMOUS_ANIMAL ||
      stageProfileType === ProfileType.ANONYMOUS_PARTICIPANT
    ) {
      return {callApi: false, moveToNextStage: true};
    }
    // Otherwise, use API to update profile
    return {callApi: true, moveToNextStage: true};
  }

  extractAgentParticipantAnswerFromResponse(
    participant: ParticipantProfileExtended,
    stage: ProfileStageConfig,
    response: unknown,
  ) {
    const responseMap = response as Record<string, string>;
    const name = responseMap['name'];
    if (name) {
      participant.name = name.trim();
    }

    const avatar = responseMap['emoji'];
    if (avatar) {
      // TODO: For DEFAULT_GENDERED profile type, set random emoji from
      // PROFILE_AVATARS if the model-chosen emoji is not part of the set
      participant.avatar = avatar;
    }

    const pronouns = responseMap['pronouns'];
    if (pronouns) {
      participant.pronouns = pronouns.trim();
    }

    return undefined;
  }

  getDefaultParticipantStructuredPrompt(
    stage: ProfileStageConfig,
  ): ParticipantPromptConfig {
    return {
      id: stage.id,
      type: StageKind.PROFILE,
      prompt: createDefaultPromptFromText(
        createProfilePrompt(stage.profileType),
        stage.id,
      ),
      includeScaffoldingInPrompt: true,
      generationConfig: createModelGenerationConfig(),
      structuredOutputConfig: createProfileStructuredOutputConfig(
        stage.profileType,
      ),
      numRetries: 0,
    };
  }
}
