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
export function getRealityTVExperimentTemplate(): ExperimentTemplate {
  const stageConfigs = getRTVStageConfigs();
  return createExperimentTemplate({
    experiment: createExperimentConfig(stageConfigs, {metadata: RTV_METADATA}),
    stageConfigs,
    agentMediators: RTV_MEDIATOR_AGENTS,
    agentParticipants: RTV_PARTICIPANT_AGENTS,
  });
}

export const RTV_METADATA = createMetadataConfig({
  name: '📺 TV Debate',
  publicName: 'TV Debate',
  description:
    'A debate scenario that showcases multi-agent conversation and facilitation.',
});

const RTV_CHAT_STAGE_ID = 'chat';

function getRTVStageConfigs(): StageConfig[] {
  const stages: StageConfig[] = [];
  stages.push(
    createProfileStage({
      name: 'View your profile',
      profileType: ProfileType.ANONYMOUS_ANIMAL,
    }),
    createChatStage({
      id: RTV_CHAT_STAGE_ID,
      name: 'Group discussion',
      descriptions: {
        primaryText:
          'In this discussion, you will debate with other participants to agree upon the best TV show. Keep an open mind! You can end the conversation and progress to the next stage when you have reached agreement.',
        infoText: '',
        helpText: '',
      },
    }),
  );
  return stages;
}

const RTV_MEDIATOR_AGENTS: AgentMediatorTemplate[] = [createModeratorAgent()];
const RTV_PARTICIPANT_AGENTS: AgentParticipantTemplate[] = [
  createLennyAgent(),
  createBobAgent(),
  createRhondaAgent(),
];

function createLennyAgent(): AgentParticipantTemplate {
  const persona = createAgentParticipantPersonaConfig({
    name: 'Lenny (Love is Blind)',
    isDefaultAddToCohort: true,
    defaultProfile: createParticipantProfileBase({
      name: 'Lenny',
      avatar: '🤦🏻‍♂️',
    }),
  });

  const promptMap: Record<string, ParticipantPromptConfig> = {};
  promptMap[RTV_CHAT_STAGE_ID] = createChatPromptConfig(
    RTV_CHAT_STAGE_ID, // stage ID
    StageKind.CHAT,
    {
      prompt: createDefaultPromptFromText(
        'You are engaged in a debate about which TV show is the best. Your goal is to convince the others in the conversation that Love is Blind is the best TV show. You are sure about this and your mind will not be changed. When you feel that a consensus has been made about which TV show is the best, you can stop responding.\n',
        RTV_CHAT_STAGE_ID,
      ),
      chatSettings: createAgentChatSettings({
        wordsPerMinute: 300,
        canSelfTriggerCalls: false,
        maxResponses: 10,
      }),
    },
  );

  return {persona, promptMap};
}

function createBobAgent(): AgentParticipantTemplate {
  const persona = createAgentParticipantPersonaConfig({
    name: 'Bob (The Bachelor)',
    isDefaultAddToCohort: true,
    defaultProfile: createParticipantProfileBase({
      name: 'Bob',
      avatar: '👴🏾',
    }),
  });

  const promptMap: Record<string, ParticipantPromptConfig> = {};
  promptMap[RTV_CHAT_STAGE_ID] = createChatPromptConfig(
    RTV_CHAT_STAGE_ID, // stage ID
    StageKind.CHAT,
    {
      prompt: createDefaultPromptFromText(
        "You are engaged in a debate about which TV show is the best. You've watched a few episodes of the Bachelor, so you think that is the best show. However, you could be convinced otherwise. When you feel that a consensus has been made about which TV show is the best, you can stop responding.\n",
        RTV_CHAT_STAGE_ID,
      ),
      chatSettings: createAgentChatSettings({
        wordsPerMinute: 150,
        canSelfTriggerCalls: false,
        maxResponses: 10,
      }),
    },
  );

  return {persona, promptMap};
}

function createRhondaAgent(): AgentParticipantTemplate {
  const persona = createAgentParticipantPersonaConfig({
    name: 'Rhonda (no show preference)',
    isDefaultAddToCohort: true,
    defaultProfile: createParticipantProfileBase({
      name: 'Rhonda',
      avatar: '💁🏽‍♀️',
    }),
  });

  const promptMap: Record<string, ParticipantPromptConfig> = {};
  promptMap[RTV_CHAT_STAGE_ID] = createChatPromptConfig(
    RTV_CHAT_STAGE_ID, // stage ID
    StageKind.CHAT,
    {
      prompt: createDefaultPromptFromText(
        "You are engaged in a debate about which TV show is the best. You don't have a preference and are open to hearing all perspectives. When you feel that a consensus has been made about which TV show is the best, you can stop responding.\n",
        RTV_CHAT_STAGE_ID,
      ),
      chatSettings: createAgentChatSettings({
        wordsPerMinute: 100,
        canSelfTriggerCalls: false,
        maxResponses: 10,
      }),
    },
  );

  return {persona, promptMap};
}

function createModeratorAgent(): AgentMediatorTemplate {
  const persona = createAgentMediatorPersonaConfig({
    name: 'Moderator',
    isDefaultAddToCohort: true,
    defaultProfile: createParticipantProfileBase({
      name: 'Moderator',
      avatar: '👩‍⚖️',
    }),
  });

  const promptMap: Record<string, MediatorPromptConfig> = {};
  promptMap[RTV_CHAT_STAGE_ID] = createChatPromptConfig(
    RTV_CHAT_STAGE_ID, // stage ID
    StageKind.CHAT,
    {
      prompt: createDefaultPromptFromText(
        'You are facilitating a debate on the best TV show. Intervene only if the conversation stalls or veers off-track, and only to help participants reach consensus.',
        RTV_CHAT_STAGE_ID,
      ),
      chatSettings: createAgentChatSettings({
        wordsPerMinute: 300,
        canSelfTriggerCalls: false,
        maxResponses: 10,
      }),
    },
  );

  return {persona, promptMap};
}
