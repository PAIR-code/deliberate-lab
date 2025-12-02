import {
  ApiKeyType,
  AgentModelSettings,
  createTextPromptItem,
  createChatStage,
  createDefaultStageContextPromptItem,
  AgentMediatorTemplate,
  MediatorPromptConfig,
  createAgentMediatorPersonaConfig,
  createParticipantProfileBase,
  StructuredOutputDataType,
  StructuredOutputSchema,
  createStructuredOutputConfig,
  createAgentChatSettings,
  PromptItemType,
  ProfileInfoPromptItem,
  ProfileContextPromptItem,
  DEFAULT_AGENT_MODEL_SETTINGS,
  DEFAULT_EXPLANATION_FIELD,
  DEFAULT_READY_TO_END_FIELD,
  DEFAULT_RESPONSE_FIELD,
  DEFAULT_SHOULD_RESPOND_FIELD,
  RevealAudience,
  createModelGenerationConfig,
  createChatPromptConfig,
  createDefaultMediatorGroupChatPrompt,
  createTransferStage,
  createTutorialInfoStage,
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
  createInfoStage,
  StageKind,
  createRevealStage,
  createMultiAssetAllocationRevealItem,
  VariableConfig,
  VariableConfigType,
  VariableType,
  RandomPermutationVariableConfig,
  SeedStrategy,
  VariableScope,
  createShuffleConfig,
} from '@deliberation-lab/utils';

const EMOJIS = ['1️⃣', '2️⃣', '3️⃣'];

export enum MediatorModelType {
  GEMINI = 'Gemini',
  CLAUDE = 'Claude',
  OPENAI = 'OpenAI',
}

// Agent configuration for the template, using model-specific IDs.
const GEMINI_MEDIATOR_ID = 'gemini-mediator-agent';
const CLAUDE_MEDIATOR_ID = 'claude-mediator-agent';
const OPENAI_MEDIATOR_ID = 'openai-mediator-agent';

const FAILURE_MODE_ENUMS = [
  'NoFailureModeDetected',
  'LowEffortOrLowEngagement',
  'OffTopicDrift',
  'UnevenParticipation',
  'NoJustificationOrPrematureConsensus',
  'BinaryStuck',
  'SelfContainedReasoningOnly',
];

const SOLUTION_STRATEGY_ENUMS = [
  'NoSolutionNeeded', // No failure mode / still early
  // LowEffortOrLowEngagement
  'InviteBriefReasoningOrValues',
  // OffTopicDrift
  'GentlyRefocusOnAllocationTask',
  // UnevenParticipation
  'InviteQuietVoiceOpenSpace',
  // NoJustificationOrPrematureConsensus
  'CheckConsensusElicitOneReason',
  // BinaryStuck
  'ExploreMiddleGroundOrSharedGoals',
  // SelfContainedReasoningOnly
  'PromptEngagementWithOthers',
];

