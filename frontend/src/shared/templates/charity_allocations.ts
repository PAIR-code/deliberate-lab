import {
  createChatStage,
  createExperimentConfig,
  createExperimentTemplate,
  createMetadataConfig,
  createProfileStage,
  createSurveyStage,
  createSurveyPerParticipantStage,
  createMultipleChoiceSurveyQuestion,
  createTextSurveyQuestion,
  createScaleSurveyQuestion,
  createStageTextConfig,
  ExperimentTemplate,
  ProfileType,
  StageConfig,
  ScaleSurveyQuestion,
} from '@deliberation-lab/utils';

export interface CharityDebateConfig {
  includeTos: boolean;
  includeViewProfile: boolean;
  includeMediator: boolean;
  includeInitialParticipantSurvey: boolean;
  includePostDiscussionSurvey: boolean;
  includeDiscussionEvaluation: boolean;
  includePeerEvaluation: boolean;
  includeMetaFeedback: boolean;
}

export const CHARITY_DEBATE_METADATA = createMetadataConfig({
  name: 'Mediated Charity Debate (3 Rounds)',
  publicName: 'Charity Allocation Debate',
  description:
    'A multi-round debate where participants discuss and vote on how to allocate a budget among several real-world charities, with different AI mediators in each round.',
});

export const CHARITIES = [
  'IFAW (Animal Welfare)',
  'Wildaid (Animal Welfare)',
  'Clean Oceans',
  'Sudan Aid',
  'Eye Care in India',
  'Wheelchairs for Children',
  'Rainforest Action',
  "Middle East Children's Alliance",
  'Global Housing for Orphans',
  'Global Fund for Women',
];

// ✨ ADDED: Standardized 1-7 scale properties for consistency
const LIKERT_SCALE_PROPS = {
  lowerValue: 1,
  upperValue: 7,
  lowerText: 'Strongly Disagree',
  upperText: 'Strongly Agree',
};

