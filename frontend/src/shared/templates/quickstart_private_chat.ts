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
  createPrivateChatStage,
  createProfileStage,
  createDefaultMediatorPromptFromText,
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
export function getQuickstartPrivateChatTemplate(): ExperimentTemplate {
  const stageConfigs = getStageConfigs();
  const metadata = createMetadataConfig({
    name: 'Private Chat Experiment',
    publicName: 'Private Chat',
    description: 'Template experiment with private chat between user and agent',
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
    createProfileStage(),
    createPrivateChatStage({
      id: CHAT_STAGE_ID,
      name: 'Private chat with agent',
    }),
  );
  return stages;
}

function createMediatorAgent(): AgentMediatorTemplate {
  const persona = createAgentMediatorPersonaConfig({
    name: 'Agent',
    description: 'Has 1-on-1 conversation with user and tries to help them',
    isDefaultAddToCohort: true,
    defaultProfile: createParticipantProfileBase({
      name: 'Agent',
      avatar: '🤖',
    }),
  });

  const promptMap: Record<string, MediatorPromptConfig> = {};
  promptMap[CHAT_STAGE_ID] = createChatPromptConfig(
    CHAT_STAGE_ID, // stage ID
    StageKind.PRIVATE_CHAT,
    {
      prompt: createDefaultMediatorPromptFromText(
        'You are having a private chat with a human user. Be friendly and helpful to help the user achieve their goals.',
        CHAT_STAGE_ID,
      ),
    },
    AgentPersonaType.MEDIATOR,
  );

  return {persona, promptMap};
}
