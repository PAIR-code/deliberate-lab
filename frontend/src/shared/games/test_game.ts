import {
  AgentChatPromptConfig,
  AgentPersonaType,
  ApiKeyType,
  createAgentChatPromptConfig,
  createAgentPromptSettings,
  createAgentChatSettings,
  createAgentModelSettings,
  createAgentPersonaConfig,
  createChatStage,
  createCheckSurveyQuestion,
  createInfoStage,
  createMetadataConfig,
  createMultipleChoiceItem,
  createMultipleChoiceSurveyQuestion,
  createParticipantProfileBase,
  createProfileStage,
  createScaleSurveyQuestion,
  createStageProgressConfig,
  createStageTextConfig,
  createSurveyAutoTransferConfig,
  createSurveyStage,
  createTextSurveyQuestion,
  createTOSStage,
  createTransferStage,
  MultipleChoiceItem,
  ProfileType,
  ScaleSurveyQuestion,
  StageConfig,
  StageGame,
  StageKind,
  SurveyQuestion,
  SurveyStageConfig,
} from '@deliberation-lab/utils';

export const TG_METADATA = createMetadataConfig({
  name: 'Fruit test',
  publicName: 'Fruit Chat',
  description: 'A discussion about fruit',
});

export const TG_CHAT_STAGE_ID = 'test_game_chat';

export function getTgStageConfigs(): StageConfig[] {
  const stages: StageConfig[] = [];

  stages.push(TG_TOS_STAGE);
  stages.push(TG_PROFILE_STAGE);
  stages.push(TG_SURVEY_STAGE);
  stages.push(TG_TRANSFER_STAGE);

  stages.push(TG_CHAT_INTRO_STAGE);
  stages.push(TG_CHAT_STAGE);

  return stages;
}

const TG_CONSENT = 'You must agree to participate in this study.';
const TG_AGENT_PROMPT = `You don't like apples or pears, but you do like bananas`;

const TG_TOS_STAGE = createTOSStage({
  id: 'tos',
  game: StageGame.TG,
  name: 'Consent',
  tosLines: TG_CONSENT.split('\n'),
});

const TG_PROFILE_STAGE = createProfileStage({
  id: 'profile',
  name: 'Your randomly generated identity',
  descriptions: createStageTextConfig({
    primaryText:
      "This is how other participants will see you during today's experiment. Click 'Next stage' below to continue.",
  }),
  game: StageGame.TG,
  profileType: ProfileType.ANONYMOUS_ANIMAL,
});

const TG_SURVEY_STAGE = createSurveyStage({
  id: 'tg_survey',
  name: 'Preferences',
  game: StageGame.TG,
  questions: [
    createMultipleChoiceSurveyQuestion({
      id: 'fruit_preference',
      questionTitle: 'Apple or pear?',
      options: [
        createMultipleChoiceItem({id: 'apple', text: 'I like apples'}),
        createMultipleChoiceItem({id: 'pear', text: 'I like pears'}),
      ],
    }),
  ],
});

const TG_TRANSFER_TEXT =
  'Please wait while we match you with another conversation participant, and transfer you to the next phase of the experiment. This usually happens within 5 minutes. The delay has been accounted for in the total study time, so you will be paid for the time you spend waiting.';

const TG_TRANSFER_STAGE = createTransferStage({
  id: 'participant_matching_transfer',
  name: 'Wait for other participants',
  game: StageGame.TG,
  enableTimeout: false,
  descriptions: createStageTextConfig({primaryText: TG_TRANSFER_TEXT}),
  autoTransferConfig: createSurveyAutoTransferConfig({
    surveyStageId: 'tg_survey',
    surveyQuestionId: 'fruit_preference',
    participantCounts: {apple: 1, pear: 1},
  }),
});

const TG_CHAT_INTRO_TEXT = `On the next screen, you will have a conversation with another participant. To get started, explain your position on fruit.`;

const TG_CHAT_INTRO_STAGE = createInfoStage({
  id: 'chat_intro',
  name: 'Discussion introduction',
  infoLines: TG_CHAT_INTRO_TEXT.split('\n'),
});

const TG_CHAT_STAGE = createChatStage({
  game: StageGame.TG,
  id: TG_CHAT_STAGE_ID,
  name: 'Group discussion',
  timeLimitInMinutes: 10,
  descriptions: {
    primaryText:
      'In this discussion, you will have a conversation with one other participant. To get started, explain your position on fruit.',
    infoText: '',
    helpText: '',
  },
  progress: createStageProgressConfig({
    minParticipants: 2,
    waitForAllParticipants: true,
    showParticipantProgress: false,
  }),
});

const createBbotAgent = () => {
  const persona = createAgentPersonaConfig({
    name: 'BridgingBot',
    isDefaultAddToCohort: true,
    defaultProfile: createParticipantProfileBase({
      name: 'BridgingBot',
      avatar: '💁',
    }),
    defaultModelSettings: createAgentModelSettings({
      apiType: ApiKeyType.OPENAI_API_KEY,
      modelName: 'gpt-4o',
    }),
  });

  const chatPromptMap: Record<string, AgentChatPromptConfig> = {};
  chatPromptMap[TG_CHAT_STAGE_ID] = createAgentChatPromptConfig(
    TG_CHAT_STAGE_ID, // stage ID
    StageKind.CHAT, // stage kind,
    AgentPersonaType.MEDIATOR,
    {
      promptContext: TG_AGENT_PROMPT,
      promptSettings: createAgentPromptSettings({
        includeStageHistory: false,
        includeStageInfo: false, // Do not include the chat description, since it could be confusing
      }),
      chatSettings: createAgentChatSettings({
        wordsPerMinute: 300,
        minMessagesBeforeResponding: 5,
        canSelfTriggerCalls: false,
        maxResponses: 1,
      }),
    },
  );

  return {persona, participantPromptMap: {}, chatPromptMap};
};

export const TG_AGENTS = [createBbotAgent()];
