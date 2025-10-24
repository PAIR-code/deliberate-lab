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
    name: 'IFAW (animal welfare)',
    link: 'https://www.charitynavigator.org/ein/542044674',
    score: '98%',
    mission:
      'Fresh thinking and bold action for animals, people, and the place we call home.',
  },
  {
    key: 'wildaid',
    name: 'Wildaid (animal welfare)',
    link: 'https://www.charitynavigator.org/ein/203644441',
    score: '97%',
    mission:
      "WildAid's mission is to end the illegal wildlife trade in our lifetimes by reducing demand through public awareness campaigns and providing comprehensive marine protection.",
  },
  {
    key: 'clean_ocean',
    name: 'Clean Ocean Action',
    link: 'https://www.charitynavigator.org/ein/222897204',
    score: 'Not Rated', // Score not present in link text
    mission:
      "Clean Oceans International is dedicated to reducing plastic pollution in the world's ocean through Research, Innovation, and Direct Action.",
  },
  {
    key: 'sudan_aid',
    name: 'Sudan Humanitarian Aid',
    link: 'https://www.charitynavigator.org/ein/472864379',
    score: '92%',
    mission:
      'To provide life-saving aid to the affected population, Sadagaat-USA is collaborating with other US-based organizations and local initiatives in Sudan to offer food, medication, medical supplies, and water through its emergency response program.',
  },
  {
    key: 'eyecare_india',
    name: 'Eyecare in India',
    link: 'https://www.charitynavigator.org/ein/776141976',
    score: '100%',
    mission:
      'Our mission is to reach out to the rural poor and provide quality eye care free of cost to the needy by building operationally self-sufficient super specialty eye care hospitals across India and perform free eye surgeries.',
  },
  {
    key: 'global_housing',
    name: 'Global housing for orphans',
    link: 'https://www.charitynavigator.org/ein/562500794',
    score: '91%',
    mission:
      'Givelight builds nurturing homes and provides high quality education for orphans globally.',
  },
  {
    key: 'rainforest_action',
    name: 'Rainforest Action',
    link: 'https://www.charitynavigator.org/ein/943045180',
    score: '100%',
    mission:
      'Rainforest Action Network campaigns for the forests, their inhabitants and the natural systems that sustain life by transforming the global marketplace through education, grassroots organizing and non-violent direct action.',
  },
  {
    key: 'aid_for_children',
    name: 'Aid for children in remote villages',
    link: 'https://www.charitynavigator.org/ein/300108263',
    score: '100%',
    mission:
      '[Facilitated via GlobalGiving] The Eden Social Welfare Foundation has cared for underprivileged children since 2006, with the hope that they can enjoy the right to a fair education, better after-school care, and a healthy and nutritious breakfast.',
  },
  {
    key: 'global_fund_women',
    name: 'Global Fund for Women',
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
  upperValue: 7,
  lowerText: 'Strongly Disagree',
  upperText: 'Strongly Agree',
};

