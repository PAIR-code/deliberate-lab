import {createProfileStage} from '@deliberation-lab/utils';
import {createAgentResponseConfig} from '@deliberation-lab/utils';
import {
  createAgentConfig,
  StageConfig,
  StageGame,
  createChatStage,
  createMetadataConfig,
  ProfileType,
} from '@deliberation-lab/utils';
// ****************************************************************************
// Experiment config
// ****************************************************************************
export const RTV_METADATA = createMetadataConfig({
  name: 'Reality TV Chat',
  publicName: 'Reality TV Chat',
  description:
    'A debate scenario that showcases multi-agent conversation and facilitation.',
});
export function getRTVStageConfigs(): StageConfig[] {
  const stages: StageConfig[] = [];
  stages.push(
    createProfileStage({
      game: StageGame.RTV,
      name: 'View your profile',
      profileType: ProfileType.ANONYMOUS_ANIMAL,
    }),
    createChatStage({
      game: StageGame.RTV,
      name: 'Group discussion',
      descriptions: {
        primaryText:
          'In this discussion, you will debate with other participants to agree upon the best TV show. Keep an open mind! You can end the conversation and progress to the next stage when you have reached agreement.',
        infoText: '',
        helpText: '',
      },
      agents: [
        createAgentConfig({
          name: 'LIBLenny',
          avatar: '🤦🏻‍♂️',
          prompt:
            'You are engaged in a debate about which reality TV show is the best. Your goal is to convince the others in the conversation that Love is Blind is the best reality TV show. You are sure about this and your mind will not be changed. When you feel that a consensus has been made about which reality TV show is the best, you can stop responding.\n ',
          wordsPerMinute: 300,
          responseConfig: createAgentResponseConfig({
            isJSON: true,
            messageField: 'response',
            explanationField: 'explanation',
          }),
        }),
        createAgentConfig({
          name: 'BachelorFanBob',
          avatar: '👴🏾',
          prompt:
            "You are engaged in a debate about which reality TV show is the best. You've watched a few episodes of the Bachelor, so you think that is the best show. However, you could be convinced otherwise. When you feel that a consensus has been made about which reality TV show is the best, you can stop responding.\n ",
          wordsPerMinute: 150,
          responseConfig: createAgentResponseConfig({
            isJSON: true,
            messageField: 'response',
            explanationField: 'explanation',
          }),
        }),
        createAgentConfig({
          name: 'RealityLuvrRhonda',
          avatar: '💁🏽‍♀️',
          prompt:
            "You are engaged in a debate about which reality TV show is the best. You don't have a preference and are open to hearing all perspectives. When you feel that a consensus has been made about which reality TV show is the best, you can stop responding.\n ",
          wordsPerMinute: 100,
          responseConfig: createAgentResponseConfig({
            isJSON: true,
            messageField: 'response',
            explanationField: 'explanation',
          }),
        }),
        createAgentConfig({
          name: 'Moderator',
          avatar: '👩‍⚖️',
          prompt:
            'You are facilitating a debate on the best reality TV show. Intervene only if the conversation stalls or veers off-track, and only to help participants reach consensus.',
          wordsPerMinute: 300,
          responseConfig: createAgentResponseConfig({
            isJSON: true,
            messageField: 'response',
            explanationField: 'explanation',
          }),
        }),
      ],
    }),
  );
  return stages;
}
