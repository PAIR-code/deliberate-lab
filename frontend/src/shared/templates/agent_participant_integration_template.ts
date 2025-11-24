import {
  createAgentChatSettings,
  createAgentMediatorPersonaConfig,
  createChatPromptConfig,
  createExperimentTemplate,
  createParticipantProfileBase,
  createDefaultPromptFromText,
  AgentMediatorTemplate,
  ExperimentTemplate,
  MediatorPromptConfig,
  ProfileType,
  StageConfig,
  StageKind,
  PayoutCurrency,
  createChatStage,
  createComprehensionStage,
  createRankingItem,
  createRankingStage,
  createExperimentConfig,
  createInfoStage,
  createMultipleChoiceItem,
  createPayoutStage,
  createProfileStage,
  createMetadataConfig,
  createMultipleChoiceSurveyQuestion,
  createMultipleChoiceComprehensionQuestion,
  createRevealStage,
  createScaleSurveyQuestion,
  createStageTextConfig,
  createSurveyRevealItem,
  createSurveyStage,
  createTOSStage,
  createTransferStage,
  createStageProgressConfig,
  RankingType,
  RevealAudience,
  createTextComprehensionQuestion,
  createPrivateChatStage,
  createTextSurveyQuestion,
  createCheckSurveyQuestion,
  createSurveyPerParticipantStage,
  createDefaultPayoutItem,
} from '@deliberation-lab/utils';

// ****************************************************************************
// Experiment config
// ****************************************************************************
export function getAgentParticipantIntegrationTemplate(): ExperimentTemplate {
  const stageConfigs = getIntegrationStageConfigs();
  return createExperimentTemplate({
    experiment: createExperimentConfig(stageConfigs, {
      metadata: INTEGRATION_METADATA,
    }),
    stageConfigs,
    agentMediators: RTV_MEDIATOR_AGENTS,
  });
}

export const INTEGRATION_METADATA = createMetadataConfig({
  name: 'Agent Participant Test',
  publicName: 'Agent Participant Integration Experiment',
  description:
    'Add agent participants to this experiment. If they are working as expected, they should successfully complete all stages.',
});

const CHAT_STAGE_ID = 'chat';

function getIntegrationStageConfigs(): StageConfig[] {
  const stages: StageConfig[] = [];
  stages.push(INT_TOS_STAGE);
  stages.push(INT_PROFILE_STAGE);
  stages.push(INT_INFO_STAGE);
  stages.push(COMPREHENSION_CHECK);
  stages.push(INT_TRANSFER_STAGE);
  stages.push(INT_PRIVATE_CHAT_STAGE);
  stages.push(INT_SURVEY_STAGE_1);
  stages.push(INT_GROUP_CHAT_STAGE);
  stages.push(INT_SURVEY_STAGE_2);
  stages.push(INT_LIKELIHOOD_STAGE);
  stages.push(INT_REVEAL_STAGE);
  stages.push(INT_SURVEY_PER_PARTICIPANT_STAGE);
  stages.push(INT_PAYOUT_STAGE);
  return stages;
}

