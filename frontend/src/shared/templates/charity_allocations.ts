import {
  createChatStage,
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
} from '@deliberation-lab/utils';

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
    'A multi-round debate where participants discuss and vote on how to allocate a budget among several real-world charities, with different AI mediators in each round.',
});

const CHARITY_BUNDLES = [
  [
    'IFAW (Animal Welfare)',
    'Sudan Humanitarian Aid',
    'Clean Oceans Initiative',
  ],
  ['Wildaid (Animal Welfare)', 'Eye Care in India', 'Wheelchairs for Children'],
  [
    'Rainforest Action',
    'Aid for Children in remote villages',
    'Global Housing for Orphans',
  ],
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
    '**IRB & Confidentiality**',
    'The results of this study will be used solely for research purposes. Our team will keep all your information from this study strictly confidential, as required by law. The IRB at XXXXXX is responsible for protecting the rights and welfare of research volunteers like you.',
    '**Voluntary Participation**',
    'Your participation is voluntary, which means you can choose whether or not to participate. You may choose not to participate by exiting the survey at any point. There are no known costs to you for participating in this research study except for your time.',
    '**Contact**',
    'Please feel free to contact us through Prolific or your game administrator if you have any questions, concerns, or complaints about this study.',
    'By checking the box below and proceeding, you are acknowledging that you are over the age of 18 and that you consent to participate.',
  ],
});

const TEXT_MEDIATED_INFO = [
  'In the last two rounds, your discussion will be joined by an AI Mediator. The style of the AI mediator will be different in each round.',
];

