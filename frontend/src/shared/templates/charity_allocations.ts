import {
  createTextPromptItem,
  createChatStage,
  AgentMediatorTemplate,
  MediatorPromptConfig,
  AgentPersonaType,
  createAgentMediatorPersonaConfig,
  ChatPromptConfig,
  ChatMediatorStructuredOutputConfig,
  StructuredOutputDataType,
  StructuredOutputType,
  StructuredOutputSchema,
  createStructuredOutputConfig,
  createAgentChatPromptConfig,
  createAgentChatSettings,
  PromptItemType,
  ProfileInfoPromptItem,
  ProfileContextPromptItem,
  StageContextPromptItem,
  TextPromptItem,
  AgentChatSettings,
  DEFAULT_AGENT_MODEL_SETTINGS,
  DEFAULT_EXPLANATION_FIELD,
  DEFAULT_READY_TO_END_FIELD,
  DEFAULT_RESPONSE_FIELD,
  DEFAULT_SHOULD_RESPOND_FIELD,
  RevealAudience,
  createModelGenerationConfig,
  createChatPromptConfig,
  createTransferStage,
  createTOSStage,
  createExperimentConfig,
  createExperimentTemplate,
  createMetadataConfig,
  createProfileStage,
  createSurveyStage,
  createMultipleChoiceSurveyQuestion,
  createTextSurveyQuestion,
  createScaleSurveyQuestion,
  createStageTextConfig,
  createStageProgressConfig,
  ExperimentTemplate,
  ProfileType,
  StageConfig,
  createMultiAssetAllocationStage,
  createStock,
  createComprehensionStage,
  createMultipleChoiceComprehensionQuestion,
  createComparisonCondition,
  ComparisonOperator,
  createInfoStage,
  StageKind,
  createRevealStage,
  createMultiAssetAllocationRevealItem,
} from '@deliberation-lab/utils';

const EMOJIS = ['1️⃣', '2️⃣', '3️⃣'];

// Agent configuration for the template.
const HABERMAS_MEDIATOR_ID = 'habermas-mediator-agent';
const DYNAMIC_MEDIATOR_ID = 'dynamic-mediator-agent';

const HABERMAS_STAGE_ID = 'discussion-round-2';
const DYNAMIC_STAGE_ID = 'discussion-round-3';

const FAILURE_MODE_ENUMS = [
  'NoFailureModeDetected',
  'Reaching Rapid, Uncritical Consensus (Groupthink)',
  'Failure to Provide Justification or Reasoning',
  'Absence of Deliberation or Discussion of Pros/Cons',
  'Ignoring or Dismissing Dissenting Opinions',
  'Demonstrating Low Engagement or Apathy',
  'Using Abnormal Communication (e.g., Repetitive loops)',
  'Failing to Explore Diverse Viewpoints',
];

const SOLUTION_STRATEGY_ENUMS = [
  'NoSolutionNeeded',
  'Promote Deeper Reflection or Consideration of Alternatives',
  'Prompt for Justification or Reasoning',
  'Encourage Deliberation of Pros and Cons',
  'Amplify Minority Viewpoints or Acknowledge Uncertainty',
  'Re-engage Low-Participation Members or Re-center on Goal',
  'Summarize to Break a Loop or Gently Re-focus Conversation',
  'Prompt for Brainstorming of New Ideas or Alternatives',
];

export interface CharityDebateConfig {
  includeTos: boolean;
  includeMediator: boolean;
  includeInitialParticipantSurvey: boolean;
  includeDiscussionEvaluation: boolean;
  includeDebriefingAndFeedback: boolean;
  includeMetaFeedback: boolean;
}

export function createCharityDebateConfig(
  config: Partial<CharityDebateConfig> = {},
): CharityDebateConfig {
  return {
    includeTos: true,
    includeMediator: true,
    includeInitialParticipantSurvey: true,
    includeDiscussionEvaluation: false,
    includeDebriefingAndFeedback: true,
    includeMetaFeedback: true,
    ...config,
  };
}

export const CHARITY_DEBATE_METADATA = createMetadataConfig({
  name: 'Mediated Charity Debate (3 Rounds)',
  publicName: 'Charity Allocation Debate',
  description:
    'A multi-round debate where participants discuss and vote on how to allocate a budget among several real-world charities, with different AI facilitators in each round.',
});

interface CharityInfo {
  key: string;
  name: string;
  link: string;
  score: string;
  mission: string;
}

