import {
  createAgentPromptSettings,
  createAgentChatSettings,
  createAgentModelSettings,
  createAgentMediatorPersonaConfig,
  createChatPromptConfig,
  createChatStage,
  createCheckSurveyQuestion,
  createExperimentConfig,
  createExperimentTemplate,
  createInfoStage,
  createMetadataConfig,
  createMultipleChoiceItem,
  createMultipleChoiceSurveyQuestion,
  createParticipantProfileBase,
  createProfileStage,
  createDefaultPromptFromText,
  createScaleSurveyQuestion,
  createStageProgressConfig,
  createStageTextConfig,
  createSurveyAutoTransferConfig,
  createSurveyStage,
  createTextSurveyQuestion,
  createTOSStage,
  createTransferStage,
  AgentPersonaType,
  ApiKeyType,
  ExperimentTemplate,
  MediatorPromptConfig,
  MultipleChoiceItem,
  ProfileType,
  ScaleSurveyQuestion,
  StageConfig,
  StageKind,
  SurveyQuestion,
  SurveyStageConfig,
} from '@deliberation-lab/utils';

export function getFruitTestExperimentTemplate(): ExperimentTemplate {
  const stageConfigs = getFruitStageConfigs();
  return createExperimentTemplate({
    experiment: createExperimentConfig(stageConfigs, {
      metadata: FRUIT_TEST_METADATA,
    }),
    stageConfigs,
    agentMediators: TG_MEDIATOR_AGENTS,
  });
}

export const FRUIT_TEST_METADATA = createMetadataConfig({
  name: 'Auto-Transfer (via Survey) Demo',
  publicName: 'Fruit Chat',
  description: 'Includes auto-transfer into groups based on fruit preferences',
});

const TG_CHAT_STAGE_ID = 'fruit_test_chat';

function getFruitStageConfigs(): StageConfig[] {
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
  profileType: ProfileType.ANONYMOUS_ANIMAL,
});

const TG_SURVEY_STAGE = createSurveyStage({
  id: 'tg_survey',
  name: 'Preferences',
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
  const persona = createAgentMediatorPersonaConfig({
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

  const promptMap: Record<string, MediatorPromptConfig> = {};
  promptMap[TG_CHAT_STAGE_ID] = createChatPromptConfig(
    TG_CHAT_STAGE_ID, // stage ID
    StageKind.CHAT,
    {
      prompt: createDefaultPromptFromText(TG_AGENT_PROMPT, TG_CHAT_STAGE_ID),
      chatSettings: createAgentChatSettings({
        wordsPerMinute: 300,
        minMessagesBeforeResponding: 5,
        canSelfTriggerCalls: false,
        maxResponses: 1,
      }),
    },
  );

  return {persona, promptMap};
};

const TG_MEDIATOR_AGENTS = [createBbotAgent()];
