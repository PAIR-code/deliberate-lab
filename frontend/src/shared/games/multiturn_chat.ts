import {createProfileStage} from '@deliberation-lab/utils';
import {createAgentResponseConfig} from '@deliberation-lab/utils';
import {
  createAgentChatPromptConfig,
  createAgentChatSettings,
  createAgentPersonaConfig,
  createChatStage,
  createMetadataConfig,
  createParticipantProfileBase,
  AgentChatPromptConfig,
  AgentDataObject,
  ProfileType,
  StageConfig,
  StageGame,
  StageKind,
} from '@deliberation-lab/utils';

// ****************************************************************************
// Experiment config
// ****************************************************************************

export const MLT_METADATA = createMetadataConfig({
  name: 'Multiturn Chat',
  publicName: 'Multiturn Chat',
  description: '1-on-1 chat with an agent',
});

export const MLT_CHAT_STAGE_ID = 'chat';

export function getMLTStageConfigs(): StageConfig[] {
  const stages: StageConfig[] = [];
  stages.push(
    createProfileStage({
      name: 'View your profile',
      profileType: ProfileType.ANONYMOUS_ANIMAL,
    }),
    createChatStage({
      id: MLT_CHAT_STAGE_ID,
      name: 'Chat',
      descriptions: {
        primaryText: 'Chat with an agent about your use case',
        infoText: '',
        helpText: '',
      },
    }),
  );
  return stages;
}

const COACHING_PROMPT = `
  You are a coach. Ask one thought-provoking question at a time.
  Make one point at a time.
`;

export const MLT_AGENTS: AgentDataObject[] = [createCoachingAgent()];

function createCoachingAgent(): AgentDataObject {
  const persona = createAgentPersonaConfig({
    name: 'Coaching Agent',
    isDefaultAddToCohort: true,
    defaultProfile: createParticipantProfileBase({
      name: 'Coach',
      avatar: '🙋',
    }),
  });

  const chatPromptMap: Record<string, AgentChatPromptConfig> = {};
  chatPromptMap[MLT_CHAT_STAGE_ID] = createAgentChatPromptConfig(
    MLT_CHAT_STAGE_ID, // stage ID
    StageKind.CHAT, // stage kind,
    {
      promptContext: COACHING_PROMPT,
      chatSettings: createAgentChatSettings({
        wordsPerMinute: 10000,
        canSelfTriggerCalls: false,
        maxResponses: 10,
      }),
      responseConfig: createAgentResponseConfig({
        isJSON: true,
        messageField: 'response',
        explanationField: 'explanation',
      }),
    },
  );

  return {persona, participantPromptMap: {}, chatPromptMap};
}
