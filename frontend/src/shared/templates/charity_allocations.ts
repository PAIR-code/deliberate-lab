import {
  createTextPromptItem,
  createChatStage,
  createDefaultMediatorGroupChatPrompt,
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

export enum MediatorType {
  NONE = 'None',
  HABERMAS = 'Habermas',
  DYNAMIC = 'Dynamic',
}

// Agent configuration for the template.
const HABERMAS_MEDIATOR_ID = 'habermas-mediator-agent';
const DYNAMIC_MEDIATOR_ID = 'dynamic-mediator-agent';

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

export function getMediatorOrder(id: number): MediatorType[] {
  const NONE = MediatorType.NONE;
  const HABERMAS = MediatorType.HABERMAS;
  const DYNAMIC = MediatorType.DYNAMIC;

  switch (id) {
    case 0:
      return [NONE, HABERMAS, DYNAMIC];
    case 1:
      return [NONE, DYNAMIC, HABERMAS];
    case 2:
      return [HABERMAS, NONE, DYNAMIC];
    case 3:
      return [HABERMAS, DYNAMIC, NONE];
    case 4:
      return [DYNAMIC, NONE, HABERMAS];
    case 5:
      return [DYNAMIC, HABERMAS, NONE];
    default:
      return [NONE, HABERMAS, DYNAMIC];
  }
}

export function getCharityDebateTemplate(
  config: CharityDebateConfig,
): ExperimentTemplate {
  const stages: StageConfig[] = [];
  const variableTemplates: VariableConfig[] = [
    CHARITY_RANDOM_PERMUTATION_CONFIG,
  ];
  const habermasStageIds: string[] = [];
  const dynamicStageIds: string[] = [];
  const agentMediators: AgentMediatorTemplate[] = [];

  let habermasRound: number | undefined;
  let dynamicRound: number | undefined;

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

  const roundMediatorTypes = getMediatorOrder(
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

    let discussionStage: StageConfig;
    let isMediatedRound = false;

    if (config.includeMediator && mediatorType !== MediatorType.NONE) {
      isMediatedRound = true;
      let mediatorAgentId: string;
      let mediatorFriendlyName: string;

      if (mediatorType === MediatorType.HABERMAS) {
        mediatorAgentId = HABERMAS_MEDIATOR_ID;
        mediatorFriendlyName = 'Habermas Mediator';
        habermasStageIds.push(discussionStageId);
        habermasRound = roundNum;
      } else {
        mediatorAgentId = DYNAMIC_MEDIATOR_ID;
        mediatorFriendlyName = 'Dynamic Mediator';
        dynamicStageIds.push(discussionStageId);
        dynamicRound = roundNum;
      }

      discussionStage = createDiscussionStageWithMediator(
        discussionStageId,
        `${EMOJIS[roundNum - 1]} Round ${roundNum}: Discussion`,
        setting,
        {
          persona: {id: mediatorAgentId, name: mediatorFriendlyName},
        } as AgentMediatorTemplate,
      );
    } else {
      discussionStage = createAllocationDiscussionStage(
        discussionStageId,
        `${EMOJIS[roundNum - 1]} Round ${roundNum}: Discussion`,
        setting,
        undefined,
      );
    }

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

    if (isMediatedRound) {
      stages.push(createPerMediatorEvaluationStage(roundNum));
    }
  }

  stages.push(createAllocationRevealStage());
  if (config.includeDiscussionEvaluation)
    stages.push(createDiscussionEvaluationStage());

  if (config.includeMediator) {
    let habermasOption: {id: string; name: string} | undefined;
    let dynamicOption: {id: string; name: string} | undefined;

    if (habermasRound) {
      habermasOption = {
        id: HABERMAS_MEDIATOR_ID,
        name: `Round ${habermasRound} Mediator`,
      };
    }
    if (dynamicRound) {
      dynamicOption = {
        id: DYNAMIC_MEDIATOR_ID,
        name: `Round ${dynamicRound} Mediator`,
      };
    }

    if (habermasRound! < dynamicRound!) {
      stages.push(
        createFinalMediatorPreferenceStage(habermasOption, dynamicOption),
      );
    } else {
      stages.push(
        createFinalMediatorPreferenceStage(dynamicOption, habermasOption),
      );
    }
  }

  if (config.includeDebriefingAndFeedback) {
    stages.push(createDebriefingStage());
    stages.push(createExperimentFeedbackStage());
  }

  stages.push(createExperimentEndInfoStage());

  if (habermasStageIds.length > 0) {
    agentMediators.push(createHabermasMediatorTemplate(habermasStageIds));
  }
  if (dynamicStageIds.length > 0) {
    agentMediators.push(createDynamicMediatorTemplate(dynamicStageIds));
  }

  return createExperimentTemplate({
    experiment: createExperimentConfig(stages, {
      metadata: CHARITY_DEBATE_METADATA,
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

function createFinalMediatorPreferenceStage(
  mediatorOption1?: {id: string; name: string},
  mediatorOption2?: {id: string; name: string},
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
  const allOptions = [
    {id: 'none', text: 'None', imageId: ''},
    ...preferenceOptions,
  ];

  return createSurveyStage({
    name: '❓ Survey on AI facilitators',
    descriptions: createStageTextConfig({
      primaryText:
        'Think back to the three conversations you engaged in today: in the first, second, and third rounds, there were different AI facilitators or none at all. Please answer the following questions about your preferences regarding these facilitators.',
    }),
    questions: [
      createMultipleChoiceSurveyQuestion({
        questionTitle:
          'If you were to have another similar group discussion, which facilitator style would you prefer?',
        options: allOptions,
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
          description: `Whether you should respond in the chat. Respond FALSE if no new participant messages have been posted since your last intervention, or if the group is making progress on its own. Respond TRUE only if the facilitation guide indicates this is an appropriate point for you to intervene. If unsure, respond FALSE. Speak rarely; wait for at least a few participant messages (~3-5 turnsSinceLastIntervention) before speaking again, unless there is clear confusion or misunderstanding. Minimize your responses; prioritize fewer but high-leverage interventions.`,
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
      {
        name: 'turnsSinceLastIntervention',
        schema: {
          type: StructuredOutputDataType.INTEGER,
          description:
            'The number of participant messages that have occurred since your last facilitator message. Count only participant utterances, not your own.',
        },
      },
      {
        name: 'consensusLevel',
        schema: {
          type: StructuredOutputDataType.STRING,
          description:
            'How aligned the group’s proposed allocations are across the three charities. LOW = allocations differ significantly or preferences are unclear. MEDIUM = participants show partial alignment (e.g., similar charity priorities or narrowing ranges) but numbers are not yet aligned. HIGH = participants propose similar or converging allocations, with only small % differences.',
        },
      },
    ],
  };
}

function createDynamicMediatorSchema(): StructuredOutputSchema {
  const standardSchema = createStandardMediatorSchema();

  const failureModeField = {
    name: 'observedFailureMode',
    schema: {
      type: StructuredOutputDataType.ENUM,
      description:
        'Analyze the conversation and select the single most prominent failure mode. If none are present, you MUST choose "NoFailureModeDetected".',
      enumItems: FAILURE_MODE_ENUMS,
    },
  };

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
    shouldRespondProperty.schema.description = `Whether or not to respond. Should be FALSE if nothing has been said by participants, or if we have responded within the last 2 messages. If >2 messages have passed, AND if failureMode detects some failure mode, should be TRUE.`;
  }

  return standardSchema;
}

function createHabermasMediatorPromptConfig(
  roundId: string,
): MediatorPromptConfig {
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
You are a neutral facilitator supporting a group discussion about how to allocate donations: you accomplish this through summarization-style facilitation, summarizing, surfacing conversation structure, and lightly proposing process steps.
You do not suggest allocation values or introduce ideas of your own.

Your job is to support clarity and movement toward a shared, specific proportional split across the three charities (e.g., 40/30/30). Consensus means one of the following:
* The group converges on one concrete allocation split, or
* The group clearly articulates a very narrow range/structure that can be finalized easily (e.g., “Something like 40/35/25 vs 35/40/25 is fine”), or
* The group explicitly recognizes stable disagreement, understands each other's views, and chooses not to converge further.

## 📝 How to speak:

Here are some core behaviors and examples of how to respond.

* Summarize viewpoints when the group needs shared clarity — not after every comment. Use summaries to reset, bridge, or mark progress, not to repeat obvious statements. Do not summarize if only 1-2 short opinions have been shared, it was obvious what was said, the group is already responding to each other, it would interrupt momentum, or your summary would add no new clarity.
  * Example response: "We seem to have two priorities emerging: urgent humanitarian support and long-term environmental protection."
* Surface shared themes or contrasts
  * Example response: “Seems like fairness and effectiveness matter to everyone"
* Name contrasts / tension neutrally and simply
  * Example response: “From the two proposed allocations, we have a pull between concentrating resources vs spreading them for balance." 
* Reflect where alignment may exist (light touch:
  * Example response: “There’s some overlap in your viewpoints: it seems like everyone wants to help people over planet." (Subtle — invites bridging without prescribing.)
* Highlight key decision points and pivots
  * Example response: "Deciding whether to prioritize A or B seems to hinge on whether urgency or long-term benefit should carry more weight."
* Invite clarification after summarization
  * Example response: "Does this summare feel right to folks?" 
* Name possible next step **process options**, not content
  * Example response: "Would it help to see if there’s agreement on the main priority first — urgency, fairness, or long-term impact?" (This is also summarizing priorities that have been mentioned by users)
* Gently guide toward structure and convergence through summarizaiton
  * Example response: "If helpful, we could test whether there’s a midpoint or blended approach that reflects your shared values of A, B and C."
  
Avoid suggesting allocations, evaluating ideas, taking sides, or adding new arguments or criteria.


* Be concise: 1–3 short sentences max.
* Be neutral: do not introduce new ideas or preferences.
* Summarize fairly: include all major viewpoints without evaluation.
* Use summaries to support and steer clarity and movement, not to steer content
  `;

  return createChatPromptConfig(roundId, StageKind.CHAT, {
    prompt: createDefaultMediatorGroupChatPrompt(roundId, habermasInstruction),
    structuredOutputConfig,
    chatSettings,
    generationConfig,
  });
}

function createDynamicMediatorPromptConfig(
  roundId: string,
): MediatorPromptConfig {
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

  const dynamicInstruction = `You are a neutral facilitator supporting a group discussion about how to allocate donations. Participants are anonymous animal avatars. Your job is to help them achieve conesnsus on through addressing failure modes in the discussion. You do not lead, persuade, or introduce ideas.

  You are a neutral facilitator supporting a group discussion about how to allocate donations: you accomplish this through targeted facilitation, addressing failure modes as they arise in the conversation. You do not suggest allocation values or introduce ideas of your own.

  Your job is to support clarity and movement toward a shared, specific proportional split across the three charities (e.g., 40/30/30). Consensus means one of the following:
  * The group converges on one concrete allocation split, or
  * The group clearly articulates a very narrow range/structure that can be finalized easily (e.g., “Something like 40/35/25 vs 35/40/25 is fine”), or
  * The group explicitly recognizes stable disagreement, understands each other's views, and chooses not to converge further.
  

  ## When to speak

  Intervene only when observing one of the failure modes below:

  ### LowEffortOrLowEngagement
  * Symptons: minimal participation, one-word answers, low / apathetic group energy
  * Examples: "50% to Charity B." "Sure." "IDK." (Standalone.)
  * Intervention strategy and examples: spark brief reasoning or values without pressure
    * “What’s one thing that made you lean that way?"
  
  ### OffTopicDrift
  * Symptoms: drifting into side chat or into adjacent topics that do not move the group towards consensus, forgetting the goal of choosing an allocation across the three charities. Light social comments or brief tangents are fine, but if the group stays off-task for too long, or the tangent takes over, it's drift.
  * Examples:
    * “lol what's your fav animal?"
    * Deep dive into philosophy of giving / personal ethics without allocation discussion: “Is charity even effective as a system?" “I saw a podcast saying international aid is inefficient."
  * Intervention strategy and examples: let small tangents breathe for a couple turns, then gently anchor back to decision-making if they continue.
    * “Interesting point — how would you reflect that in the allocation?"
    * “We can return to that idea, but for now, what mix are you leaning toward?"

  ### UnevenParticipation
  * Symptoms: one or two people dominate while the third stays quiet; the same two rotate turns; someone stays silent through a mini-exchange. Early back-and-forth is normal — give a few turns at the start. Only nudge if the imbalance persists.
  * Examples:
    * Two participants go back-and-forth for 3–5 turns
    * One participant posts multiple turns in a row
    * The third participant hasn’t spoken since the start or fell out after an early comment
  * Intervention strategy and examples: wait a bit; if the pattern continues and the group isn't rotating naturally, gently open space
    * “Curious to hear Z’s take too — anything stand out to you?"
    * “Let’s pause to make sure everyone has room to weigh in here."

  ### NoJustificationOrPrematureConsensus
  * Symptoms: the group appears to agree quickly without explaining why; decisions settle fast to avoid friction; polite alignment but no shared reasoning. Brief agreement is fine — only step in if they “agree" without grounding or checking understanding.
  * Examples:
    * “Yeah that works."
    * “Okay 50/50 then."
    * “Sure, let’s just do that." (with no explanation or reflection)
  * Intervention strategy and examples: gently surface one reason, confirm real alignment, or invite a light alternative check
    * “Anyone see a trade-off or want to add a different angle?"
    * "If we looked at this through ‘most urgent need,’ would the split change?" (Alternative framing)
    * “If we had to give just a little more to one charity, which one and why?"

  ### BinaryStuck
  * Symptoms: the group locks into two preferred splits or priorities (e.g., 40/30 vs. 30/40), treats it as an either-or choice, or each person insists one charity “should get the most." Some back-and-forth is normal — only intervene if they stay stuck in these two positions and don’t explore middle ground, hybrids, or tiny adjustments.
  * Examples:
    * “Charity A clearly deserves the biggest share."
    * “No, B should definitely get the most."
    * “We already covered that — A needs more." (no exploration beyond two fixed stances)
  * Intervention strategy and examples: highlight the spectrum, invite small-step thinking, and connect to shared goals / compromise
    * “Sounds like both A and B matter a lot here — what’s a way to reflect both priorities?"
    * “If you had to land somewhere between the two options, what would feel fair?"
  
  ### SelfContainedReasoningOnly
  * Symptoms: participants share reasoning but do not engage with each other; three parallel monologues; ideas sit side-by-side without acknowledgement. Initial independent thinking is expected — intervene only after a few turns if no one references others.
  * Examples:
    * "I pick A because local impact."
    * "I went with 30 / 40 / 40." (no response to each other)
  * Intervention strategy and examples: invite building on or reacting to each other’s ideas; help surface connections if they exist.
    * “A, did anything someone else said shape your thinking?"
    “Anyone want to respond to or build on another idea here?"
    “It sounds like B and C share a focus on fairness/impact — worth exploring that overlap?"

  ## Step rules
  1. Identify the most likely observedFailureMode:
    * LowEffortOrLowEngagement
    * OffTopicDrift
    * UnevenParticipation
    * NoJustificationOrPrematureConsensus
    * BinaryStuck
    * SelfContainedReasoningOnly
    
    If none of these are appropriate or it is too early in the conversation, the failure mode is NoFailureModeDetected.
  2. Decide shouldRespond. This is true only if a failure mode is active and there is a high-leverage response or nudge that can address the failure mode.  If unsure, stay silent and respond false.

  3. Update the response with your intervention, stemming from the guide above.
    * Be concise: 1–3 short sentences max.
    * Be neutral: do not introduce new ideas or preferences.
    
    If shouldRespond is false, response = "".`;

  return createChatPromptConfig(roundId, StageKind.CHAT, {
    prompt: createDefaultMediatorGroupChatPrompt(roundId, dynamicInstruction),
    structuredOutputConfig,
    chatSettings,
    generationConfig,
  });
}

function createHabermasMediatorTemplate(
  stageIds: string[],
): AgentMediatorTemplate {
  const promptMap: {[key: string]: MediatorPromptConfig} = {};
  for (const id of stageIds) {
    promptMap[id] = createHabermasMediatorPromptConfig(id);
  }

  return {
    persona: createAgentMediatorPersonaConfig({
      id: HABERMAS_MEDIATOR_ID,
      name: 'Habermas Faciliator',
      description:
        'An AI facilitator focused on promoting consensus and summarization.',
      defaultModelSettings: DEFAULT_AGENT_MODEL_SETTINGS,
      defaultProfile: createParticipantProfileBase({
        name: 'Facilitator',
        avatar: '🤖',
      }),
    }),
    promptMap: promptMap,
  };
}

function createDynamicMediatorTemplate(
  stageIds: string[],
): AgentMediatorTemplate {
  const promptMap: {[key: string]: MediatorPromptConfig} = {};
  for (const id of stageIds) {
    promptMap[id] = createDynamicMediatorPromptConfig(id);
  }

  return {
    persona: createAgentMediatorPersonaConfig({
      id: DYNAMIC_MEDIATOR_ID,
      name: 'Dynamic Faciliator',
      description:
        'An AI facilitator focused on counteracting specific negative group dynamics.',
      defaultModelSettings: DEFAULT_AGENT_MODEL_SETTINGS,
      defaultProfile: createParticipantProfileBase({
        name: 'Facilitator',
        avatar: '🤖',
      }),
    }),
    promptMap: promptMap,
  };
}