export const OOTB_CHARITY_DEBATE_METADATA = createMetadataConfig({
  name: 'Out-of-the-box Mediated Charity Debate (3 Rounds)',
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
    score: '99%',
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

const CHARITY_RANDOM_PERMUTATION_CONFIG: RandomPermutationVariableConfig = {
  id: 'charity-permutation-config',
  type: VariableConfigType.RANDOM_PERMUTATION,
  scope: VariableScope.COHORT,
  definition: {
    name: 'charity',
    description: 'List of charities for allocation rounds',
    schema: VariableType.array(
      VariableType.object({
        key: VariableType.STRING,
        name: VariableType.STRING,
        link: VariableType.STRING,
        score: VariableType.STRING,
        mission: VariableType.STRING,
      }),
    ),
  },
  shuffleConfig: createShuffleConfig({
    shuffle: true,
    seed: SeedStrategy.COHORT,
  }),
  values: CHARITY_DATA.map((charity) => JSON.stringify(charity)),
  numToSelect: 9,
  expandListToSeparateVariables: true, // Creates charity_1, charity_2, etc.
};

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
  'To help facilitate your discussion, an AI-based facilitator will join your conversation for one or more rounds.',
  'The conversational style of the AI-based facilitator will be different in each round it appears.',
  '![AI facilitator](https://raw.githubusercontent.com/PAIR-code/deliberate-lab/refs/heads/main/frontend/assets/consensus/instructions2.png)',
  'Here is an example of how this facilitation may look:',
  '![AI transcript](https://raw.githubusercontent.com/PAIR-code/deliberate-lab/refs/heads/main/frontend/assets/consensus/instructions5.png)',
];

const TEXT_INSTRUCTIONS = [
  'The object of this study is understanding how groups make decisions together. Today, you’ll have *three* rounds of decision-making; in each round, your group will make decisions about how to allocate money across three charities. Each round has three steps:',
  '1. *Privately choose an initial allocation*. Given a fixed pool of money, decide how to split it among the three charities presented.',
  '2. *Discuss your choices with the group*. Share your reasoning with 2 other participants and try to reach a consensus. You will have **exactly 5 minutes** to discuss per round.',
  '3. *Privately update your allocation*. After the discussion, you can revise your initial allocation based on what you heard.',
  'Your goal is to work together to find the best way to split the funds.',
  '![Instructions](https://raw.githubusercontent.com/PAIR-code/deliberate-lab/refs/heads/main/frontend/assets/consensus/instructions1.png)',
];

const TEXT_INSTRUCTIONS_2 = [
  'The charities in each round are real. After your final decision, we will donate a **fixed total amount** to these charities based on your group’s choices.',
  'If you were the only participant, your final allocation would directly determine how the donation is split.',
  '![Donation example](https://raw.githubusercontent.com/PAIR-code/deliberate-lab/refs/heads/main/frontend/assets/consensus/instructions4.png)',
  "However, you are part of a group of 3 participants. Your **group's allocation** is the **average** of everyone's final allocation in that round.",
];

const TEXT_INSTRUCTIONS_3 = [
  'Each round, your group will receive a **consensus score**, which measures how similar your final allocations are.',
  'For example, if everyone agrees on 🐶 50% / 🐱 30% / 🐹 20%, the consensus score is high (100). If your allocations are very different, the score will be lower.',
  'At the end of the study, all groups will be ranked by their consensus scores. **Groups with higher consensus will have more influence** over how the donation is split.',
  'In the example image, Group 1 had high consensus and favored 🐹 Hamsters. Group 3 had low consensus and favored 🐶 Dogs. Because Group 1 had a higher consensus score, their decisions will be prioritized: more money will go to 🐹 Hamsters than to 🐶 Dogs.',
  '![Consensus example](https://raw.githubusercontent.com/PAIR-code/deliberate-lab/refs/heads/main/frontend/assets/consensus/instructions3.png)',
];

const TEXT_INSTRUCTIONS_4 = [
  'Today, our study will commit to donating **at least $100 per round**, split among the three charities. With 3 rounds total, at least **$300 will be donated in total**. Your group’s choices, along with those of other groups, will help to inform where that money goes.',
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
  timeoutSeconds: 600,
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

export function getOOTBMediatorOrder(id: number): MediatorModelType[] {
  const GEMINI = MediatorModelType.GEMINI;
  const CLAUDE = MediatorModelType.CLAUDE;
  const OPENAI = MediatorModelType.OPENAI;

  switch (
    id % 6 // Use modulo 6 for 3! = 6 permutations
  ) {
    case 0:
      return [GEMINI, CLAUDE, OPENAI];
    case 1:
      return [GEMINI, OPENAI, CLAUDE];
    case 2:
      return [CLAUDE, GEMINI, OPENAI];
    case 3:
      return [CLAUDE, OPENAI, GEMINI];
    case 4:
      return [OPENAI, GEMINI, CLAUDE];
    case 5:
      return [OPENAI, CLAUDE, GEMINI];
    default:
      return [GEMINI, CLAUDE, OPENAI];
  }
}

export interface CharityDebateConfig {
  includeTos: boolean;
  includeMediator: boolean;
  includeInitialParticipantSurvey: boolean;
  includeDiscussionEvaluation: boolean;
  includeDebriefingAndFeedback: boolean;
  includeMetaFeedback: boolean;
  facilitatorConfigId: number;
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
    facilitatorConfigId: 0,
    ...config,
  };
}

// Generates CharityDebate with "out of the box" mediators.
export function getOOTBCharityDebateTemplate(
  config: CharityDebateConfig,
): ExperimentTemplate {
  const stages: StageConfig[] = [];
  const variableTemplates: VariableConfig[] = [
    CHARITY_RANDOM_PERMUTATION_CONFIG,
  ];
  const geminiStageIds: string[] = [];
  const claudeStageIds: string[] = [];
  const openaiStageIds: string[] = [];
  const agentMediators: AgentMediatorTemplate[] = [];

  let geminiRound: number | undefined;
  let claudeRound: number | undefined;
  let openaiRound: number | undefined;

  // Tutorial stage.
  stages.push(createTutorialInfoStage());

  if (config.includeTos) stages.push(CONSENSUS_TOS_STAGE);

  stages.push(SET_PROFILE_STAGE_EXPANDED);

  const instructions = createInstructionsStages();
  for (const stage of instructions) {
    stages.push(stage);
  }

  if (config.includeMediator) stages.push(createMediatedDiscussionInfoStage());
  stages.push(createCharityComprehensionStage());

  if (config.includeInitialParticipantSurvey)
    stages.push(createInitialParticipantSurveyStage());

  if (config.includeMediator) stages.push(createInitialMediatorSurveyStage());

  stages.push(TRANSFER_STAGE);

  const debateRoundsCharities = [
    ['charity_1', 'charity_2', 'charity_3'],
    ['charity_4', 'charity_5', 'charity_6'],
    ['charity_7', 'charity_8', 'charity_9'],
  ];

  const roundMediatorTypes = getOOTBMediatorOrder(
    Number(config.facilitatorConfigId),
  );
  const numRounds = Math.min(
    debateRoundsCharities.length,
    roundMediatorTypes.length,
  );

  for (let index = 0; index < numRounds; index++) {
    const charityGroup = debateRoundsCharities[index];
    const roundNum = index + 1;
    const mediatorType = roundMediatorTypes[index];
    const discussionStageId = `discussion-round-${roundNum}`;

    const setting = `donations to:\n *${charityGroup
      .map((variableName) => `{{${variableName}.name}}`)
      .join(', ')}*`;

    stages.push(
      createAllocationStage(
        `vote-round-${roundNum}-pre`,
        `${EMOJIS[roundNum - 1]} Round ${roundNum}: Initial allocation`,
        charityGroup,
        roundNum,
      ),
    );

    const isMediatedRound = true; // Every round is mediated in this new design

    let mediatorAgentId: string;
    let mediatorFriendlyName: string;

    if (mediatorType === MediatorModelType.GEMINI) {
      mediatorAgentId = GEMINI_MEDIATOR_ID;
      mediatorFriendlyName = 'Gemini Mediator';
      geminiStageIds.push(discussionStageId);
      geminiRound = roundNum;
    } else if (mediatorType === MediatorModelType.CLAUDE) {
      mediatorAgentId = CLAUDE_MEDIATOR_ID;
      mediatorFriendlyName = 'Claude Mediator';
      claudeStageIds.push(discussionStageId);
      claudeRound = roundNum;
    } else {
      // OpenAI
      mediatorAgentId = OPENAI_MEDIATOR_ID;
      mediatorFriendlyName = 'OpenAI Mediator';
      openaiStageIds.push(discussionStageId);
      openaiRound = roundNum;
    }

    const discussionStage = createDiscussionStageWithMediator(
      discussionStageId,
      `${EMOJIS[roundNum - 1]} Round ${roundNum}: Discussion`,
      setting,
      {
        persona: {id: mediatorAgentId, name: mediatorFriendlyName},
      } as AgentMediatorTemplate,
    );

    stages.push(discussionStage);

    stages.push(
      createAllocationStage(
        `vote-round-${roundNum}-post`,
        `${EMOJIS[roundNum - 1]} Round ${roundNum}: Final allocation`,
        charityGroup,
        roundNum,
        false,
      ),
    );

    stages.push(createRoundOutcomeSurveyStage(roundNum, isMediatedRound));
    stages.push(createPerMediatorEvaluationStage(roundNum));
  }

  stages.push(createAllocationRevealStage());
  if (config.includeDiscussionEvaluation)
    stages.push(createDiscussionEvaluationStage());

  const mediatorOptions = [
    {
      round: geminiRound,
      id: GEMINI_MEDIATOR_ID,
      name: `Round ${geminiRound} Mediator`,
    },
    {
      round: claudeRound,
      id: CLAUDE_MEDIATOR_ID,
      name: `Round ${claudeRound} Mediator`,
    },
    {
      round: openaiRound,
      id: OPENAI_MEDIATOR_ID,
      name: `Round ${openaiRound} Mediator`,
    },
  ].sort((a, b) => (a.round ?? 0) - (b.round ?? 0));

  stages.push(
    createFinalMediatorPreferenceStage(
      mediatorOptions[0],
      mediatorOptions[1],
      mediatorOptions[2],
    ),
  );

  if (config.includeDebriefingAndFeedback) {
    stages.push(createDebriefingStage());
    stages.push(createExperimentFeedbackStage());
  }

  stages.push(createExperimentEndInfoStage());

  if (geminiStageIds.length > 0) {
    agentMediators.push(createGeminiMediatorTemplate(geminiStageIds));
  }
  if (claudeStageIds.length > 0) {
    agentMediators.push(createClaudeMediatorTemplate(claudeStageIds));
  }
  if (openaiStageIds.length > 0) {
    agentMediators.push(createOpenAIMediatorTemplate(openaiStageIds));
  }

  return createExperimentTemplate({
    experiment: createExperimentConfig(stages, {
      metadata: OOTB_CHARITY_DEBATE_METADATA,
      variableConfigs: variableTemplates,
    }),
    stageConfigs: stages,
    agentMediators: agentMediators,
    agentParticipants: [],
  });
}

function createDiscussionStageWithMediator(
  stageId: string,
  stageName: string,
  setting: string,
  mediatorTemplate: AgentMediatorTemplate,
): StageConfig {
  const mediatorText = `\n\n🤖 An AI-based facilitator will be present in this discussion.`;
  const discussionText = `Discuss the ideal allocation of ${setting}.${mediatorText}`;

  return createChatStage({
    id: stageId,
    name: stageName,
    descriptions: createStageTextConfig({primaryText: discussionText}),
    progress: createStageProgressConfig({waitForAllParticipants: true}),
    timeLimitInMinutes: 5,
    requireFullTime: true, // Setting this to True causes the timeLimit to be a min AND maximum.
  });
}

export function createAllocationRevealStage(): StageConfig {
  return createRevealStage({
    id: 'final-results-summary',
    name: '📊 Final allocation results',
    descriptions: createStageTextConfig({
      primaryText:
        'Here are the final results of your group’s allocations across all three rounds. The higher the score, the more influence your group will have in directing the donations.\n\n‼️ Click `Next Stage` after viewing the final results to continue with the experiment.',
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
        'Please answer the following questions to ensure the instructions are clear. You can click back to previous stages to review the instructions if needed.',
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

  const questions = [
    createTextSurveyQuestion({
      questionTitle:
        'If you changed your allocation, what influenced your decision? (If not, write NA.)',
    }),
    createScaleSurveyQuestion({
      questionTitle:
        'I felt strongly about my initial allocation (e.g. clear preferences or strong opinions).',
      ...LIKERT_SCALE_PROPS,
    }),
    createScaleSurveyQuestion({
      questionTitle: 'I feel strongly about my final allocation.',
      ...LIKERT_SCALE_PROPS,
    }),
    createScaleSurveyQuestion({
      questionTitle: 'I am satisfied with the outcome of the discussion.',
      ...LIKERT_SCALE_PROPS,
    }),
    createScaleSurveyQuestion({
      questionTitle: 'I felt heard and understood during the discussion.',
      ...LIKERT_SCALE_PROPS,
    }),
    createScaleSurveyQuestion({
      questionTitle: 'The group worked together effectively.',
      ...LIKERT_SCALE_PROPS,
    }),
    createTextSurveyQuestion({
      questionTitle:
        'Briefly describe how you felt the discussion went. (e.g., overall flow, any tensions or key moments)"',
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
  charityVariableNames: string[],
  roundNum: number,
  isInitial: boolean = true,
): StageConfig {
  let scope = `You are now beginning round ${roundNum} of 3.`;
  if (!isInitial) {
    scope = `Now that you have discussed with your group, make your final allocation for round ${roundNum}.`;
  }

  let primaryText = `${scope}\nPlease use the sliders to allocate 100% of the funds among the following charities:\n`;

  charityVariableNames.forEach((variableName) => {
    primaryText += `\n
[{{${variableName}.name}}]({{${variableName}.link}}) (Charity Navigator score: {{${variableName}.score}})
*{{${variableName}.mission}}*\n`;
  });

  const charityStocks = charityVariableNames.map((variableName) => {
    return createStock({
      name: `{{${variableName}.name}}`,
      description: `Details for {{${variableName}.name}}.`,
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
      createScaleSurveyQuestion({
        questionTitle:
          'I believe an AI facilitator could make group discussions more productive.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        questionTitle:
          'I would feel comfortable having an AI facilitator in the group discussion.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        questionTitle:
          'If given the option, I would be willing to use an AI facilitator in group discussions.',
        ...LIKERT_SCALE_PROPS,
      }),
      createTextSurveyQuestion({
        questionTitle:
          'If applicable, what kinds of tasks have you used AI assistants for? (If not, write NA.)',
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
  const discussionText = `Discuss the ideal allocation of ${setting}.${mediatorText}`;
  return createChatStage({
    id: stageId,
    name: stageName,
    descriptions: createStageTextConfig({primaryText: discussionText}),
    progress: createStageProgressConfig({waitForAllParticipants: true}),
    timeLimitInMinutes: 5,
    requireFullTime: true,
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

export function createDefaultMediatorSchema(): StructuredOutputSchema {
  return {
    type: StructuredOutputDataType.OBJECT,
    properties: [
      {
        name: DEFAULT_EXPLANATION_FIELD,
        schema: {
          type: StructuredOutputDataType.STRING,
          description:
            'Your reasoning for your response and other field values.',
        },
      },
      {
        name: DEFAULT_SHOULD_RESPOND_FIELD,
        schema: {
          type: StructuredOutputDataType.BOOLEAN,
          description: `Whether you should respond in the chat. Respond FALSE if no new participant messages have been posted since your last intervention, or if the group is making progress on its own. Speak rarely; wait for at least a few participant messages (~3-5 turns) before speaking again.`,
        },
      },
      {
        name: DEFAULT_RESPONSE_FIELD,
        schema: {
          type: StructuredOutputDataType.STRING,
          description: 'Your response message to the group.',
        },
      },
      {
        name: DEFAULT_READY_TO_END_FIELD,
        schema: {
          type: StructuredOutputDataType.BOOLEAN,
          description:
            'Whether or not you have completed your goals and are ready to end the conversation.',
        },
      },
    ],
  };
}

function createDefaultMediatorPromptConfig(
  roundId: string,
  modelSettings: AgentModelSettings,
): MediatorPromptConfig {
  const structuredOutputConfig = createStructuredOutputConfig({
    enabled: true,
    schema: createDefaultMediatorSchema(),
    appendToPrompt: true,
  });

  const chatSettings = createAgentChatSettings({
    initialMessage: '',
    minMessagesBeforeResponding: 0,
    maxResponses: 100,
  });

  const generationConfig = createModelGenerationConfig();

  const defaultInstruction = `As the conversation facilitator, help the group explore how they want to split the donation across the three charities and move towards group consensus on an exact allocation spread (for example, 20%/40%/40%).`;

  return createChatPromptConfig(roundId, StageKind.CHAT, {
    prompt: createDefaultMediatorGroupChatPrompt(roundId, defaultInstruction),
    structuredOutputConfig,
    chatSettings,
    generationConfig,
    // Note: modelSettings will be applied at the persona level, not here.
  });
}

// New mediator template for Gemini
function createGeminiMediatorTemplate(
  stageIds: string[],
): AgentMediatorTemplate {
  const promptMap: {[key: string]: MediatorPromptConfig} = {};
  const modelSettings: AgentModelSettings = {
    apiType: ApiKeyType.GEMINI_API_KEY,
    modelName: 'gemini-2.5-flash',
  };

  for (const id of stageIds) {
    promptMap[id] = createDefaultMediatorPromptConfig(id, modelSettings);
  }

  return {
    persona: createAgentMediatorPersonaConfig({
      id: GEMINI_MEDIATOR_ID,
      name: 'Gemini Facilitator',
      description: 'An AI facilitator powered by Google Gemini.',
      defaultModelSettings: modelSettings,
      defaultProfile: createParticipantProfileBase({
        name: 'Facilitator',
        avatar: '🤖',
      }),
    }),
    promptMap: promptMap,
  };
}

function createClaudeMediatorTemplate(
  stageIds: string[],
): AgentMediatorTemplate {
  const promptMap: {[key: string]: MediatorPromptConfig} = {};
  const modelSettings: AgentModelSettings = {
    apiType: ApiKeyType.CLAUDE_API_KEY,
    modelName: 'claude-haiku-4-5',
  };

  for (const id of stageIds) {
    promptMap[id] = createDefaultMediatorPromptConfig(id, modelSettings);
  }

  return {
    persona: createAgentMediatorPersonaConfig({
      id: CLAUDE_MEDIATOR_ID,
      name: 'Claude Facilitator',
      description: 'An AI facilitator powered by Anthropic Claude.',
      defaultModelSettings: modelSettings,
      defaultProfile: createParticipantProfileBase({
        name: 'Facilitator',
        avatar: '🤖',
      }),
    }),
    promptMap: promptMap,
  };
}

function createOpenAIMediatorTemplate(
  stageIds: string[],
): AgentMediatorTemplate {
  const promptMap: {[key: string]: MediatorPromptConfig} = {};
  const modelSettings: AgentModelSettings = {
    apiType: ApiKeyType.OPENAI_API_KEY,
    modelName: 'gpt-5-mini',
  };

  for (const id of stageIds) {
    promptMap[id] = createDefaultMediatorPromptConfig(id, modelSettings);
  }

  return {
    persona: createAgentMediatorPersonaConfig({
      id: OPENAI_MEDIATOR_ID,
      name: 'OpenAI Facilitator',
      description: 'An AI facilitator powered by OpenAI GPT.',
      defaultModelSettings: modelSettings,
      defaultProfile: createParticipantProfileBase({
        name: 'Facilitator',
        avatar: '🤖',
      }),
    }),
    promptMap: promptMap,
  };
}

function createFinalMediatorPreferenceStage(
  mediatorOption1?: {id: string; name: string},
  mediatorOption2?: {id: string; name: string},
  mediatorOption3?: {id: string; name: string},
): StageConfig {
  const preferenceOptions = [];

  if (mediatorOption1) {
    preferenceOptions.push({
      id: mediatorOption1.id,
      text: mediatorOption1.name,
      imageId: '',
    });
  }

  if (mediatorOption2) {
    preferenceOptions.push({
      id: mediatorOption2.id,
      text: mediatorOption2.name,
      imageId: '',
    });
  }

  if (mediatorOption3) {
    preferenceOptions.push({
      id: mediatorOption3.id,
      text: mediatorOption3.name,
      imageId: '',
    });
  }

  return createSurveyStage({
    name: '❓ Survey on AI facilitators',
    descriptions: createStageTextConfig({
      primaryText:
        'Think back to the three conversations you engaged in today. Each round featured a different AI facilitator. Please answer the following questions about your preferences regarding these facilitators.',
    }),
    questions: [
      createMultipleChoiceSurveyQuestion({
        questionTitle:
          'If you were to have another similar group discussion, which facilitator style would you prefer?',
        options: preferenceOptions,
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
