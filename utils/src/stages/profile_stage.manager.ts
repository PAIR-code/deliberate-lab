import {createModelGenerationConfig} from '../agent';
import {ExperimenterData} from '../experimenter';
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
import {StageConfig, StageContextData, StageKind} from './stage';
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
      generationConfig: createModelGenerationConfig(),
      structuredOutputConfig: createProfileStructuredOutputConfig(
        stage.profileType,
      ),
      numRetries: 0,
    };
  }
}