const CONSENSUS_TOS_STAGE = createTOSStage({
  id: 'tos',
  name: 'Terms of service',
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
  '2. *Discuss your choices with the group*. Share your reasoning with 2 other participants and try to reach a consensus.',
  '3. *Privately update your allocation*. After the discussion, you can revise your initial allocation based on what you heard.',
  'Your goal is to work together to find the best way to split the funds.',
  '![Instructions](https://i.imgur.com/YOTgSAi.png)',
];

const TEXT_INSTRUCTIONS_2 = [
  'The charities in each round are real. After your final decision, we will donate a **fixed total amount** to these charities based on your group’s choices.',
  'If you were the only participant, your final allocation would directly determine how the donation is split.',
  '![Donation example](https://i.imgur.com/6kHhHTg.png)',
  'However, you are part of a group of 3 participants. Your **group\'s allocation** is the **average** of everyone\'s final allocation in that round.',
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
  'Here are the charities for each round:',
  '',
  '**Round 1:**',
  '* 🐘 [International Fund for Animal Welfare (IFAW)](https://www.charitynavigator.org/ein/542044674)',
  '* 🏥 [Sudan Humanitarian Aid](https://www.charitynavigator.org/ein/472864379)',
  '* 🌊[Clean Ocean Action](https://www.charitynavigator.org/ein/222897204)',
  '',

  '**Round 2:**',
  '* 🦁 [WildAid (animal welfare)](https://www.charitynavigator.org/ein/203644441)',
  '* 👁️ [Eyecare in India](https://www.charitynavigator.org/ein/776141976)',
  '* 🏠 [Global Housing for Orphans](https://www.charitynavigator.org/ein/562500794)',
  '',
  '**Round 3:**',
  '* 🌳 [Rainforest Action](https://www.charitynavigator.org/ein/943045180)',
  '* 👶 [Aid for Children in Remote Villages](https://www.charitynavigator.org/ein/300108263)',
  '* ♀[Global Fund for Women](https://www.charitynavigator.org/ein/770155782)',
  '',
  'We will provide more details on these charities before the rounds.',
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

  // Comprehension check
  stages.push(createCharityComprehensionStage());

  // Mediator instructions
  if (config.includeMediator) stages.push(createMediatedDiscussionInfoStage());

  // Surveys
  if (config.includeInitialParticipantSurvey)
    stages.push(createInitialParticipantSurveyStage());

  if (config.includeMediator) stages.push(createInitialMediatorSurveyStage());

  const debateRoundsCharities = [...CHARITY_BUNDLES].sort(
    () => 0.5 - Math.random(),
  );

  debateRoundsCharities.forEach((charityGroup, index) => {
    const roundNum = index + 1;
    const setting = `donations to: *${charityGroup.join(', ')}*`;
    let mediatorForRound: string | undefined = undefined;

    if (config.includeMediator && index > 0) {
      mediatorForRound = `AI facilitator`;
    }

    stages.push(createRoundStartStage(roundNum));

    stages.push(
      createAllocationStage(
        `vote-round-${roundNum}-pre`,
        `Allocation (Pre-Discussion): Round ${roundNum}`,
        charityGroup,
      ),
    );

    stages.push(
      createAllocationDiscussionStage(
        `discussion-round-${roundNum}`,
        `Discussion: Round ${roundNum}`,
        setting,
        mediatorForRound,
      ),
    );

    stages.push(
      createAllocationStage(
        `vote-round-${roundNum}-post`,
        `Allocation (Post-Discussion): Round ${roundNum}`,
        charityGroup,
      ),
    );

    const isMediatedRound = mediatorForRound !== undefined;

    if (isMediatedRound) {
      stages.push(createPerMediatorEvaluationStage(roundNum));
    }

    stages.push(createRoundOutcomeSurveyStage(roundNum, isMediatedRound));
    //stages.push(createConsensusScoreRevealStage(roundNum));
  });

  stages.push(createAllocationRevealStage());

  if (config.includeDiscussionEvaluation)
    stages.push(createDiscussionEvaluationStage());
  if (config.includeMediator) stages.push(createFinalMediatorPreferenceStage());

  if (config.includeDebriefingAndFeedback) {
    stages.push(createDebriefingStage());
    stages.push(createExperimentFeedbackStage());
  }

  if (config.includeMetaFeedback) stages.push(createMetaFeedbackStage());
  stages.push(createExperimentEndInfoStage());

  return createExperimentTemplate({
    experiment: createExperimentConfig(stages, {
      metadata: CHARITY_DEBATE_METADATA,
    }),
    stageConfigs: stages,
    // agentMediators: [HABERMAS_MEDIATOR_TEMPLATE, DYNAMIC_MEDIATOR_TEMPLATE],
    agentMediators: [],
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
    name: 'Final Allocation Results',

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
    infoLines: infoLines,
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
        "Overall, I am satisfied with the outcome of this round's discussion.",
      ...LIKERT_SCALE_PROPS,
    }),
    createTextSurveyQuestion({
      questionTitle:
        'If you changed your allocation, what was the most important factor that influenced your decision? (If not, please write NA)',
    }),
    createScaleSurveyQuestion({
      questionTitle:
        'I feel that my perspective was heard and understood by the group.',
      ...LIKERT_SCALE_PROPS,
    }),
    createScaleSurveyQuestion({
      questionTitle:
        "I feel that my input was influential in the group's discussion.",
      ...LIKERT_SCALE_PROPS,
    }),
    createScaleSurveyQuestion({
      questionTitle: 'I feel the final outcome was fair',
      ...LIKERT_SCALE_PROPS,
    }),
    createMultipleChoiceSurveyQuestion({
      id: disagreementQuestionId, // ID is REQUIRED here for the conditional logic below
      questionTitle:
        "Did you have any significant disagreements with other participants during this round's discussion?",
      options: [
        {id: 'yes', text: 'Yes', imageId: ''},
        {id: 'no', text: 'No', imageId: ''},
      ],
    }),
    createScaleSurveyQuestion({
      questionTitle: 'How would you rate the intensity of these disagreements?',
      lowerValue: 1,
      upperValue: 7,
      lowerText: 'Mild',
      upperText: 'Intense',
      condition: createComparisonCondition(
        {stageId, questionId: disagreementQuestionId},
        ComparisonOperator.EQUALS,
        'yes',
      ),
    }),
  ];

  if (isMediatedRound) {
    questions.push(
      createScaleSurveyQuestion({
        questionTitle:
          'The AI facilitator was helpful in resolving these disagreements.',
        ...LIKERT_SCALE_PROPS,
        condition: createComparisonCondition(
          {stageId, questionId: disagreementQuestionId},
          ComparisonOperator.EQUALS,
          'yes',
        ),
      }),
    );
  }
  return createSurveyStage({
    id: stageId,
    name: `Round ${roundNum} Outcome Survey`,
    descriptions: createStageTextConfig({
      primaryText: `Round ${roundNum} is now complete. Based on how close your votes were, your group achieved a **Consensus Score of [Placeholder]%**. This score contributes to your group's final spending power.\n\nPlease answer a few questions about your experience in this round.`,
    }),
    questions,
  });
}