const TEXT_INSTRUCTIONS = [
  'Welcome! In this experiment, you will participate in three rounds of discussion and resource allocation for real-world charities. Your goal is to work with others to find the best allocation.',
  '**How consensus is determined.** After each discussion, you will be asked how to distribute resources among the three charities presented. Your allocation will be compared with that of your group members to determine how much consensus your group achieved. The closer your allocations are to each other, the higher your consensus score will be.',
  "**Your group's impact is tied to consensus.** At the end of the entire study, the total donation sum will be divided among all participating groups. The more consensus your group reaches, the more 'spending power' you will have. For example, a group that consistently reaches high agreement will allocate a much larger portion of the final donation pool than a group that consistently disagrees. Your main objective is to find common ground with your fellow participants to maximize your group's impact.",
  '**Compensation Reminder:** Your base participation payment is guaranteed and is separate from any donation outcomes.',
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
  if (config.includeMediator) stages.push(createMediatedDiscussionInfoStage());
  stages.push(createInstructionsStage());
  stages.push(createComprehensionStageNew());

  if (config.includeInitialParticipantSurvey)
    stages.push(createInitialParticipantSurveyStage());
  if (config.includeMediator) stages.push(createInitialMediatorSurveyStage());

  const debateRoundsCharities = [...CHARITY_BUNDLES].sort(
    () => 0.5 - Math.random(),
  );

  debateRoundsCharities.forEach((charityGroup, index) => {
    const roundNum = index + 1;
    const setting = `donations to: ${charityGroup.join(', ')}`;
    let mediatorForRound: string | undefined = undefined;

    if (config.includeMediator && index > 0) {
      mediatorForRound = `AI Mediator`;
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
  });

  if (config.includeDiscussionEvaluation)
    stages.push(createDiscussionEvaluationStage());
  if (config.includeMediator) stages.push(createFinalMediatorPreferenceStage());

  if (config.includeDebriefingAndFeedback) {
    stages.push(createDebriefingStage());
    stages.push(createExperimentFeedbackStage());
  }

  if (config.includeMetaFeedback) stages.push(createMetaFeedbackStage());

  return createExperimentTemplate({
    experiment: createExperimentConfig(stages, {
      metadata: CHARITY_DEBATE_METADATA,
    }),
    stageConfigs: stages,
    agentMediators: [],
    agentParticipants: [],
  });
}

function createRoundStartStage(roundNum: number): StageConfig {
  return createInfoStage({
    name: `Beginning of Round ${roundNum}`,
    infoLines: [`You are now beginning Round ${roundNum}.`],
  });
}

function createComprehensionStageNew(): StageConfig {
  return createComprehensionStage({
    name: 'Comprehension Check',
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
              text: 'By having the AI Mediator make the final decision.',
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
            'Imagine the total donation pool is split between two groups. Group A achieves a 95% consensus score, while Group B only achieves a 10% score. Which is a likely outcome?',
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
      createMultipleChoiceComprehensionQuestion(
        {
          questionTitle:
            'Consider three groups: **Group X** (votes are 90/10/0, 85/15/0, 95/5/0), **Group Y** (votes are 50/50/0, 60/40/0, 40/60/0), and **Group Z** (votes are 100/0/0, 0/100/0, 0/0/100). Please rank them from MOST spending power to LEAST.',
          options: [
            {id: 'a', text: 'X, then Y, then Z', imageId: ''},
            {id: 'b', text: 'Z, then Y, then X', imageId: ''},
            {id: 'c', text: 'Y, then X, then Z', imageId: ''},
            {id: 'd', text: 'They all get the same amount', imageId: ''},
          ],
        },
        'a',
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
    createTextSurveyQuestion({
      questionTitle:
        'Did you change your allocation after the discussion? If so, what was the most important factor that influenced your decision? (If not, please write NA)',
    }),
    createScaleSurveyQuestion({
      questionTitle:
        "Overall, I am satisfied with the outcome of this round's discussion.",
      ...LIKERT_SCALE_PROPS,
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
      questionTitle: 'I feel the final outcome was a fair compromise.',
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
          'The AI mediator was helpful in resolving these disagreements.',
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
  const charityStocks = charityGroup.map((charityName) =>
    createStock({
      name: charityName,
      description: `Details about **${charityName}** will be shown here.`,
    }),
  );

  return createMultiAssetAllocationStage({
    id,
    name,
    descriptions: createStageTextConfig({
      primaryText: `Please use the sliders below to allocate 100% of the funds among this round's charities.`,
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
      'Welcome! You will be assigned an anonymous identity for this study.',
  }),
});

function createMediatedDiscussionInfoStage(): StageConfig {
  return createInfoStage({
    name: 'Mediated-Discussion',
    infoLines: TEXT_MEDIATED_INFO,
  });
}

function createInstructionsStage(): StageConfig {
  return createInfoStage({
    name: 'Instructions: Overview',
    infoLines: TEXT_INSTRUCTIONS,
  });
}

function createInitialParticipantSurveyStage(): StageConfig {
  return createSurveyStage({
    name: 'Initial Participant Survey',
    descriptions: createStageTextConfig({
      primaryText:
        'Please indicate how much you agree or disagree with the following statements.',
    }),
    questions: [
      createScaleSurveyQuestion({
        questionTitle: 'I enjoy discussing controversial topics.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        questionTitle:
          'People feel comfortable discussing controversial topics with me.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        questionTitle: 'I feel comfortable disagreeing with other people.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        questionTitle: 'People feel comfortable disagreeing with me.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        questionTitle:
          'I try to make sure everyone agrees before making a decision.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        questionTitle: 'I prefer quick decisions even if not everyone agrees.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        questionTitle:
          'It is important to me how the charity allocations today are decided.',
        ...LIKERT_SCALE_PROPS,
      }),
    ],
  });
}

function createInitialMediatorSurveyStage(): StageConfig {
  return createSurveyStage({
    name: 'Initial Mediator Survey',
    descriptions: createStageTextConfig({
      primaryText:
        'During your conversations today, you may receive facilitation assistance from an AI. Please answer the following questions about your experience with AI assistants.',
    }),
    questions: [
      createScaleSurveyQuestion({
        questionTitle:
          'On a scale of 1 to 7, how familiar are you with AI assistants?',
        lowerValue: 1,
        upperValue: 7,
        lowerText: 'Not at all familiar',
        upperText: 'Extremely familiar',
      }),
      createTextSurveyQuestion({
        questionTitle:
          'What kind of work do you use AI assistants for? (If none, please write NA)',
      }),
      createScaleSurveyQuestion({
        questionTitle:
          'Conversations would benefit from the presence of a neutral AI mediator.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        questionTitle:
          'I believe an AI mediator could help keep a conversation on track.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        questionTitle:
          'A neutral AI mediator could make discussions more fair.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        questionTitle:
          'I am concerned about the privacy of my conversations with an AI mediator.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        questionTitle:
          'An AI mediator might misunderstand the nuances of human conversation.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        questionTitle:
          'An AI mediator might make the conversation feel less natural.',
        ...LIKERT_SCALE_PROPS,
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
      primaryText: `Please evaluate the AI mediator from the discussion you just completed.`,
    }),
    questions: [
      createScaleSurveyQuestion({
        questionTitle: `[Performance] I was satisfied with this mediator’s performance.`,
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        questionTitle: `[Performance] The mediator helped me feel like my perspective was heard.`,
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        questionTitle: `[Performance] The mediator helped our group reach a better outcome.`,
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        questionTitle: `[Performance] The mediator helped our group stay focused on the topic.`,
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        questionTitle: `[Performance] The mediator's suggestions were relevant and useful.`,
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        questionTitle: `[Performance] The mediator interrupted the conversation too often.`,
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        questionTitle: `[Fairness] The mediator seemed to favor one participant or viewpoint over others.`,
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
        questionTitle: 'I would include an AI mediator in future discussions.',
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
          'Please describe your overall interaction with the other participants. (If not applicable, please write NA)',
      }),
      createTextSurveyQuestion({
        questionTitle:
          'If you interacted with a proctor or experiment administrator, please describe the experience. (If not applicable, please write NA)',
      }),
      createTextSurveyQuestion({
        questionTitle:
          'Do you have any other feedback or concerns about your experience in this study? (If not applicable, please write NA)',
      }),
      createTextSurveyQuestion({
        questionTitle:
          'Did you experience any harmful / offensive behavior, from participants or the mediator? (If not applicable, please write NA). \nYou may also reach out directly to the proctors, (aarontp@google.com) / (cjqian@google.com)',
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
