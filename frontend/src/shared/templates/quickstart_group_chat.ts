import {
  createAgentChatSettings,
  createAgentMediatorPersonaConfig,
  createAgentParticipantPersonaConfig,
  createChatPromptConfig,
  createChatStage,
  createExperimentConfig,
  createExperimentTemplate,
  createMetadataConfig,
  createParticipantProfileBase,
  createProfileStage,
  createDefaultMediatorGroupChatPrompt,
  AgentMediatorTemplate,
  AgentParticipantTemplate,
  AgentPersonaType,
  ExperimentTemplate,
  MediatorPromptConfig,
  ParticipantPromptConfig,
  ProfileType,
  StageConfig,
  StageKind,
} from '@deliberation-lab/utils';

// ****************************************************************************
// Experiment config
// ****************************************************************************
export function getQuickstartGroupChatTemplate(): ExperimentTemplate {
  const stageConfigs = getStageConfigs(false);
  const metadata = createMetadataConfig({
    name: 'Group Chat Experiment',
    publicName: 'Group Chat',
    description: 'Template experiment: group chat, no agents.',
  });

  return createExperimentTemplate({
    experiment: createExperimentConfig(stageConfigs, {metadata}),
    stageConfigs,
    agentMediators: [],
    agentParticipants: [],
  });
}

export function getQuickstartAgentGroupChatTemplate(): ExperimentTemplate {
  const stageConfigs = getStageConfigs(true);
  const metadata = createMetadataConfig({
    name: 'Mediated Group Chat Experiment',
    publicName: 'Group Chat',
    description: 'Template experiment with agent-mediated group chat',
  });

  return createExperimentTemplate({
    experiment: createExperimentConfig(stageConfigs, {metadata}),
    stageConfigs,
    agentMediators: [createMediatorAgent()],
    agentParticipants: [],
  });
}

const CHAT_STAGE_ID = 'chat';

function getStageConfigs(anonymous: boolean = true): StageConfig[] {
  const stages: StageConfig[] = [];
  let profileStage;
  if (anonymous === true) {
    profileStage = {
      name: 'View your randomly assigned profile',
      profileType: ProfileType.ANONYMOUS_ANIMAL,
    };
  } else {
    profileStage = {
      name: 'Set your profile',
      profileType: ProfileType.DEFAULT,
    };
  }

  stages.push(
    createProfileStage(profileStage),
    createChatStage({
      id: CHAT_STAGE_ID,
      name: 'Group chat',
    }),
  );
  return stages;
}

function createMediatorAgent(): AgentMediatorTemplate {
  const persona = createAgentMediatorPersonaConfig({
    name: 'Mediator',
    description:
      'Makes sure participants all have the chance to speak and that everyone is polite',
    isDefaultAddToCohort: true,
    defaultProfile: createParticipantProfileBase({
      name: 'Mediator',
      avatar: '🤖',
    }),
  });

  const promptMap: Record<string, MediatorPromptConfig> = {};
  promptMap[CHAT_STAGE_ID] = createChatPromptConfig(
    CHAT_STAGE_ID, // stage ID
    StageKind.CHAT,
    {
      prompt: createDefaultMediatorGroupChatPrompt(CHAT_STAGE_ID),
    },
  );

  return {persona, promptMap};
}