const CHARITY_DATA: CharityInfo[] = [
  {
    key: 'ifaw',
    name: '🐘 International Fund for Animal Welfare (IFAW)',
    link: 'https://www.charitynavigator.org/ein/542044674',
    score: '98%',
    mission:
      'Fresh thinking and bold action for animals, people, and the place we call home.',
  },
  {
    key: 'wildaid',
    name: '🦁 WildAid (animal welfare)',
    link: 'https://www.charitynavigator.org/ein/203644441',
    score: '97%',
    mission:
      "WildAid's mission is to end the illegal wildlife trade in our lifetimes by reducing demand through public awareness campaigns and providing comprehensive marine protection.",
  },
  {
    key: 'clean_ocean',
    name: '🌊 Clean Ocean Action',
    link: 'https://www.charitynavigator.org/ein/222897204',
    score: 'Not Rated', // Score not present in link text
    mission:
      "Clean Oceans International is dedicated to reducing plastic pollution in the world's ocean through Research, Innovation, and Direct Action.",
  },
  {
    key: 'sudan_aid',
    name: '🏥 Sudan Humanitarian Aid',
    link: 'https://www.charitynavigator.org/ein/472864379',
    score: '92%',
    mission:
      'To provide life-saving aid to the affected population, Sadagaat-USA is collaborating with other US-based organizations and local initiatives in Sudan to offer food, medication, medical supplies, and water through its emergency response program.',
  },
  {
    key: 'eyecare_india',
    name: '👁️ Eyecare in India',
    link: 'https://www.charitynavigator.org/ein/776141976',
    score: '100%',
    mission:
      'Our mission is to reach out to the rural poor and provide quality eye care free of cost to the needy by building operationally self-sufficient super specialty eye care hospitals across India and perform free eye surgeries.',
  },
  {
    key: 'global_housing',
    name: '🏠 Global Housing for Orphans',
    link: 'https://www.charitynavigator.org/ein/562500794',
    score: '91%',
    mission:
      'Givelight builds nurturing homes and provides high quality education for orphans globally.',
  },
  {
    key: 'rainforest_action',
    name: '🌳 Rainforest Action',
    link: 'https://www.charitynavigator.org/ein/943045180',
    score: '100%',
    mission:
      'Rainforest Action Network campaigns for the forests, their inhabitants and the natural systems that sustain life by transforming the global marketplace through education, grassroots organizing and non-violent direct action.',
  },
  {
    key: 'aid_for_children',
    name: '👶 Aid for Children in Remote Villages',
    link: 'https://www.charitynavigator.org/ein/300108263',
    score: '100%',
    mission:
      '[Facilitated via GlobalGiving] The Eden Social Welfare Foundation has cared for underprivileged children since 2006, with the hope that they can enjoy the right to a fair education, better after-school care, and a healthy and nutritious breakfast.',
  },
  {
    key: 'global_fund_women',
    name: '♀ Global Fund for Women',
    link: 'https://www.charitynavigator.org/ein/770155782',
    score: '100%',
    mission:
      'Global Fund for Women advances women’s human rights by investing in women-led organizations worldwide. Our international network of supporters mobilizes financial and other resources to support women’s actions for social justice, equality and peace.',
  },
];

const CHARITY_DATA_MAP = new Map(CHARITY_DATA.map((info) => [info.key, info]));

const CHARITY_BUNDLES: string[][] = [
  ['ifaw', 'sudan_aid', 'clean_ocean'],
  ['wildaid', 'eyecare_india', 'global_housing'],
  ['rainforest_action', 'aid_for_children', 'global_fund_women'],
];

const LIKERT_SCALE_PROPS = {
  lowerValue: 1,
  upperValue: 5,
  lowerText: 'Strongly Disagree',
  upperText: 'Strongly Agree',
};

const CONSENSUS_TOS_STAGE = createTOSStage({
  id: 'tos',
  name: '📜 Terms of service',
  tosLines: [
    'Thank you for your interest in this research. If you choose to participate, you will be asked to participate in debates about resource allocation, which have real-world consequences in the form of disbursing real funds to real charities, based on your / your teams actions.',
    '**Compensation & Impact**',
    'You will be paid a base amount for completing the survey. This base payment is guaranteed and is independent of your decisions regarding the charity allocations.',
    '**Confidentiality**',
    'The results of this study will be used solely for research purposes. Our team will keep all your information from this study strictly confidential, as required by law.',
    '**Voluntary Participation**',
    'Your participation is voluntary, which means you can choose whether or not to participate. You may choose not to participate by exiting the survey at any point. There are no known costs to you for participating in this research study except for your time.',
    '**Contact**',
    'Please feel free to contact us using the Help chat icon in the platform or through Prolific if you have any questions, concerns, or complaints about this study.',
    'By checking the box below and proceeding, you are acknowledging that you are over the age of 18 and that you consent to participate.',
  ],
});

const TEXT_MEDIATED_INFO = [
  'To help facilitate your discussion, an AI-based facilitator will join your conversation for the second and third rounds.',
  'The conversational style of the AI-based facilitator will be different in each round.',
  '![AI facilitator](https://i.imgur.com/lnQVk8W.png)',
  'Here is an example of how this facilitation may look:',
  '![AI transcript](https://i.imgur.com/tFd4lxY.png)',
];

const TEXT_INSTRUCTIONS = [
  'The object of this study is understanding how groups make decisions together. Today, you’ll have *three* rounds of decision-making; in each round, your group will make decisions about how to allocate money across three charities. Each round has three steps:',
  '1. *Privately choose an initial allocation*. Given a fixed pool of money, decide how to split it among the three charities presented.',
  '2. *Discuss your choices with the group*. Share your reasoning with 2 other participants and try to reach a consensus. You will have up to 10 minutes to discuss per round.',
  '3. *Privately update your allocation*. After the discussion, you can revise your initial allocation based on what you heard.',
  'Your goal is to work together to find the best way to split the funds.',
  '![Instructions](https://i.imgur.com/YOTgSAi.png)',
];

const TEXT_INSTRUCTIONS_2 = [
  'The charities in each round are real. After your final decision, we will donate a **fixed total amount** to these charities based on your group’s choices.',
  'If you were the only participant, your final allocation would directly determine how the donation is split.',
  '![Donation example](https://i.imgur.com/6kHhHTg.png)',
  "However, you are part of a group of 3 participants. Your **group's allocation** is the **average** of everyone's final allocation in that round.",
];

