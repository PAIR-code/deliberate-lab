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
  createDefaultPromptFromText,
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
  const stageConfigs = getStageConfigs();
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

function getStageConfigs(): StageConfig[] {
  const stages: StageConfig[] = [];
  stages.push(
    createProfileStage({
      name: 'View your randomly assigned profile',
      profileType: ProfileType.ANONYMOUS_ANIMAL,
    }),
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
    {
      prompt: createDefaultPromptFromText(
        'You are facilitating a group chat. Make sure all participants have a chance to speak and that everyone is polite to one another.',
        CHAT_STAGE_ID,
      ),
    },
  );

  return {persona, promptMap};
}