function createAllocationStage(
  id: string,
  name: string,
  charityGroup: string[],
): StageConfig {
  let primaryText = `Please use the sliders below to allocate 100% of the funds among this round's charities.`;

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
      primaryText: primaryText,
      infoText: TEXT_ALLOCATION_INFO_HINT,
    }),
    stockOptions: charityStocks,
  });
}

const SET_PROFILE_STAGE_EXPANDED = createProfileStage({
  name: 'Set profile',
  profileType: ProfileType.ANONYMOUS_ANIMAL,
  descriptions: createStageTextConfig({
    primaryText:
      'In this study, you’ll discuss how to allocate money to different charities with other participants in real time. The profile shown below is your assigned identity for this session. This is how others will see you.',
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
    name: '📝 Today\'s task',
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
    name: '📝 Today\'s impact',
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
        questionTitle: 'In group settings, I try to avoid conﬂict and negotiations.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        questionTitle: 'In group settings, I try to find the best outcome for everyone.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        questionTitle:
          'When making decisions, I prefer to decide quickly.',
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
      // Background familiarity
      createScaleSurveyQuestion({
        questionTitle:
          'I have used AI assistants (e.g., ChatGPT, Bard, Siri, Alexa) to help me with tasks.',
        ...LIKERT_SCALE_PROPS,
      }),
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
          'If given the option, I would be willing to use an AI facilitator in future discussions.',
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
    ? `\n\nAn ${mediator} will be present in this discussion.`
    : '';
  const discussionText = `You will now engage in a discussion with other participants on what the ideal resource allocation for the ${setting}. Your objective, with the other participants, is to determine the optimal resource allocation.${mediatorText}`;
  return createChatStage({
    id: stageId,
    name: stageName,
    descriptions: createStageTextConfig({primaryText: discussionText}),
  });
}

function createPerMediatorEvaluationStage(roundNum: number): StageConfig {
  return createSurveyStage({
    name: `Post-Vote Mediator Feedback: Round ${roundNum}`,
    descriptions: createStageTextConfig({
      primaryText: `Please evaluate the AI facilitator from the discussion you just completed.`,
    }),
    questions: [
      createScaleSurveyQuestion({
        questionTitle:
          '[Performance] Overall, the AI facilitator was useful in having a productive conversation.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        questionTitle:
          '[Performance] The mediator helped me feel like my perspective was heard.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        questionTitle:
          '[Performance] The mediator helped our group stay focused on the topic.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        questionTitle:
          '[Performance] The mediator interrupted the conversation too often.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        questionTitle:
          '[Fairness] The mediator seemed to favor one participant or viewpoint over others.',
        ...LIKERT_SCALE_PROPS,
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
    {id: 'mediator-round-2', text: 'Mediator from Round 2', imageId: ''},
    {id: 'mediator-round-3', text: 'Mediator from Round 3', imageId: ''},
  ];

  return createSurveyStage({
    name: 'Mediator Evaluation',
    descriptions: createStageTextConfig({
      primaryText:
        'Reflecting on all the discussions you participated in, please answer the following.',
    }),
    questions: [
      createMultipleChoiceSurveyQuestion({
        questionTitle:
          'If you were to engage in another debate, which mediator style would you prefer?',
        options: [
          {id: 'none', text: 'None', imageId: ''},
          ...preferenceOptions,
        ],
      }),
      createTextSurveyQuestion({
        questionTitle:
          'Please explain your selection: (If no preference, please write NA)',
      }),
      createScaleSurveyQuestion({
        questionTitle: 'I would include an AI facilitator in future discussions.',
        ...LIKERT_SCALE_PROPS,
      }),
    ],
  });
}

function createDebriefingStage(): StageConfig {
  return createInfoStage({
    name: 'Debriefing',
    infoLines: TEXT_DEBRIEFING,
  });
}

function createExperimentFeedbackStage(): StageConfig {
  return createSurveyStage({
    name: 'Experiment Feedback',
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
          'How clear or unclear were the instructions and questions throughout the experiment?',
        lowerValue: 1,
        upperValue: 7,
        lowerText: 'Very Unclear',
        upperText: 'Very Clear',
      }),
      createTextSurveyQuestion({
        questionTitle:
          'Please describe your overall interaction with the other participants, facilitators, and/or administrators. (If not applicable, please write NA)',
      }),
      createTextSurveyQuestion({
        questionTitle:
          'Do you have any other feedback or concerns about your experience in this study? Did you experience any harmful / offensive behavior, from participants or the mediator? (If not applicable, please write NA)',
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

  const habermasInstruction = `Summarize the conversation periodically to help participants track the state of the conversation and come to a consensus\nKeep your responses AS SHORT AND FOCUSED AS POSSIBLE to serve this goal.`;

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

  const dynamicInstruction = `Your goal is to improve deliberation quality. First, analyze the conversation to diagnose a specific failure mode by setting the 'observedFailureMode' field.
Next, you MUST use the following Lookup Table to select the correct 'proposedSolution' that maps to your diagnosis.
The idea is NOT to settle on any specific outcome, but to ensure that participants properly discuss / weigh options before settling. 

--- STRATEGY LOOKUP TABLE ---
- IF 'observedFailureMode' is 'NoFailureModeDetected', THEN 'proposedSolution' MUST BE 'NoSolutionNeeded'.
- IF 'observedFailureMode' is 'Reaching Rapid, Uncritical Consensus (Groupthink)', THEN 'proposedSolution' MUST BE 'Promote Deeper Reflection or Consideration of Alternatives'.
- IF 'observedFailureMode' is 'Failure to Provide Justification or Reasoning', THEN 'proposedSolution' MUST BE 'Prompt for Justification or Reasoning'.
- IF 'observedFailureMode' is 'Absence of Deliberation or Discussion of Pros/Cons', THEN 'proposedSolution' MUST BE 'Encourage Deliberation of Pros and Cons'.
- IF 'observedFailureMode' is 'Ignoring or Dismissing Dissenting Opinions', THEN 'proposedSolution' MUST BE 'Amplify Minority Viewpoints or Acknowledge Uncertainty'.
- IF 'observedFailureMode' is 'Demonstrating Low Engagement or Apathy', THEN 'proposedSolution' MUST BE 'Re-engage Low-Participation Members or Re-center on Goal'.
- IF 'observedFailureMode' is 'Using Abnormal Communication (e.g., Repetitive loops)', THEN 'proposedSolution' MUST BE 'Summarize to Break a Loop or Gently Re-focus Conversation'.
- IF 'observedFailureMode' is 'Failing to Explore Diverse Viewpoints', THEN 'proposedSolution' MUST BE 'Prompt for Brainstorming of New Ideas or Alternatives'.
---
Keep your responses AS SHORT AND FOCUSED AS POSSIBLE. Don't reiterate points unless it's vital to your intervention to do so. 
Finally, craft a 'response' message that implements your chosen solution. If the solution is 'NoSolutionNeeded', your 'response' must be an empty string and 'shouldRespond' must be false.`;

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