const TEXT_INSTRUCTIONS_3 = [
  'Each round, your group will receive a **consensus score**, which measures how similar your final allocations are.',
  'For example, if everyone agrees on 🐶 50% / 🐱 30% / 🐹 20%, the consensus score is high (100). If your allocations are very different, the score will be lower.',
  'At the end of the study, all groups will be ranked by their consensus scores. **Groups with higher consensus will have more influence** over how the donation is split.',
  'In the example image, Group 1 had high consensus and favored 🐹 Hamsters. Group 3 had low consensus and favored 🐶 Dogs. Because Group 1 had a higher consensus score, their decisions will be prioritized: more money will go to 🐹 Hamsters than to 🐶 Dogs.',
  '![Consensus example](https://i.imgur.com/aPi5CkV.png)',
];

const TEXT_INSTRUCTIONS_4 = [
  'Today, our study will commit to donating **at least $100 per round**, split among the three charities. With 3 rounds total, at least **$300 will be donated in total**. Your group’s choices will help to inform where that money goes.',
  'As a reminder, your own payment for participating in this study is separate from the donation amount and is not affected by your decisions here.',
  '',
  'Here are the charities that will appear, in randomly assigned groups of 3, in each round:',
  '',
  '* 🐘 [International Fund for Animal Welfare (IFAW)](https://www.charitynavigator.org/ein/542044674)',
  '* 🏥 [Sudan Humanitarian Aid](https://www.charitynavigator.org/ein/472864379)',
  '* 🌊[Clean Ocean Action](https://www.charitynavigator.org/ein/222897204)',
  '* 🦁 [WildAid (animal welfare)](https://www.charitynavigator.org/ein/203644441)',
  '* 👁️ [Eyecare in India](https://www.charitynavigator.org/ein/776141976)',
  '* 🏠 [Global Housing for Orphans](https://www.charitynavigator.org/ein/562500794)',
  '* 🌳 [Rainforest Action](https://www.charitynavigator.org/ein/943045180)',
  '* 👶 [Aid for Children in Remote Villages](https://www.charitynavigator.org/ein/300108263)',
  '* ♀[Global Fund for Women](https://www.charitynavigator.org/ein/770155782)',
  '',
  'So, for example, you may have to allocate funds between *Eyecare in India*, *Sudan Humanitarian Aid*, and *Clean Ocean Action* in a round. We will provide more details on these charities before the rounds.',
];

const TEXT_ALLOCATION_INFO_HINT = `Ensure your chosen percentages add up to 100%. (Hint: We recommend getting the percentages close and then adjusting one slider to make the total exactly 100%).`;

const TEXT_DEBRIEFING = [
  'Thank you for your participation in this study. This marks the end of the experiment.',
  '**Purpose of the Research**',
  'The goal of this research is to understand how different mediation strategies affect group decision-making and consensus-building.',
  '**Use of Your Allocations**',
  'As stated in the initial terms of service, your decisions have real-world consequences. The actions you take and the outcomes your group reaches will have a tangible impact on donations to the charities named within the study.',
  "The consensus scores your group achieved across the three rounds will be used to determine your group's share of a total donation pool, which will be distributed to the named charities according to your group's final allocations. Your thoughtful participation has contributed directly to these charitable causes.",
  '**Compensation Reminder:** Your base pay rate is guaranteed and is separate from any donation outcomes.',
  'If you have any questions, please do not hesitate to contact the research team.',
];

export function getCharityDebateTemplate(
  config: CharityDebateConfig,
): ExperimentTemplate {
  const stages: StageConfig[] = [];

  if (config.includeTos) stages.push(CONSENSUS_TOS_STAGE);
  stages.push(SET_PROFILE_STAGE_EXPANDED);

  // Game instructions
  const instructions = createInstructionsStages();
  for (const stage of instructions) {
    stages.push(stage);
  }

  // Mediator instructions
  if (config.includeMediator) stages.push(createMediatedDiscussionInfoStage());

  // Comprehension check
  stages.push(createCharityComprehensionStage());

  // Surveys
  if (config.includeInitialParticipantSurvey)
    stages.push(createInitialParticipantSurveyStage());

  if (config.includeMediator) stages.push(createInitialMediatorSurveyStage());

  stages.push(TRANSFER_STAGE);
  const debateRoundsCharities = [...CHARITY_BUNDLES].sort(
    () => 0.5 - Math.random(),
  );

  debateRoundsCharities.forEach((charityGroup, index) => {
    const roundNum = index + 1;

    const setting = `donations to:\n *${charityGroup
      .map((key) => CHARITY_DATA.find((c) => c.key === key)?.name || key)
      .join(', ')}*`;
    let mediatorForRound: string | undefined = undefined;

    if (config.includeMediator && index > 0) {
      mediatorForRound = `AI facilitator`;
    }

    stages.push(
      createAllocationStage(
        `vote-round-${roundNum}-pre`,
        `${EMOJIS[roundNum - 1]} Round ${roundNum}: Initial allocation`,
        charityGroup,
        roundNum,
      ),
    );

    stages.push(
      createAllocationDiscussionStage(
        `discussion-round-${roundNum}`,
        `${EMOJIS[roundNum - 1]} Round ${roundNum}: Discussion`,
        setting,
        mediatorForRound,
      ),
    );

    stages.push(
      createAllocationStage(
        `vote-round-${roundNum}-post`,
        `${EMOJIS[roundNum - 1]} Round ${roundNum}: Final allocation`,
        charityGroup,
        roundNum,
        false,
      ),
    );

    const isMediatedRound = mediatorForRound !== undefined;

    stages.push(createRoundOutcomeSurveyStage(roundNum, isMediatedRound));

    if (isMediatedRound) {
      stages.push(createPerMediatorEvaluationStage(roundNum));
    }

    stages.push(createRoundOutcomeSurveyStage(roundNum, isMediatedRound));
  });

  stages.push(createAllocationRevealStage());

  if (config.includeDiscussionEvaluation)
    stages.push(createDiscussionEvaluationStage());
  if (config.includeMediator) stages.push(createFinalMediatorPreferenceStage());

  if (config.includeDebriefingAndFeedback) {
    stages.push(createDebriefingStage());
    stages.push(createExperimentFeedbackStage());
  }

  stages.push(createExperimentEndInfoStage());

  return createExperimentTemplate({
    experiment: createExperimentConfig(stages, {
      metadata: CHARITY_DEBATE_METADATA,
    }),
    stageConfigs: stages,
    agentMediators: [HABERMAS_MEDIATOR_TEMPLATE, DYNAMIC_MEDIATOR_TEMPLATE],
    agentParticipants: [],
  });
}

