import {createMediatorResponseConfig} from '@deliberation-lab/utils';
import {
  createMediatorConfig,
  StageConfig,
  StageGame,
  createChatStage,
  createMetadataConfig,
} from '@deliberation-lab/utils';
// ****************************************************************************
// Experiment config
// ****************************************************************************
export const RTV_METADATA = createMetadataConfig({
  name: 'Reality TV Chat',
  publicName: 'Reality TV Chat',
  description: 'A conversation between multiple agents who discuss reality TV shows.'
});
export function getRTVStageConfigs(): StageConfig[] {
  const stages: StageConfig[] = [];
  stages.push(
    createChatStage({
      game: StageGame.RTV,
      name: 'Group discussion',
      descriptions: {
        primaryText: '',
        infoText: `In this discussion, participants are discussing which is the best TV show.`,
        helpText: '',
      },
      mediators: [
        createMediatorConfig({
          name: 'LIBLenny',
          avatar: '🤦🏻‍♂️',
          prompt:
            'You are engaged in a debate about which reality TV show is the best. Your goal is to convince the others in the conversation that Love is Blind is the best reality TV show. You are sure about this and your mind will not be changed. When you feel that a consensus has been made about which reality TV show is the best, you can stop responding.\n ',
          wordsPerMinute: 150,
          responseConfig: createMediatorResponseConfig({
            isJSON: true,
            messageField: 'response',
            explanationField: 'explanation',
          }),
        }),
        createMediatorConfig({
          name: 'BachelorFanBob',
          avatar: '👴🏾',
          prompt:
            "You are engaged in a debate about which reality TV show is the best. You've watched a few episodes of the Bachelor, so you think that is the best show. However, you could be convinced otherwise. When you feel that a consensus has been made about which reality TV show is the best, you can stop responding.\n ",
          wordsPerMinute: 150,
          responseConfig: createMediatorResponseConfig({
            isJSON: true,
            messageField: 'response',
            explanationField: 'explanation',
          }),
        }),
        createMediatorConfig({
          name: 'RealityLuvrRhonda',
          avatar: '💁🏽‍♀️',
          prompt:
            "You are engaged in a debate about which reality TV show is the best. You don't have a preference and are open to hearing all perspectives. When you feel that a consensus has been made about which reality TV show is the best, you can stop responding.\n ",
          wordsPerMinute: 100,
          responseConfig: createMediatorResponseConfig({
            isJSON: true,
            messageField: 'response',
            explanationField: 'explanation',
          }),
        }),
        createMediatorConfig({
          name: 'FriendlyFrancine',
          avatar: '😻',
          prompt:
            "You are engaged in a debate about which reality TV show is best. You don't really care about the outcome, you want everybody to be friends. If you sense that the conversation is getting heated, do your best to mediate the situation.\n ",
          wordsPerMinute: 50,
          responseConfig: createMediatorResponseConfig({
            isJSON: true,
            messageField: 'response',
            explanationField: 'explanation',
          }),
        }),
        createMediatorConfig({
          name: 'QuietQuinton',
          avatar: '🙈',
          prompt:
            "You are engaged in a debate about which reality TV show is best. You are shy and don't talk that much. However, your best friend is 😻 FriendlyFrancine, and you will jump into the conversation to support her.\n ",
          wordsPerMinute: 40,
          responseConfig: createMediatorResponseConfig({
            isJSON: true,
            messageField: 'response',
            explanationField: 'explanation',
          }),
        }),
      ],
    })
  );
  return stages;
}