export function getCharityDebateTemplate(
  config: CharityDebateConfig,
): ExperimentTemplate {
  const stages: StageConfig[] = [];

  if (config.includeTos) stages.push(createTermsOfServiceStage());
  stages.push(SET_PROFILE_STAGE_EXPANDED);
  if (config.includeViewProfile) stages.push(createViewProfileStage());
  if (config.includeMediator) stages.push(createMediatedDiscussionInfoStage());
  stages.push(createInstructionsStage());
  if (config.includeInitialParticipantSurvey)
    stages.push(createInitialParticipantSurveyStage());
  if (config.includeMediator) stages.push(createInitialMediatorSurveyStage());

  const shuffledCharities = [...CHARITIES].sort(() => 0.5 - Math.random());

  const debateRoundsCharities = [
    shuffledCharities.slice(0, 3),
    shuffledCharities.slice(3, 6),
    shuffledCharities.slice(6, 9),
  ];

  debateRoundsCharities.forEach((charityGroup, index) => {
    const roundNum = index + 1;
    const setting = `donations to: ${charityGroup.join(', ')}`;

    let mediatorForRound: string | undefined = undefined;
    if (config.includeMediator && index > 0) {
      mediatorForRound = `AI Mediator (Style ${index})`;
    }

    // 1. Pre-discussion allocation vote
    stages.push(
      createAllocationSurveyStage(
        `vote-round-${roundNum}-pre`,
        `Allocation (Pre-Discussion): Round ${roundNum}`,
        charityGroup,
      ),
    );

    // 2. Discussion stage
    stages.push(
      createAllocationDiscussionStage(
        `discussion-round-${roundNum}`,
        `Discussion: Round ${roundNum}`,
        setting,
        mediatorForRound,
      ),
    );

    // 4. Post-discussion allocation vote
    stages.push(
      createAllocationSurveyStage(
        `vote-round-${roundNum}-post`,
        `Allocation (Post-Discussion): Round ${roundNum}`,
        charityGroup,
      ),
    );

    // 3. Mediator evaluation (if applicable)
    if (mediatorForRound) {
      stages.push(createPerMediatorEvaluationStage(roundNum));
    }

    // 5. End of round marker
    stages.push(
      createSurveyStage({
        id: `end-round-${roundNum}`,
        name: `End of Round ${roundNum}`,
        descriptions: createStageTextConfig({
          primaryText: `This marks the end of round ${roundNum}`,
        }),
        questions: [],
      }),
    );
  });

  if (config.includePostDiscussionSurvey)
    stages.push(createPostDiscussionSurveyStage());
  if (config.includeDiscussionEvaluation)
    stages.push(createDiscussionEvaluationStage());
  if (config.includePeerEvaluation) stages.push(createPeerEvaluationStage());
  if (config.includeMediator) stages.push(createFinalMediatorPreferenceStage());
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

// ****************************************************************************
// STAGE FACTORIES
// ****************************************************************************

/**
 * Creates a survey stage with sliders for allocating funds to a group of charities.
 *  untouched per request
 */
function createAllocationSurveyStage(
  id: string,
  name: string,
  charityGroup: string[],
): StageConfig {
  const allocationQuestions: ScaleSurveyQuestion[] = charityGroup.map(
    (charityName) =>
      createScaleSurveyQuestion({
        id: `${id}-${charityName.replace(/[^a-zA-Z0-9]/g, '-')}`,
        questionTitle: `Allocation for: ${charityName}`,
        useSlider: true,
        lowerValue: 0,
        upperValue: 100,
        lowerText: '0%',
        upperText: '100%',
      }),
  );

  return createSurveyStage({
    id: id,
    name: name,
    descriptions: createStageTextConfig({
      primaryText: `Please use the sliders below to indicate how you would allocate 100% of the funds among this round's charities.`,
      infoText: `Please ensure your chosen percentages for **${charityGroup.join(', ')}** add up to 100%. **Note: The system will not automatically enforce this sum.**`,
    }),
    questions: allocationQuestions,
  });
}

function createTermsOfServiceStage(): StageConfig {
  const tosText = `Thank you for your interest in this research. If you choose to participate, you will be asked to participate in debates about resource allocation and/or potentially sensitive topics.\n\nCompensation\nYou will be paid a base amount for playing the games and completing the survey. \nAdditionally, the resources you will be allocating in this experiment are real-world charities. Your final selection for where money should be spent will translate to real allocations of a fraction of a sum ($XXXX) towards the charities you vote for. For example, if there are 1000 participants in this experiment, and 200 of them vote for Charity X, Charity X will receive 20% of the $XXXX total sum.\n\nIRB\nThe results of this study will be used solely for research purposes. Our team will keep all your information from this study strictly confidential, as required by law. The IRB at the XXXXXX is responsible for protecting the rights and welfare of research volunteers like you.\n\nVoluntary participation\nYour participation is voluntary, which means you can choose whether or not to participate. You may choose not to participate by exiting the survey at any point. There are no known costs to you for participating in this research study except for your time.\n\nContact\nPlease feel free to contact us through Prolific or your game administrator if you have any questions, concerns, or complaints about this study.\n\nBy checking the box below and proceeding, you are acknowledging that you are over the age of 18 and that you consent to participate. Clicking the arrow will bring you to the beginning of the task.`;
  return createSurveyStage({
    id: 'terms-of-service',
    name: 'Terms of Service',
    descriptions: createStageTextConfig({primaryText: tosText}),
    questions: [
      createMultipleChoiceSurveyQuestion({
        id: 'accept-tos',
        questionTitle: 'Consent',
        options: [
          {id: 'accept', text: 'I accept the Terms of Service', imageId: ''},
        ],
      }),
    ],
  });
}

const SET_PROFILE_STAGE_EXPANDED = createProfileStage({
  id: 'profile-stage',
  name: 'Set profile',
  profileType: ProfileType.ANONYMOUS_ANIMAL,
  descriptions: createStageTextConfig({
    primaryText:
      'Welcome! You will be assigned an anonymous identity for this study.',
  }),
});

function createViewProfileStage(): StageConfig {
  const viewProfileText = `This identity is how other players will see you during today's experiment.\n\nYou will be playing as this randomly generated identity: [avatar and identity name]\n\nAvoid referring to yourself with identifiers outside of this assigned identity.`;
  return createSurveyStage({
    id: 'view-profile',
    name: 'View Randomly Assigned Profile',
    descriptions: createStageTextConfig({primaryText: viewProfileText}),
    questions: [],
  });
}

function createMediatedDiscussionInfoStage(): StageConfig {
  const mediatedText = `You will be having a discussion with other participants. However, in addition to the participants will be an AI “Mediator” which may interject during your conversations.\n\nThis mediator will try to help facilitate the discussion to help you and the other participants reach common ground. You will be asked questions before and after the experiment about your perception of this mediator.`;
  return createSurveyStage({
    id: 'mediated-info',
    name: 'Mediated-Discussion',
    descriptions: createStageTextConfig({primaryText: mediatedText}),
    questions: [],
  });
}

function createInstructionsStage(): StageConfig {
  const instructionsText = `In this experiment, you will be engaged in a discussion around the ideal allocation of resources with other participants. You will be debating the allocation of resources in various settings. Before and after the discussion, you will be asked preliminary questions, as well as your vote for the allocation of resources.\n\nIncentives\nThe resources you will be allocating in this experiment are real-world charities. Your final selection for where money should be spent will translate to real allocations of a fraction of a sum ($XXXX) towards the charities you vote for. For example, if there are 1000 participants in this experiment, and 200 of them vote for Charity X, Charity X will receive 20% of the $XXXX total sum.`;
  return createSurveyStage({
    id: 'instructions-overview',
    name: 'Instructions: Overview',
    descriptions: createStageTextConfig({primaryText: instructionsText}),
    questions: [],
  });
}

function createInitialParticipantSurveyStage(): StageConfig {
  return createSurveyStage({
    id: 'initial-participant-survey',
    name: 'Initial Participant Survey',
    descriptions: createStageTextConfig({
      primaryText: 'Please answer the following questions about yourself.',
    }),
    questions: [
      createScaleSurveyQuestion({
        id: 'enjoy-controversial',
        questionTitle: 'I enjoy discussing controversial topics',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        id: 'comfortable-discussing',
        questionTitle:
          'People feel comfortable discussing controversial topics with me.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        id: 'comfortable-disagreeing-with-me',
        questionTitle: 'People feel comfortable disagreeing with me.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        id: 'comfortable-disagreeing-with-others',
        questionTitle: 'I feel comfortable disagreeing with other people.',
        ...LIKERT_SCALE_PROPS,
      }),
    ],
  });
}

function createInitialMediatorSurveyStage(): StageConfig {
  return createSurveyStage({
    id: 'initial-mediator-survey',
    name: 'Initial Mediator Survey',
    descriptions: createStageTextConfig({
      primaryText: 'Background on AI assistants',
    }),
    questions: [
      createScaleSurveyQuestion({
        id: 'ai-familiarity',
        questionTitle:
          'On a scale of 1 to 7, how familiar are you with AI assistants?',
        lowerValue: 1,
        upperValue: 7,
        lowerText: 'Not at all familiar',
        upperText: 'Extremely familiar',
      }),
      createTextSurveyQuestion({
        id: 'ai-app-usage',
        questionTitle: 'What kind of work do you use AI assistants for?',
      }),
      createTextSurveyQuestion({
        id: 'ai-use-case',
        questionTitle:
          'What use case would you like to see an AI assistant for?',
      }),
      createScaleSurveyQuestion({
        id: 'ai-comfort',
        questionTitle:
          'On a scale of 1 to 7, how comfortable are you interacting with AI assistants?',
        lowerValue: 1,
        upperValue: 7,
        lowerText: 'Not at all comfortable',
        upperText: 'Extremely comfortable',
      }),
      createScaleSurveyQuestion({
        id: 'ai-benefit',
        questionTitle:
          'Conversations would benefit from the presence of a neutral AI mediator.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        id: 'ai-pre-on-track',
        questionTitle:
          'I believe an AI mediator could help keep a conversation on track.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        id: 'ai-pre-common-ground',
        questionTitle: 'An AI mediator might help people find common ground.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        id: 'ai-pre-fairness',
        questionTitle: 'An AI mediator could make discussions more fair.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        id: 'ai-pre-privacy',
        questionTitle:
          'I am concerned about the privacy of my conversations with an AI mediator.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        id: 'ai-pre-misunderstand',
        questionTitle:
          'An AI mediator might misunderstand the nuances of human conversation.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        id: 'ai-pre-unnatural',
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
  const stageId = `mediator-eval-round-${roundNum}`;
  return createSurveyStage({
    id: stageId,
    name: `Mediator Evaluation: Round ${roundNum}`,
    descriptions: createStageTextConfig({
      primaryText: `Please evaluate the AI mediator from the discussion you just completed.`,
    }),
    questions: [
      createScaleSurveyQuestion({
        id: `${stageId}-satisfied`,
        questionTitle: `[Performance] I was satisfied with this mediator’s performance.`,
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        id: `${stageId}-surprised`,
        questionTitle: `[Performance] I was surprised by this mediator’s intent, action, or outputs.`,
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        id: `${stageId}-helpful`,
        questionTitle: `[Performance] This mediator was helpful.`,
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        id: `${stageId}-obtrusive`,
        questionTitle: `[Performance] This mediator was obtrusive and annoying.`,
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        id: `${stageId}-trust`,
        questionTitle: `[Trust] I can trust this mediator’s output.`,
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        id: `${stageId}-focused`,
        questionTitle: `[Performance] The mediator helped our group stay focused on the topic.`,
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        id: `${stageId}-relevant`,
        questionTitle: `[Performance] The mediator's suggestions were relevant and useful.`,
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        id: `${stageId}-interrupted`,
        questionTitle: `[Performance] The mediator interrupted the conversation too often.`,
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        id: `${stageId}-generic`,
        questionTitle: `[Performance] The mediator's contributions felt generic and unhelpful.`,
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        id: `${stageId}-favored`,
        questionTitle: `[Fairness] The mediator seemed to favor one participant or viewpoint over others.`,
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        id: `${stageId}-confused`,
        questionTitle: `[Clarity] I was confused by what the mediator was trying to do.`,
        ...LIKERT_SCALE_PROPS,
      }),
    ],
  });
}

function createPostDiscussionSurveyStage(): StageConfig {
  return createSurveyPerParticipantStage({
    id: 'post-discussion-survey',
    name: 'Post-Discussion Survey',
    descriptions: createStageTextConfig({
      primaryText:
        'Please evaluate your discussion interactions with each participant.',
    }),
    enableSelfSurvey: false,
    questions: [
      createScaleSurveyQuestion({
        id: 'enjoyed-discussion',
        questionTitle: 'I enjoyed the discussion with this participant.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        id: 'felt-comfortable',
        questionTitle:
          'I felt comfortable discussing the topics with this participant.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        id: 'other-comfortable-disagreeing',
        questionTitle:
          'I think this participant felt comfortable disagreeing with me.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        id: 'felt-comfortable-disagreeing',
        questionTitle: 'I felt comfortable disagreeing with this participant.',
        ...LIKERT_SCALE_PROPS,
      }),
    ],
  });
}

function createDiscussionEvaluationStage(): StageConfig {
  return createSurveyStage({
    id: 'discussion-evaluation',
    name: 'Discussion Evaluation',
    descriptions: createStageTextConfig({
      primaryText: 'Please reflect on the content of the discussions.',
    }),
    questions: [
      createTextSurveyQuestion({
        id: 'salient-points-self',
        questionTitle:
          'Select the N most salient points you made in the discussion',
      }),
      createTextSurveyQuestion({
        id: 'salient-points-others',
        questionTitle:
          'Select the N most salient points other participants made in the discussion',
      }),
      createTextSurveyQuestion({
        id: 'unproductive-points',
        questionTitle:
          'Select the N least productive points made in the discussion',
      }),
    ],
  });
}

function createPeerEvaluationStage(): StageConfig {
  return createSurveyPerParticipantStage({
    id: 'peer-evaluation',
    name: 'Peer Evaluation',
    descriptions: createStageTextConfig({
      primaryText: 'Please answer some questions about the other participants.',
    }),
    enableSelfSurvey: false,
    questions: [
      createMultipleChoiceSurveyQuestion({
        id: 'is-human',
        questionTitle: 'Do you believe this participant was a human?',
        options: [
          {id: 'yes', text: 'Yes', imageId: ''},
          {id: 'no', text: 'No, I think it was a bot', imageId: ''},
        ],
      }),
      createTextSurveyQuestion({
        id: 'peer-feedback-optional',
        questionTitle:
          'Do you have any other feedback for this participant? (Optional)',
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
    id: 'mediator-final-preference',
    name: 'Final Mediator Preference',
    descriptions: createStageTextConfig({
      primaryText:
        'Reflecting on all the discussions you participated in, please answer the following.',
    }),
    questions: [
      createMultipleChoiceSurveyQuestion({
        id: 'mediator-preference',
        questionTitle:
          'If you were to engage in another debate, which mediator style would you prefer?',
        options: [
          {id: 'none', text: 'None', imageId: ''},
          ...preferenceOptions,
        ],
      }),
      createTextSurveyQuestion({
        id: 'mediator-reason',
        questionTitle: 'Please justify your selection:',
      }),
      createScaleSurveyQuestion({
        id: 'ai-post-on-track',
        questionTitle:
          'I believe an AI mediator could help keep a conversation on track.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        id: 'ai-post-common-ground',
        questionTitle: 'An AI mediator might help people find common ground.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        id: 'ai-post-fairness',
        questionTitle: 'An AI mediator could make discussions more fair.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        id: 'ai-post-privacy',
        questionTitle:
          'I am concerned about the privacy of my conversations with an AI mediator.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        id: 'ai-post-misunderstand',
        questionTitle:
          'An AI mediator might misunderstand the nuances of human conversation.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        id: 'ai-post-unnatural',
        questionTitle:
          'An AI mediator might make the conversation feel less natural.',
        ...LIKERT_SCALE_PROPS,
      }),
      createScaleSurveyQuestion({
        id: 'ai-include-future-final',
        questionTitle: 'I would include an AI mediator in future discussions.',
        ...LIKERT_SCALE_PROPS,
      }),
    ],
  });
}

function createMetaFeedbackStage(): StageConfig {
  return createSurveyStage({
    id: 'meta-feedback',
    name: 'Meta-feedback',
    descriptions: createStageTextConfig({
      primaryText:
        'Thank you for completing the experiment. We would appreciate your optional feedback on the study itself.',
    }),
    questions: [
      createTextSurveyQuestion({
        id: 'feedback-design',
        questionTitle:
          'What, if any, feedback do you have around the design of the experiment?',
      }),
      createTextSurveyQuestion({
        id: 'feedback-instructions',
        questionTitle:
          'What stages, if any, had unclear or poorly-defined instructions?',
      }),
      createTextSurveyQuestion({
        id: 'feedback-improvements',
        questionTitle:
          'What could be added to strengthen the coherence or value of these experiments?',
      }),
      createTextSurveyQuestion({
        id: 'feedback-bugs',
        questionTitle:
          'Did you experience any apparent bugs during any portion of the experiment?',
      }),
    ],
  });
}