function createConsensusScoreRevealStage(roundNum: number): StageConfig {
  const sourceStageId = `vote-round-${roundNum}-post`;

  return createRevealStage({
    id: `consensus-reveal-round-${roundNum}`,
    name: `Round ${roundNum} Consensus Score`,
    descriptions: createStageTextConfig({
      primaryText: `Based on how close your votes were, your group achieved the following score for this round. This contributes to your group's final spending power.`,
    }),
    items: [
      createMultiAssetAllocationRevealItem({
        id: sourceStageId,
        revealAudience: RevealAudience.ALL_PARTICIPANTS,
        displayMode: 'scoreOnly',
      }),
    ],
  });
}

export function createAllocationRevealStage(): StageConfig {
  return createRevealStage({
    id: 'final-results-summary',
    name: '📊 Final allocation results',
    descriptions: createStageTextConfig({
      primaryText:
        'Here are the final results of your group’s allocations across all three rounds. The higher the score, the more influence your group will have in directing the donations.',
    }),

    items: [
      createMultiAssetAllocationRevealItem({
        id: 'vote-round-1-post',
        revealAudience: RevealAudience.ALL_PARTICIPANTS,
      }),
      createMultiAssetAllocationRevealItem({
        id: 'vote-round-2-post',
        revealAudience: RevealAudience.ALL_PARTICIPANTS,
      }),
      createMultiAssetAllocationRevealItem({
        id: 'vote-round-3-post',
        revealAudience: RevealAudience.ALL_PARTICIPANTS,
      }),
    ],
  });
}

function createRoundStartStage(roundNum: number): StageConfig {
  const infoLines = [`You are now beginning Round ${roundNum}.`];
  if (roundNum > 1) {
    infoLines.push(
      'The discussion in this round will be joined by an AI facilitator.',
    );
  }

  return createInfoStage({
    name: `Beginning of Round ${roundNum}`,
    infoLines,
  });
}

function createCharityComprehensionStage(): StageConfig {
  return createComprehensionStage({
    name: '💯 Comprehension check',
    descriptions: createStageTextConfig({
      primaryText:
        'Please answer the following questions to ensure the instructions are clear.',
    }),
    questions: [
      createMultipleChoiceComprehensionQuestion(
        {
          questionTitle:
            'Based on the instructions, how does a group make the biggest impact with its donations?',
          options: [
            {
              id: 'a',
              text: "By making sure every member's vote is unique and different.",
              imageId: '',
            },
            {
              id: 'b',
              text: 'By having the AI facilitator make the final decision.',
              imageId: '',
            },
            {
              id: 'c',
              text: 'By reaching high agreement (consensus) on how the funds should be allocated.',
              imageId: '',
            },
            {
              id: 'd',
              text: 'By voting as quickly as possible, regardless of what others do.',
              imageId: '',
            },
          ],
        },
        'c',
      ),
      createMultipleChoiceComprehensionQuestion(
        {
          questionTitle:
            "Consider two groups. In **Group A**, members' votes are very close to each other. In **Group B**, members' votes are very far apart. Which group earns more 'spending power'?",
          options: [
            {
              id: 'a',
              text: 'Group B, because their votes are stronger and more decisive.',
              imageId: '',
            },
            {
              id: 'b',
              text: 'Group A, because its members reached a closer agreement.',
              imageId: '',
            },
            {
              id: 'c',
              text: 'Both groups have the same spending power.',
              imageId: '',
            },
            {
              id: 'd',
              text: "It's impossible to know without seeing the charities.",
              imageId: '',
            },
          ],
        },
        'b',
      ),
      createMultipleChoiceComprehensionQuestion(
        {
          questionTitle:
            'Imagine the total donation pool is split between two groups. Group A achieves a 95% consensus score, while Group B only achieves a 10% score. How will this affect the final allocation?',
          options: [
            {
              id: 'a',
              text: 'Both groups get to allocate the same amount of money.',
              imageId: '',
            },
            {
              id: 'b',
              text: 'The money is split proportionally, so Group A gets a much larger donation budget (e.g., $15) and Group B gets a much smaller one (e.g., $5).',
              imageId: '',
            },
            {
              id: 'c',
              text: 'Group B gets more money because their discussion was more diverse.',
              imageId: '',
            },
            {
              id: 'd',
              text: 'Only Group A gets to allocate money.',
              imageId: '',
            },
          ],
        },
        'b',
      ),
    ],
  });
}