// ****************************************************************************
// Terms of service stage
// ****************************************************************************
const INT_TOS_LINES = [
  "Thank you for your interest in this research. If you choose to participate, you will be asked to participate in a prisoner's dilemma puzzle with other participants. In total, this will take up to 60 minutes, factoring in time you may spend waiting for others to join your live sessions. If the games take longer than expected, you will be compensated fairly for your additional time.",
  '**Compensation**',
  'You will be paid a base amount for playing the games and completing the survey. You may receive an additional bonus based on your performance in the games, up to $10 USD.',
  '**IRB**',
  'The results of this study will be used solely for research purposes. Our team will keep all your information from this study strictly confidential, as required by law. The IRB is responsible for protecting the rights and welfare of research volunteers like you.',
  '**Voluntary participation**',
  'Your participation is voluntary, which means you can choose whether or not to participate. You may choose not to participate by exiting at any point. There are no known costs to you for participating in this research study except for your time.',
  '**Contact**',
  'Please feel free to contact us through Prolific or your game administrator if you have any questions, concerns, or complaints about this study.',
  'By checking the box below and proceeding, you are acknowledging that you are over the age of 18 and that you consent to participate. Clicking "Next Step" will bring you to the beginning of the task.',
];
const INT_TOS_STAGE = createTOSStage({
  tosLines: INT_TOS_LINES,
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

// ****************************************************************************
// Profile stage
// ****************************************************************************
const INT_PROFILE_STAGE = createProfileStage({
  name: 'Set your profile',
  profileType: ProfileType.DEFAULT,
});

// ****************************************************************************
// Info stage
// ****************************************************************************
const INT_INFO_LINES = [
  "In this experiment, you will be playing the prisoner's dilemma with one other participant.",
  '# How the game works',
  'Your cohort is roleplaying as a duo of criminals who are awaiting trial for a crime. You have been separated into one room, and the other participant is in another. You must decide whether you will testify against the other participant or remain silent.',
  "If everyone in the cohort remains silent, everyone will serve 1 year in prison. If both people testify against each other, they will each serve 2 years. However, if one testifies and the other doesn't, the person that testifies will walk free while the other serves 3 years in prison.",
  'You will have a private conversation with an agent mediator to determine which decision to make. After you lock in your answers, you will have a group conversation, and each person will be able to revisit their decision. Keep in mind that users may be deceptive during this chat.',
];
const INT_INFO_STAGE = createInfoStage({
  name: 'Experiment Details',
  infoLines: INT_INFO_LINES,
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

// ****************************************************************************
// Comprehension checks
// ****************************************************************************
export const COMPREHENSION_CHECK = createComprehensionStage({
  id: 'comprehension_check1',
  name: 'Comprehension check',
  descriptions: createStageTextConfig({
    primaryText:
      'Please answer the following questions to verify your understanding of the instructions.',
  }),

  questions: [
    createMultipleChoiceComprehensionQuestion(
      {
        questionTitle:
          'What is the maximum sentence possible in this challenge?',
        options: [
          createMultipleChoiceItem({
            id: 'a',
            text: '1 year',
          }),
          createMultipleChoiceItem({
            id: 'b',
            text: '2 years',
          }),
          createMultipleChoiceItem({
            id: 'c',
            text: '3 years',
          }),
        ],
      },
      'c', // correct answer ID
    ),
    createTextComprehensionQuestion({
      questionTitle: 'Is it possible for both people to walk free?',
      correctAnswer: 'No',
    }),
  ],
});

// ****************************************************************************
// Transfer stage
// ****************************************************************************
const INT_TRANSFER_STAGE = createTransferStage({
  name: 'Cohort transfer',
});

// ****************************************************************************
// Private chat stage
// ****************************************************************************

const INT_PRIVATE_CHAT_DESCRIPTION =
  'In this chat, you will discuss with an agent to decide on a decision to take. Either you will testify, or stay silent. Once you have made a decision, advance to the next stage.';
const INT_PRIVATE_CHAT_STAGE = createPrivateChatStage({
  name: 'Teammate chat',
  id: CHAT_STAGE_ID,
  descriptions: createStageTextConfig({
    primaryText: INT_PRIVATE_CHAT_DESCRIPTION,
  }),
  timeLimitInMinutes: 5,
  minNumberOfTurns: 2,
});

// ****************************************************************************
// Survey stage
// ****************************************************************************
export const INT_SURVEY_STAGE_1 = createSurveyStage({
  id: 'survey1',
  name: 'Initial Survey',
  descriptions: createStageTextConfig({
    primaryText: 'You will now answer questions about the decision you made.',
  }),

  questions: [
    createCheckSurveyQuestion({
      questionTitle: 'Select the box below if you have come to a decision.',
      isRequired: true,
    }),
    createMultipleChoiceSurveyQuestion({
      questionTitle: 'What decision have you made?',
      options: [
        createMultipleChoiceItem({
          id: 'a',
          text: 'Testify',
        }),
        createMultipleChoiceItem({
          id: 'b',
          text: 'Stay silent',
        }),
      ],
    }),
    createScaleSurveyQuestion({
      questionTitle: 'How confident do you feel in your decision?',
      lowerValue: 0,
      upperValue: 5,
      stepSize: 1,
      lowerText: 'Not confident',
      upperText: 'Very confident',
    }),

    createTextSurveyQuestion({
      questionTitle: 'Please leave any comments about the experiment here.',
    }),
  ],
});

// ****************************************************************************
// Group chat stage
// ****************************************************************************

const INT_GROUP_CHAT_DESCRIPTION =
  "You will now have the option to talk with the other person. You may attempt to change each others' decisions.. Advance to the next stage when you are done. ";
const INT_GROUP_CHAT_STAGE = createChatStage({
  id: 'groupchat1',
  name: 'Group discussion',
  descriptions: createStageTextConfig({
    primaryText: INT_GROUP_CHAT_DESCRIPTION,
  }),
  progress: createStageProgressConfig({
    waitForAllParticipants: true,
    minParticipants: 2,
  }),
  timeLimitInMinutes: 2,
  requireFullTime: true,
});

// ****************************************************************************
// Survey stage
// ****************************************************************************
export const INT_SURVEY_STAGE_2 = createSurveyStage({
  id: 'survey2',
  name: 'Second Survey',
  descriptions: createStageTextConfig({
    primaryText:
      'You will now answer questions about the decision you made after consulting with the other person.',
  }),

  questions: [
    createCheckSurveyQuestion({
      questionTitle: 'Select the box below if you have come to a decision.',
      isRequired: true,
    }),
    createMultipleChoiceSurveyQuestion({
      questionTitle: 'What decision have you made?',
      options: [
        createMultipleChoiceItem({
          id: 'a',
          text: 'Testify',
        }),
        createMultipleChoiceItem({
          id: 'b',
          text: 'Stay silent',
        }),
      ],
    }),
  ],
});

// ****************************************************************************
// Likelihood stage
// ****************************************************************************

const RANKING_ITEMS = [
  createRankingItem({
    id: 'a',
    text: 'Both testify, each serves 2 years',
  }),
  createRankingItem({
    id: 'b',
    text: 'Neither testifies, each serves 1 year',
  }),
  createRankingItem({
    id: 'c',
    text: 'One person testifies, the other remains silent, one walks free and the other serves 3 years',
  }),
];
const INT_LIKELIHOOD_STAGE = createRankingStage({
  id: 'ranking',
  name: 'Ranking Likelihood of Outcomes',
  rankingType: RankingType.ITEMS,
  rankingItems: RANKING_ITEMS,
});

// ****************************************************************************
// Reveal stage
// ****************************************************************************

const INT_REVEAL_DESCRIPTION =
  'Now we will reveal what each team chose, and the resulting payout for each team.';
const INT_REVEAL_STAGE = createRevealStage({
  id: 'reveal',
  name: 'Results reveal',
  descriptions: createStageTextConfig({
    primaryText: INT_REVEAL_DESCRIPTION,
  }),
  items: [
    createSurveyRevealItem({
      id: 'survey2',
      revealAudience: RevealAudience.ALL_PARTICIPANTS,
    }),
  ],
});

// ****************************************************************************
// Survey per participant stage
// ****************************************************************************
export const INT_SURVEY_PER_PARTICIPANT_STAGE = createSurveyPerParticipantStage(
  {
    id: 'survey3',
    name: 'Survey per participant',
    questions: [
      createMultipleChoiceSurveyQuestion({
        questionTitle: 'How many years will you end up serving?',
        options: [
          createMultipleChoiceItem({
            id: 'a',
            text: '0',
          }),
          createMultipleChoiceItem({
            id: 'b',
            text: '1',
          }),
          createMultipleChoiceItem({
            id: 'c',
            text: '2',
          }),
          createMultipleChoiceItem({
            id: 'd',
            text: '3',
          }),
        ],
      }),
      createCheckSurveyQuestion({
        questionTitle:
          'Select the box below if you are satisfied with your outcome.',
        isRequired: true,
      }),
      createScaleSurveyQuestion({
        questionTitle:
          'How aligned were you and the other participant when negotiating?',
        lowerValue: 0,
        upperValue: 10,
        stepSize: 1,
        lowerText: 'Not aligned',
        upperText: 'Very aligned',
      }),

      createTextSurveyQuestion({
        questionTitle: 'Please leave any comments about the experiment here.',
      }),
    ],
  },
);

// ****************************************************************************
// Payout stage
// ****************************************************************************
const INT_PAYOUT_STAGE = createPayoutStage({
  name: 'Payout',
  currency: PayoutCurrency.USD,
  payoutItems: [
    createDefaultPayoutItem({
      id: 'payout',
      stageId: 'survey3',
      name: 'Participation payout',
      baseCurrencyAmount: 10,
    }),
  ],
});

const RTV_MEDIATOR_AGENTS: AgentMediatorTemplate[] = [createModeratorAgent()];

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
  promptMap[CHAT_STAGE_ID] = createChatPromptConfig(
    CHAT_STAGE_ID, // stage ID
    StageKind.CHAT,
    {
      prompt: createDefaultPromptFromText(
        "You are facilitating a prisoner's dilemma situation. Help the user come to a decision as to whether to testify or stay silent.",
        CHAT_STAGE_ID,
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