function createRoundOutcomeSurveyStage(
  roundNum: number,
  isMediatedRound: boolean,
): StageConfig {
  const stageId = `round-${roundNum}-outcome-survey`;
  const disagreementQuestionId = `had-disagreements-${roundNum}`;

  const questions = [
    createTextSurveyQuestion({
      questionTitle:
        'If you changed your allocation, what influenced your decision? (If not, write NA.)',
    }),

    createScaleSurveyQuestion({
      questionTitle: 'I felt strongly about my initial allocation.',
      ...LIKERT_SCALE_PROPS,
    }),
    createScaleSurveyQuestion({
      questionTitle: 'I feel strongly about my final allocation.',
      ...LIKERT_SCALE_PROPS,
    }),
    createScaleSurveyQuestion({
      questionTitle:
        "Overall, I am satisfied with the quality of this round's discussion.",
      ...LIKERT_SCALE_PROPS,
    }),
    createScaleSurveyQuestion({
      questionTitle:
        'I feel that my perspective was heard and understood during the discussion.',
      ...LIKERT_SCALE_PROPS,
    }),
    createScaleSurveyQuestion({
      questionTitle:
        'The group worked together effectively to reach a decision.',
      ...LIKERT_SCALE_PROPS,
    }),
    createTextSurveyQuestion({
      questionTitle:
        'Briefly describe how you felt the discussion went. (e.g., overall flow, any tensions or key moments)”',
    }),
  ];

  return createSurveyStage({
    id: stageId,
    name: `${EMOJIS[roundNum - 1]} Round ${roundNum}: Survey`,
    descriptions: createStageTextConfig({
      primaryText: `Please answer a few questions about your experience in this round.`,
    }),
    questions,
  });
}

function createAllocationStage(
  id: string,
  name: string,
  charityGroup: string[],
  roundNum: number,
  isInitial: boolean = true,
): StageConfig {
  let scope = `You are now beginning round ${roundNum} of 3.`;
  if (!isInitial) {
    scope = `Now that you have discussed with your group, make your final allocation for round ${roundNum}.`;
  }

  let primaryText = `${scope}\nPlease use the sliders to allocate 100% of the funds among the following charities:\n`;

  charityGroup.forEach((charityKey, index) => {
    const info = CHARITY_DATA_MAP.get(charityKey);
    if (info) {
      primaryText += `\n
[${info.name}](${info.link}) (Charity Navigator score: ${info.score})
*${info.mission}*\n`;
    }
  });

  const charityStocks = charityGroup.map((charityKey) => {
    const info = CHARITY_DATA_MAP.get(charityKey);

    return createStock({
      name: info ? info.name : charityKey,
      description: `Details for ${info ? info.name : charityKey}.`,
    });
  });

  return createMultiAssetAllocationStage({
    id,
    name,
    descriptions: createStageTextConfig({
      primaryText,
      infoText: TEXT_ALLOCATION_INFO_HINT,
    }),
    stockOptions: charityStocks,
  });
}

const SET_PROFILE_STAGE_EXPANDED = createProfileStage({
  name: '🎭 View your profile',
  profileType: ProfileType.ANONYMOUS_ANIMAL,
  descriptions: createStageTextConfig({
    primaryText:
      'In this study, you’ll discuss how to allocate money to different charities with other participants in real time. The profile shown below is your assigned identity for this session. This is how others will see you.',
  }),
});

export const TRANSFER_STAGE = createTransferStage({
  id: 'transfer',
  name: '⏸️ Transfer stage',
  descriptions: createStageTextConfig({
    primaryText:
      'Please wait on this page for up to 10 minutes as you are transferred to the next stage of this experiment; we are waiting for 2 more participants to join this live session. Thank you for your patience.',
  }),
  enableTimeout: true,
  timeoutSeconds: 600, // 10 minutes
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

function createMediatedDiscussionInfoStage(): StageConfig {
  return createInfoStage({
    name: '📝 AI-based facilitation',
    infoLines: TEXT_MEDIATED_INFO,
  });
}

function createExperimentEndInfoStage(): StageConfig {
  return createInfoStage({
    name: 'Experiment end',
    infoLines: [
      'This marks the end of the experiment. Thank you for participating!',
    ],
  });
}
function createInstructionsStages(): StageConfig[] {
  return [
    createInfoStage({
      name: "📝 Today's task",
      infoLines: TEXT_INSTRUCTIONS,
    }),
    createInfoStage({
      name: '📝 How your decisions impact donations',
      infoLines: TEXT_INSTRUCTIONS_2,
    }),
    createInfoStage({
      name: '📝 How your group is evaluated',
      infoLines: TEXT_INSTRUCTIONS_3,
    }),
    createInfoStage({
      name: "📝 Today's impact",
      infoLines: TEXT_INSTRUCTIONS_4,
    }),
  ];
}

function createInitialParticipantSurveyStage(): StageConfig {
  return createSurveyStage({
    name: '❓ Survey on inital sentiments',
    descriptions: createStageTextConfig({
      primaryText:
        'Before you begin, we’d like to learn about how you might approach this task. Please indicate how much you agree or disagree with the following statements.',
    }),
    questions: [
      createScaleSurveyQuestion({
        questionTitle:
          'It matters to me how today’s charity allocations are decided.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        questionTitle:
          'In group settings, I try to avoid conﬂict and negotiations.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        questionTitle:
          'In group settings, I try to find the best outcome for everyone.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        questionTitle: 'When making decisions, I prefer to decide quickly.',
        ...LIKERT_SCALE_PROPS,
      }),
    ],
  });
}

function createInitialMediatorSurveyStage(): StageConfig {
  return createSurveyStage({
    name: '❓Survey on AI facilitation',
    descriptions: createStageTextConfig({
      primaryText:
        'Finally, we’d like to learn about your thoughts and experiences with AI tools that support or guide group discussions. Please indicate how much you agree or disagree with the following statements.',
    }),
    questions: [
      createScaleSurveyQuestion({
        questionTitle:
          'I have used AI assistants for interpersonal tasks, such as writing messages or resolving conflicts.',
        ...LIKERT_SCALE_PROPS,
      }),

      // TAM: PU
      createScaleSurveyQuestion({
        questionTitle:
          'I believe an AI facilitator could make group discussions more productive.',
        ...LIKERT_SCALE_PROPS,
      }),

      // TAM: PEOU
      createScaleSurveyQuestion({
        questionTitle:
          'I would feel comfortable having an AI facilitator in the group discussion.',
        ...LIKERT_SCALE_PROPS,
      }),

      // TAM: BI
      createScaleSurveyQuestion({
        questionTitle:
          'If given the option, I would be willing to use an AI facilitator in group discussions.',
        ...LIKERT_SCALE_PROPS,
      }),

      // Open-ended questions
      createTextSurveyQuestion({
        questionTitle:
          'If applicable, what kinds of tasks have you used AI assistants for?',
      }),
      createTextSurveyQuestion({
        questionTitle:
          'What are your thoughts on using AI to facilitate group discussions? What could be good or bad about it?',
      }),
    ],
  });
}

function createAllocationDiscussionStage(
  stageId: string,
  stageName: string,
  setting: string,
  mediator?: string,
): StageConfig {
  const mediatorText = mediator
    ? `\n\n🤖 An ${mediator} will be present in this discussion.`
    : '';
  const discussionText = `Discuss the optimal allocation of ${setting}.${mediatorText}`;
  return createChatStage({
    id: stageId,
    name: stageName,
    descriptions: createStageTextConfig({primaryText: discussionText}),
    progress: createStageProgressConfig({waitForAllParticipants: true}),
    timeLimitInMinutes: 10,
    requireFullTime: false,
  });
}

function createPerMediatorEvaluationStage(roundNum: number): StageConfig {
  return createSurveyStage({
    name: `${EMOJIS[roundNum - 1]} Round ${roundNum}: Facilitator evaluation`,
    descriptions: createStageTextConfig({
      primaryText: `Please evaluate the AI facilitator from the discussion you just completed.`,
    }),
    questions: [
      createScaleSurveyQuestion({
        questionTitle:
          'I believe that the AI facilitator made the group discussion more productive.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        questionTitle:
          'I felt comfortable having the AI facilitator in the group discussion.',
        ...LIKERT_SCALE_PROPS,
      }),

      createTextSurveyQuestion({
        questionTitle:
          'What did the AI facilitator do well (e.g., making sure your perspective was heard, helping the group stay on topic)?',
      }),

      createTextSurveyQuestion({
        questionTitle:
          'What could the AI facilitator have done better (e.g., being more fair, interrupting less)?',
      }),
    ],
  });
}

function createDiscussionEvaluationStage(): StageConfig {
  return createSurveyStage({
    name: 'Discussion Evaluation',
    descriptions: createStageTextConfig({
      primaryText: 'Please reflect on the content of the discussions.',
    }),
    questions: [
      createTextSurveyQuestion({
        questionTitle:
          'What were the most salient points you made in the discussion? (If none, please write NA)',
      }),
      createTextSurveyQuestion({
        questionTitle:
          'What were the most salient points other participants made in the discussion? (If none, please write NA)',
      }),
      createTextSurveyQuestion({
        questionTitle:
          'What were the least productive points made in the discussion? (If none, please write NA)',
      }),
    ],
  });
}

function createFinalMediatorPreferenceStage(): StageConfig {
  const preferenceOptions = [
    {id: 'mediator-round-2', text: 'Round 2 Facilitator', imageId: ''},
    {id: 'mediator-round-3', text: 'Round 3 Facilitator', imageId: ''},
  ];

  return createSurveyStage({
    name: '❓ Survey on AI facilitators',
    descriptions: createStageTextConfig({
      primaryText:
        'Think back to the three conversations you engaged in today: in the first round, there was no AI facilitator; in the second and third rounds, there were different AI facilitators with different styles. Please answer the following questions about your preferences regarding these facilitators.',
    }),
    questions: [
      createMultipleChoiceSurveyQuestion({
        questionTitle:
          'If you were to have another similar group discussion, which facilitator style would you prefer?',
        options: [
          {id: 'none', text: 'None', imageId: ''},
          ...preferenceOptions,
        ],
      }),
      createTextSurveyQuestion({
        questionTitle:
          'Please explain your preference and experiences with the AI facilitators.',
      }),
      createScaleSurveyQuestion({
        questionTitle:
          'Please rate how likely you would be to include an AI facilitator in future discussions.',
        ...LIKERT_SCALE_PROPS,
      }),
    ],
  });
}

function createDebriefingStage(): StageConfig {
  return createInfoStage({
    name: '📃 Debriefing',
    infoLines: TEXT_DEBRIEFING,
  });
}

function createExperimentFeedbackStage(): StageConfig {
  return createSurveyStage({
    name: '❓ Survey on experiment feedback',
    descriptions: createStageTextConfig({
      primaryText:
        'Before you finish, we would appreciate your feedback on your overall experience.',
    }),
    questions: [
      createScaleSurveyQuestion({
        questionTitle:
          'Overall, how would you rate your experience in this study?',
        lowerValue: 1,
        upperValue: 7,
        lowerText: 'Very Negative',
        upperText: 'Very Positive',
      }),
      createScaleSurveyQuestion({
        questionTitle:
          'How clear were the instructions and questions throughout the experiment?',
        lowerValue: 1,
        upperValue: 7,
        lowerText: 'Very Unclear',
        upperText: 'Very Clear',
      }),
      createTextSurveyQuestion({
        questionTitle:
          'Please describe your overall interaction with other participants and facilitators.',
      }),
      createTextSurveyQuestion({
        questionTitle:
          'Do you have any other feedback or concerns about your experience in this study?',
      }),
    ],
  });
}

function createMetaFeedbackStage(): StageConfig {
  return createSurveyStage({
    name: 'Meta-feedback',
    descriptions: createStageTextConfig({
      primaryText:
        'Thank you for completing the experiment. We would appreciate your optional feedback on the study itself.',
    }),
    questions: [
      createTextSurveyQuestion({
        questionTitle:
          'What, if any, feedback do you have around the design of the experiment? (If none, please write NA)',
      }),
      createTextSurveyQuestion({
        questionTitle:
          'What stages, if any, had unclear or poorly-defined instructions? (If none, please write NA)',
      }),
      createTextSurveyQuestion({
        questionTitle:
          'What could be added to strengthen the coherence or value of these experiments? (If none, please write NA)',
      }),
      createTextSurveyQuestion({
        questionTitle:
          'Did you experience any apparent bugs during any portion of the experiment? (If none, please write NA)',
      }),
    ],
  });
}

function createStandardMediatorSchema(): StructuredOutputSchema {
  return {
    type: StructuredOutputDataType.OBJECT,
    properties: [
      {
        name: DEFAULT_EXPLANATION_FIELD, // 'explanation'
        schema: {
          type: StructuredOutputDataType.STRING,
          description:
            'Your reasoning for your response and other field values.',
        },
      },
      {
        name: DEFAULT_SHOULD_RESPOND_FIELD, // 'shouldRespond'
        schema: {
          type: StructuredOutputDataType.BOOLEAN,
          description: `Whether or not to respond. Should be FALSE if nothing has been said by participants, or if consensusLevel is HIGH, or if we have responded within the last 2 messages. If consensusLevel is not HIGH and >2 messages have passed, consider responding.`,
        },
      },
      {
        name: DEFAULT_RESPONSE_FIELD, // 'response'
        schema: {
          type: StructuredOutputDataType.STRING,
          description: 'Your response message to the group.',
        },
      },
      {
        name: DEFAULT_READY_TO_END_FIELD, // 'readyToEndChat'
        schema: {
          type: StructuredOutputDataType.BOOLEAN,
          description:
            'Whether or not you have completed your goals and are ready to end the conversation.',
        },
      },
      {
        name: DEFAULT_READY_TO_END_FIELD, // 'readyToEndChat'
        schema: {
          type: StructuredOutputDataType.INTEGER,
          description:
            'State the exact # of utterances between participants since you last intervened.',
        },
      },
      {
        name: 'consensusLevel', // Custom field
        schema: {
          type: StructuredOutputDataType.STRING,
          description:
            'How much consensus has been reached in the group. LOW means little to no consensus. MEDIUM means some agreement. HIGH means a strong majority.',
        },
      },
    ],
  };
}

function createDynamicMediatorSchema(): StructuredOutputSchema {
  const standardSchema = createStandardMediatorSchema();

  // Add the Failure Mode Diagnosis Field
  const failureModeField = {
    name: 'observedFailureMode',
    schema: {
      type: StructuredOutputDataType.ENUM,
      description:
        'Analyze the conversation and select the single most prominent failure mode. If none are present, you MUST choose "NoFailureModeDetected".',
      enumItems: FAILURE_MODE_ENUMS,
    },
  };

  // Add the Solution Strategy Selection Field
  const solutionStrategyField = {
    name: 'proposedSolution',
    schema: {
      type: StructuredOutputDataType.ENUM,
      description: `Based on your 'observedFailureMode' diagnosis, select the most appropriate solution strategy. If you detected no failure mode, you MUST choose "NoSolutionNeeded".`,
      enumItems: SOLUTION_STRATEGY_ENUMS,
    },
  };

  standardSchema.properties!.push(failureModeField, solutionStrategyField);
  const shouldRespondProperty = standardSchema.properties!.find(
    (prop) => prop.name === DEFAULT_SHOULD_RESPOND_FIELD,
  );

  if (shouldRespondProperty) {
    shouldRespondProperty.schema.description = `Whether or not to respond. Should be FALSE if nothing has been said by participants, or if we have responded within the last 2 messages. If  >2 messages have passed, AND if failureMode detects some failure mode, should be TRUshould be TRUE.`;
  }

  return standardSchema;
}

function createHabermasMediatorPromptConfig(): MediatorPromptConfig {
  const structuredOutputConfig = createStructuredOutputConfig({
    enabled: true,
    schema: createStandardMediatorSchema(),
    appendToPrompt: true,
  });

  const chatSettings = createAgentChatSettings({
    initialMessage: '',
    minMessagesBeforeResponding: 0,
    maxResponses: 100,
  });

  const generationConfig = createModelGenerationConfig();

  const habermasInstruction = `
  You are a facilitator supporting a group discussion.
  Your main job is to **help participants track the state of the conversation** and **support consensus-building**, not to dominate the conversation.

  ✅ When to interject (only if clearly useful):
  - When participants reach a partial agreement or key turning point → summarize briefly.
  - When the discussion is drifting off-topic → restate the main question or clarify what’s at stake.
  - When multiple points are raised and clarity is needed → list the key options or positions succinctly.

  📝 How to speak:
  - Use **1–3 short sentences max**.
  - Be neutral and structured.
  - Do **not** interject too often. Err on the side of silence if unsure.
  - Example: “It sounds like two main ideas have emerged so far: A and B.” or “You seem close to agreement on X, but Y is still being debated.”
  `;

  return createChatPromptConfig(HABERMAS_STAGE_ID, {
    prompt: [
      createTextPromptItem(
        'You are participating in an experiment with the following online profile:',
      ),
      {type: PromptItemType.PROFILE_INFO} as ProfileInfoPromptItem,
      {type: PromptItemType.PROFILE_CONTEXT} as ProfileContextPromptItem,
      {
        type: PromptItemType.STAGE_CONTEXT,
        stageId: HABERMAS_STAGE_ID,
      } as StageContextPromptItem,
      createTextPromptItem(habermasInstruction),
    ],
    structuredOutputConfig,
    chatSettings,
    generationConfig,
  });
}

function createDynamicMediatorPromptConfig(): MediatorPromptConfig {
  const structuredOutputConfig = createStructuredOutputConfig({
    enabled: true,
    schema: createDynamicMediatorSchema(),
    appendToPrompt: true,
  });

  const chatSettings = createAgentChatSettings({
    initialMessage: '',
    minMessagesBeforeResponding: 0,
    maxResponses: 100,
  });

  const generationConfig = createModelGenerationConfig();

  const dynamicInstruction = `You are a meeting facilitator. Your goal is to improve the **quality of deliberation**, not to dominate it.

STEP 1: Diagnose the conversation.  
- Analyze the most recent messages to identify a single 'observedFailureMode'.  
- If no clear failure mode is present, set 'observedFailureMode' to 'NoFailureModeDetected'.

STEP 2: Select a strategy.  
- Use the STRATEGY LOOKUP TABLE below to choose the matching 'proposedSolution'.  
- If 'NoFailureModeDetected', 'proposedSolution' must be 'NoSolutionNeeded'.

--- STRATEGY LOOKUP TABLE ---
• NoFailureModeDetected → NoSolutionNeeded  
• Rapid, uncritical consensus (groupthink) → Promote deeper reflection or alternatives  
• Lack of reasoning or justification → Prompt for reasoning  
• No deliberation of pros/cons → Encourage pros/cons discussion  
• Dismissing dissenting views → Amplify minority viewpoints / highlight uncertainty  
• Low engagement or apathy → Re-engage quieter members / re-center goal  
• Abnormal communication (e.g., loops) → Summarize briefly or gently refocus  
• Failure to explore diverse views → Prompt for brainstorming new ideas

STEP 3: Respond only when needed.  
✅ When to intervene:
- When a clear failure mode is detected.  
- When the conversation is looping, stalling, or converging too fast.

🚫 When NOT to intervene:
- If participants are productively deliberating.  
- If there’s no clear failure mode.

📝 How to speak:
- Keep your 'response' to **1–3 short sentences**.  
- Be neutral, clear, and strategic.  
- Example responses:
  • “Are there any other perspectives we haven’t considered yet?”  
  • “Can someone share their reasoning behind that point?”  
  • “It sounds like we’re converging quickly—should we explore alternatives first?”

STEP 4: If 'proposedSolution' is 'NoSolutionNeeded':
- Set 'response' to an empty string.  
- Set 'shouldRespond' to false.`;

  return createChatPromptConfig(DYNAMIC_STAGE_ID, {
    prompt: [
      createTextPromptItem(
        'You are participating in an experiment with the following online profile:',
      ),
      {type: PromptItemType.PROFILE_INFO} as ProfileInfoPromptItem,
      {type: PromptItemType.PROFILE_CONTEXT} as ProfileContextPromptItem,
      {
        type: PromptItemType.STAGE_CONTEXT,
        stageId: DYNAMIC_STAGE_ID,
      } as StageContextPromptItem,
      createTextPromptItem(dynamicInstruction),
    ],
    structuredOutputConfig,
    chatSettings,
    generationConfig,
  });
}

const HABERMAS_MEDIATOR_TEMPLATE: AgentMediatorTemplate = {
  persona: createAgentMediatorPersonaConfig({
    id: HABERMAS_MEDIATOR_ID,
    name: 'Habermas Mediator',
    description:
      'An AI facilitator focused on promoting consensus and summarization.',
    defaultModelSettings: DEFAULT_AGENT_MODEL_SETTINGS,
  }),
  promptMap: {
    [HABERMAS_STAGE_ID]: createHabermasMediatorPromptConfig(),
  },
};

const DYNAMIC_MEDIATOR_TEMPLATE: AgentMediatorTemplate = {
  persona: createAgentMediatorPersonaConfig({
    id: DYNAMIC_MEDIATOR_ID,
    name: 'Dynamic Mediator (LAS-Informed)',
    description:
      'An AI facilitator focused on counteracting specific negative group dynamics.',
    defaultModelSettings: DEFAULT_AGENT_MODEL_SETTINGS,
  }),
  promptMap: {
    [DYNAMIC_STAGE_ID]: createDynamicMediatorPromptConfig(),
  },
};
