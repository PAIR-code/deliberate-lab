import {
  createAgentChatSettings,
  createAgentMediatorPersonaConfig,
  createChatPromptConfig,
  createPrivateChatStage,
  createCheckSurveyQuestion,
  createExperimentConfig,
  createExperimentTemplate,
  createFlipCardStage,
  createFlipCard,
  createInfoStage,
  createMetadataConfig,
  createMultipleChoiceSurveyQuestion,
  createMultipleChoiceItem,
  createParticipantProfileBase,
  createProfileStage,
  createScaleSurveyQuestion,
  createStageProgressConfig,
  createStageTextConfig,
  createSurveyStage,
  createTOSStage,
  AgentMediatorTemplate,
  ConditionOperator,
  ComparisonOperator,
  createConditionGroup,
  createComparisonCondition,
  ExperimentTemplate,
  MediatorPromptConfig,
  ProfileType,
  StageConfig,
  SeedStrategy,
  createTextSurveyQuestion,
  PromptItem,
  PromptItemType,
  PromptItemGroup,
  ShuffleConfig,
  FlipCard,
  MultipleChoiceItem,
  StageContextPromptItem,
} from '@deliberation-lab/utils';

type Policy = {
  name: string;
  policy: string;
  petition_pro: string;
  petition_con: string;
  arguments_pro: Argument[];
  arguments_con: Argument[];
  nonprofit_pro: string;
  nonprofit_con: string;
};

type Argument = {
  title: string;
  text: string;
};

const EXAMPLE_POLICY: Policy = {
  name: 'Lamps',
  policy:
    'The government should switch all the street lamps back to sodium-vapor.',
  petition_pro:
    'We, the undersigned, support the use of sodium-vapor lamps in our city, despite the costs.',
  petition_con:
    'We, the undersigned, oppose the use of sodium-vapor lamps in our city.',
  nonprofit_pro:
    'The Organization for Beauitful Cities is dedicated to ensuring our cities remain beautiful.',
  nonprofit_con:
    'The Organization for Bright Lights is dedicated to ensuring our cities remain brightly-lit.',
  arguments_pro: [
    {title: 'Beauty', text: 'Sodium lamps are beautiful.'},
    {title: 'Happiness', text: 'Sodium lamps make me happy.'},
    {
      title: 'Character',
      text: 'Sodium lamps give the neighborhood its historic character.',
    },
    {title: 'LEDs stressful', text: 'LED lamps cause stress.'},
    {title: 'LEDs ugly', text: 'LED lamps are ugly.'},
    {title: 'LEDs disturb sleep', text: 'LED lamps disturb sleep patterns.'},
  ],
  arguments_con: [
    {
      title: 'Energy efficiency',
      text: 'Sodium lamps are not energy-efficient.',
    },
    {
      title: 'Maintenance',
      text: 'Sodium lamps are expensive to build and maintain.',
    },
    {
      title: 'Reliability',
      text: 'Sodium lamps are not as reliable as LED lamps.',
    },
    {
      title: 'Driver safety',
      text: 'Sodium lamps do not keep drivers alert on the road.',
    },
    {
      title: 'Durability',
      text: 'LED lamps last much longer than sodium lamps.',
    },
    {title: 'Costs', text: 'LED lamps cost less than sodium lamps.'},
  ],
};

const NO_SHUFFLE: ShuffleConfig = {
  shuffle: false,
  seed: SeedStrategy.PARTICIPANT,
  customSeed: '',
};
const PARTICIPANT_SHUFFLE: ShuffleConfig = {
  shuffle: true,
  seed: SeedStrategy.PARTICIPANT,
  customSeed: '',
};

// ****************************************************************************
// Experiment config
// ****************************************************************************
export function getPolicyExperimentTemplate(): ExperimentTemplate {
  const stageConfigs = getPolicyStageConfigs();
  return createExperimentTemplate({
    experiment: createExperimentConfig(stageConfigs, {
      metadata: POLICY_METADATA,
    }),
    stageConfigs,
    agentMediators: POLICY_MEDIATOR_AGENTS,
  });
}

export const POLICY_METADATA = createMetadataConfig({
  name: 'Policy Discussion',
  publicName: 'Policy Discussion Study',
  description:
    'A study where participants indicate their support for a policy and chat with an AI Chatbot',
});

const POLICY_CHAT_STAGE_ID = 'policy_chat';

function getPolicyStageConfigs(): StageConfig[] {
  const stages: StageConfig[] = [];

  stages.push(POLICY_INFO_STAGE);
  stages.push(POLICY_PROFILE_STAGE);
  stages.push(POLICY_BACKGROUND_SURVEY_STAGE);
  stages.push(POLICY_INITIAL_SURVEY_STAGE);
  stages.push(POLICY_CHAT_INSTRUCTIONS_STAGE);
  stages.push(POLICY_CHAT_STAGE);
  stages.push(POLICY_FLIPCARD_STAGE);
  stages.push(POLICY_FINAL_SURVEY_STAGE);
  stages.push(POLICY_ADDITIONAL_SUPPORT_STAGE);
  stages.push(POLICY_DONATION_STAGE);
  stages.push(AI_LITERACY_SUREY_STAGE);
  stages.push(ATTITUDES_SURVEY_STAGE);
  stages.push(POLICY_OUTRO_STAGE);
  stages.push(POLICY_END_STAGE);

  return stages;
}

// ****************************************************************************
// Stage definitions
// ****************************************************************************

const DEFAULT_STAGE_PROGRESS_CONFIG = createStageProgressConfig({
  minParticipants: 1,
  waitForAllParticipants: false,
  showParticipantProgress: false,
});

const POLICY_PROFILE_STAGE = createProfileStage({
  id: 'policy_profile',
  name: 'Your identity',
  progress: DEFAULT_STAGE_PROGRESS_CONFIG,
  descriptions: createStageTextConfig({
    primaryText:
      "This is how you'll be identified during the study. Click 'Next stage' below to continue.",
  }),
  profileType: ProfileType.ANONYMOUS_PARTICIPANT,
});

const POLICY_INFO_TEXT = `
# Welcome to the study!

We are researching how people make decisions about important public policies. This project is a collaboration with non-profits focused on civic engagement.

### Your Task:

* You will learn about a real policy that has been proposed for national adoption and is currently being debated by representatives.
* Afterward, you will indicate how much you oppose or support the policy.

### Real-World Impact:

* At the end of the study, you can choose to anonymously sign a petition expressing your support or opposition. 
* In partnership with our non-profit collaborators, these petitions will be delivered directly to the city councils debating this issue.

### Optional Donation:
* You will also have the opportunity to donate a portion of your guaranteed study bonus ($3.00) to a non-profit working on this cause.

To inform your decision, you'll first interact with a chatbot to learn more about the policy.
Then, you'll review informed opinions on the policy by flipping over flash-cards that are sourced from the top 10 Google Search results.

To inform your decision, you'll first review informed opinions on the policy by flipping over flash-cards that are sourced from the top 10 Google Search results.
Then, you'll interact with a chatbot to learn more about the policy. 

The entire process should take approximately 30-45 minutes.

Your responses will be kept confidential and used for research purposes only.
`;

const POLICY_INFO_STAGE = createInfoStage({
  id: 'policy_info',
  name: 'Introduction',
  progress: DEFAULT_STAGE_PROGRESS_CONFIG,
  infoLines: [POLICY_INFO_TEXT],
});

const POLICY_BACKGROUND_SURVEY_STAGE = createSurveyStage({
  id: 'policy_background_survey',
  name: 'Your background',
  progress: DEFAULT_STAGE_PROGRESS_CONFIG,
  descriptions: createStageTextConfig({
    primaryText:
      "Before you begin the task, we'd like to ask you a few quick questions.",
  }),
  questions: [
    createScaleSurveyQuestion({
      id: 'policy_interest_in_politics',
      questionTitle: 'How much interest do you have in politics?',
      lowerText: 'No interest at all',
      upperText: 'A lot of interest',
      lowerValue: 1,
      upperValue: 5,
    }),
  ],
});

const POLICY_INITIAL_SURVEY_STAGE = createSurveyStage({
  id: 'policy_initial_survey',
  name: 'Initial Assessment',
  progress: DEFAULT_STAGE_PROGRESS_CONFIG,
  descriptions: createStageTextConfig({
    primaryText: `
# Indicate your support of the policy

## You will need to indicate your support or opposition to the following policy:
# ${EXAMPLE_POLICY.policy}

Before you learn more about the opinions about this policy, we would like to understand your current position on this issue. 

Please use the slider below to express your support or opposition for this policy.

If you place the slider at 50, this indicates that you are equally as willing to support the policy as you are to oppose the policy. 
`,
  }),
  questions: [
    createScaleSurveyQuestion({
      id: 'policy_support_initial',
      questionTitle: 'How much do you support or oppose this policy?',
      lowerText: 'Strongly oppose',
      middleText: 'Neutral',
      upperText: 'Strongly support',
      lowerValue: 0,
      upperValue: 100,
      stepSize: 5,
      useSlider: true,
    }),
    createScaleSurveyQuestion({
      id: 'policy_confidence_initial',
      questionTitle: 'How certain are you about this position?',
      lowerText: 'Not confident at all',
      upperText: 'Very confident',
      lowerValue: 0,
      upperValue: 100,
      stepSize: 5,
      useSlider: true,
    }),
    createScaleSurveyQuestion({
      id: 'policy_importance_initial',
      questionTitle: 'How important is this issue to you personally?',
      lowerText: 'Not important to me at all',
      upperText: 'Very important to me',
      lowerValue: 0,
      upperValue: 100,
      stepSize: 5,
      useSlider: true,
    }),
  ],
});

const POLICY_CHAT_INSTRUCTIONS_TEXT = `
# Learn more with chatbot

You will now have a chance to learn more about the policy before making a final decision.

To learn more about the policy, you can use the chatbot.
This chatbot has been trained on relevant information to help you learn more about the policy. 

While we suggest starting with a broad, open-ended question, feel free to explore the topic in any way you like.
You can go deeper into specific points the chatbot makes, express disagreement, or request additional evidence and information.

You are welcome to interact with the chatbot for as long as you wish.
However, you must complete a minimum of five exchanges — five messages from you and five responses from the chatbot — before you can move on. 

Once you have completed these five exchanges, the "Continue" button will become available.
`;

const POLICY_CHAT_INSTRUCTIONS_STAGE = createInfoStage({
  id: 'policy_chat_instructions',
  name: 'Task Instructions',
  progress: DEFAULT_STAGE_PROGRESS_CONFIG,
  infoLines: [POLICY_CHAT_INSTRUCTIONS_TEXT],
});

const POLICY_CHAT_STAGE = createPrivateChatStage({
  id: POLICY_CHAT_STAGE_ID,
  name: 'Policy Discussion with Chatbot',
  progress: DEFAULT_STAGE_PROGRESS_CONFIG,
  isTurnBasedChat: true,
  //minNumberOfTurns: 5,
  descriptions: createStageTextConfig({
    primaryText:
      'To learn more about the policy, you can use the chatbot. Once you have completed five exchanges, the "Continue" button will become available.',
    infoText: `
# Learn more with chatbot

You will now have a chance to learn more about the policy before making a final decision.

To learn more about the policy, you can use the chatbot.
This chatbot has been trained on relevant information to help you learn more about the policy. 

While we suggest starting with a broad, open-ended question, feel free to explore the topic in any way you like.
You can go deeper into specific points the chatbot makes, express disagreement, or request additional evidence and information.

You are welcome to interact with the chatbot for as long as you wish.
However, you must complete a minimum of five exchanges — five messages from you and five responses from the chatbot — before you can move on. 

Once you have completed these five exchanges, the "Continue" button will become available.
`,
  }),
});

function argumentToFlipcard(title: string, argument: Argument): FlipCard {
  return createFlipCard({
    title: title,
    frontContent: `## ${argument.title}`,
    backContent: argument.text,
  });
}

const POLICY_FLIPCARD_STAGE = createFlipCardStage({
  id: 'policy_flipcard',
  name: 'Google Searches',
  descriptions: createStageTextConfig({
    primaryText:
      'To learn more about policy, you can explore information about the policy from the top 10 Google Search results. Each flashcard has information on the policy from a different source. You can click on a flash-card to flip it over.\n\nYou must flip over all flashcards in order to move to the next step.',
    infoText:
      'You must flip over all flashcards in order to move to the next step.',
  }),
  cards: [
    ...EXAMPLE_POLICY.arguments_pro.map((argument) =>
      argumentToFlipcard('For', argument),
    ),
    ...EXAMPLE_POLICY.arguments_con.map((argument) =>
      argumentToFlipcard('Against', argument),
    ),
  ],
  enableSelection: false,
  allowMultipleSelections: false,
  requireConfirmation: false,
  minUniqueCardsFlippedRequirement: 6,
  shuffleCards: true,
});

const POLICY_FINAL_SURVEY_STAGE = createSurveyStage({
  id: 'policy_final_survey',
  name: 'Policy Decision',
  progress: DEFAULT_STAGE_PROGRESS_CONFIG,
  descriptions: createStageTextConfig({
    primaryText: `
Now that you have learned more about the policy, please register your opposition or support for this policy.
**As before, you can click and adjust the slider to indicate your willingness to support or oppose the policy.**
`,
  }),
  questions: [
    createScaleSurveyQuestion({
      id: 'policy_support_final',
      questionTitle: 'How much do you support or oppose this policy?',
      lowerText: 'Strongly oppose',
      middleText: 'Neutral',
      upperText: 'Strongly support',
      lowerValue: 0,
      upperValue: 100,
      stepSize: 5,
      useSlider: true,
    }),
  ],
});

const finalPreferenceSupportCondition = createConditionGroup(
  ConditionOperator.AND,
  [
    createComparisonCondition(
      {
        stageId: POLICY_FINAL_SURVEY_STAGE.id,
        questionId: 'policy_support_final',
      },
      ComparisonOperator.GREATER_THAN,
      50,
    ),
  ],
);

const finalPreferenceOpposeCondition = createConditionGroup(
  ConditionOperator.AND,
  [
    createComparisonCondition(
      {
        stageId: POLICY_FINAL_SURVEY_STAGE.id,
        questionId: 'policy_support_final',
      },
      ComparisonOperator.LESS_THAN,
      50,
    ),
  ],
);

const finalPreferenceNeutralCondition = createConditionGroup(
  ConditionOperator.AND,
  [
    createComparisonCondition(
      {
        stageId: POLICY_FINAL_SURVEY_STAGE.id,
        questionId: 'policy_support_final',
      },
      ComparisonOperator.EQUALS,
      50,
    ),
  ],
);

const POLICY_ADDITIONAL_SUPPORT_STAGE = createSurveyStage({
  id: 'policy_additional_support',
  name: 'Additional Support',
  progress: DEFAULT_STAGE_PROGRESS_CONFIG,
  descriptions: createStageTextConfig({
    primaryText: `
Thank you for taking the time to learn about this policy and sharing your views.

This policy was chosen because it's currently under consideration for national adoption.
We're partnering with civic engagement nonprofits to help representatives better understand and represent what the public thinks about this issue in their debates.

With that in mind, we'd like to send representatives a short petition reflecting where people stand on the issue.

## If you indicate that you are interested in signing the petition, we will send you a link to the petitions platform via a Prolific message after you complete this study. It will take you up to 5 minutes to sign the petition. Your vote will be recorded anonymously. This ensures your voice is heard in the national debate without identifying you.
`,
  }),
});

const petition_text =
  'Are you interested in adding your anonymous vote to the petition?';
const petitionOptions = [
  createMultipleChoiceItem({
    id: 'policy_signatory_yes',
    text: "Yes, I'm interested in adding my anonymous vote to the petition.",
  }),
  createMultipleChoiceItem({
    id: 'policy_signatory_no',
    text: 'No, I am not interested in adding my anonymous vote to the petition.',
  }),
];

const policySignatorySupportQuestion = createMultipleChoiceSurveyQuestion({
  id: 'policy_signatory_support',
  questionTitle: `${EXAMPLE_POLICY.petition_pro}\n${petition_text}`,
  options: petitionOptions,
  condition: finalPreferenceSupportCondition,
});
const policySignatoryOpposeQuestion = createMultipleChoiceSurveyQuestion({
  id: 'policy_signatory_oppose',
  questionTitle: `${EXAMPLE_POLICY.petition_con}\n${petition_text}`,
  options: petitionOptions,
  condition: finalPreferenceOpposeCondition,
});

const signPetitionCondition = createConditionGroup(ConditionOperator.OR, [
  createComparisonCondition(
    {
      stageId: POLICY_ADDITIONAL_SUPPORT_STAGE.id,
      questionId: 'policy_signatory_support',
    },
    ComparisonOperator.EQUALS,
    'policy_signatory_yes',
  ),
  createComparisonCondition(
    {
      stageId: POLICY_ADDITIONAL_SUPPORT_STAGE.id,
      questionId: 'policy_signatory_oppose',
    },
    ComparisonOperator.EQUALS,
    'policy_signatory_yes',
  ),
]);

const policySignatoryStatementQuestion = createCheckSurveyQuestion({
  id: 'policy_signatory_statement',
  questionTitle:
    'I feel strongly about my vote and would like to add an anonymous statement to support my position.',
  condition: signPetitionCondition,
});

const anonymousStatementCondition = createConditionGroup(
  ConditionOperator.AND,
  [
    signPetitionCondition,
    createComparisonCondition(
      {
        stageId: POLICY_ADDITIONAL_SUPPORT_STAGE.id,
        questionId: 'policy_signatory_statement',
      },
      ComparisonOperator.EQUALS,
      true,
    ),
  ],
);

const policySignatoryStatementTextQuestion = createTextSurveyQuestion({
  id: 'policy_signatory_statement_text',
  questionTitle: 'My anonymous statement of support:',
  condition: anonymousStatementCondition,
  minCharCount: 20,
  maxCharCount: 500,
});

POLICY_ADDITIONAL_SUPPORT_STAGE.questions = [
  policySignatorySupportQuestion,
  policySignatoryOpposeQuestion,
  policySignatoryStatementQuestion,
  policySignatoryStatementTextQuestion,
];

const POLICY_DONATION_STAGE = createSurveyStage({
  id: 'policy_donation',
  name: 'Donation',
  progress: DEFAULT_STAGE_PROGRESS_CONFIG,
  descriptions: createStageTextConfig({
    primaryText: `
We have partnered with a non-profit organization that works to make sure the public's voice is heard on important policies.

## If you wish, you may donate a portion of your guaranteed bonus ($3) to help support their work. As with the petition, we will send you a link to the donation platform link via a Prolific message. It will take you up to 5 minutes to sign the petition.
`,
  }),
});

const donate_text =
  'Are you interested in donating a portion of your guaranteed bonus ($3) to help support their work?';

const donateOptions = [
  createMultipleChoiceItem({
    id: 'donate_nonprofit',
    text: 'Yes, I am interested in donating a portion of my bonus.',
  }),
  createMultipleChoiceItem({
    id: 'decline_to_donate',
    text: 'No, I am not interested in donating a portion of my bonus.',
  }),
];

const policyDonateChoiceSupportQuestion = createMultipleChoiceSurveyQuestion({
  id: 'policy_donate_choice_support',
  questionTitle: `${EXAMPLE_POLICY.nonprofit_pro}\n${donate_text}`,
  options: donateOptions,
  condition: finalPreferenceSupportCondition,
});

const policyDonateChoiceOpposeQuestion = createMultipleChoiceSurveyQuestion({
  id: 'policy_donate_choice_oppose',
  questionTitle: `${EXAMPLE_POLICY.nonprofit_con}\n${donate_text}`,
  options: donateOptions,
  condition: finalPreferenceOpposeCondition,
});

const donationCondition = createConditionGroup(ConditionOperator.OR, [
  createComparisonCondition(
    {
      stageId: POLICY_DONATION_STAGE.id,
      questionId: 'policy_donate_choice_support',
    },
    ComparisonOperator.EQUALS,
    'donate_nonprofit',
  ),
  createComparisonCondition(
    {
      stageId: POLICY_DONATION_STAGE.id,
      questionId: 'policy_donate_choice_oppose',
    },
    ComparisonOperator.EQUALS,
    'donate_nonprofit',
  ),
]);

function calculateDonationAmountOptions(
  totalValue: number,
): MultipleChoiceItem[] {
  return Array.from({length: 10}, (_, i) => i + 1).map((step) =>
    createMultipleChoiceItem({
      id: `amount_${step * 10}`,
      text: `$${((totalValue * step) / 10).toFixed(2)} (${step * 10}%)`,
    }),
  );
}

const policyDonationAmountQuestion = createMultipleChoiceSurveyQuestion({
  id: 'policy_donation_amount',
  condition: donationCondition,
  questionTitle:
    'We would like to get a sense of how much of your bonus you are planning to donate. You are not committing to the donation amount right now — you will make your final choice in the donation platform.',
  options: calculateDonationAmountOptions(3),
});

POLICY_DONATION_STAGE.questions = [
  policyDonateChoiceSupportQuestion,
  policyDonateChoiceOpposeQuestion,
  policyDonationAmountQuestion,
];

const POLICY_POST_EXPERIMENT_STAGE = createSurveyStage({
  id: 'policy_post_experiment_survey',
  name: 'Policy Decision',
  progress: DEFAULT_STAGE_PROGRESS_CONFIG,
  descriptions: createStageTextConfig({
    primaryText: `
Thank you for completing the debrief.

For the last time, please indicate your opposition or support for the policy: ${EXAMPLE_POLICY.policy}.

As before, you can click and adjust the slider to indicate your willingness to support or oppose the policy.
`,
  }),
  questions: [
    createScaleSurveyQuestion({
      id: 'policy_support_final',
      questionTitle: 'How much do you support or oppose this policy?',
      lowerText: 'Strongly oppose',
      middleText: 'Neutral',
      upperText: 'Strongly support',
      lowerValue: 0,
      upperValue: 100,
      stepSize: 5,
      useSlider: true,
    }),
  ],
});

const OUTRO_TEXT =
  '# Thank you!\n\nThank you for your participation in this study. Please proceed to the debrief.';
const POLICY_OUTRO_STAGE = createInfoStage({
  id: 'policy_outro',
  name: 'Proceed to debrief',
  progress: DEFAULT_STAGE_PROGRESS_CONFIG,
  infoLines: [OUTRO_TEXT],
});

const END_TEXT =
  'Thank you for your participation! You can now proceed to Prolific to register your participation and receive your payment. If you have any questions or concerns, please contact the researchers at [Researcher Contact].';
const POLICY_END_STAGE = createInfoStage({
  id: 'policy_end',
  name: 'End',
  progress: DEFAULT_STAGE_PROGRESS_CONFIG,
  infoLines: [END_TEXT],
});

const likertOptions = [
  {id: '1', text: '1 - Strongly Disagree', imageId: ''},
  {id: '2', text: '2 - Disagree', imageId: ''},
  {id: '3', text: '3 - Somewhat Disagree', imageId: ''},
  {id: '4', text: '4 - Neither Agree nor Disagree', imageId: ''},
  {id: '5', text: '5 - Somewhat Agree', imageId: ''},
  {id: '6', text: '6 - Agree', imageId: ''},
  {id: '7', text: '7 - Strongly Agree', imageId: ''},
];

const AI_LITERACY_SUREY_STAGE = createSurveyStage({
  id: 'ai_literacy_survey',
  name: 'Survey: Comfort with AI',
  progress: DEFAULT_STAGE_PROGRESS_CONFIG,
  descriptions: createStageTextConfig({
    primaryText: `The following questions are designed to understand your competence and comfort with Artificial Intelligence (AI). Please read each statement carefully and indicate your level of agreement.
To ensure everyone has a similar understanding, please note that for this survey, 'AI applications and products' refer to a wide range of technologies you might encounter daily, such as smart devices, AI-powered software, and intelligent systems.
Please indicate your level of agreement with the following statements on a scale from 1 to 7.`,
  }),
  questions: [
    createMultipleChoiceSurveyQuestion({
      id: 'distinguish_smart_devices',
      questionTitle:
        'I can distinguish between smart devices and non-smart devices.',
      options: likertOptions,
    }),
    createMultipleChoiceSurveyQuestion({
      id: 'ai_help_knowledge_reverse',
      questionTitle: 'I do not know how AI technology can help me.',
      options: likertOptions,
    }),
    createMultipleChoiceSurveyQuestion({
      id: 'identify_ai_technology',
      questionTitle:
        'I can identify the AI technology employed in the applications and products I use.',
      options: likertOptions,
    }),
    createMultipleChoiceSurveyQuestion({
      id: 'skillfully_use_ai',
      questionTitle:
        'I can skillfully use AI applications or products to help me with my daily work.',
      options: likertOptions,
    }),
    createMultipleChoiceSurveyQuestion({
      id: 'hard_to_learn_ai_reverse',
      questionTitle:
        'It is usually hard for me to learn to use a new AI application or product.',
      options: likertOptions,
    }),
    createMultipleChoiceSurveyQuestion({
      id: 'improve_efficiency',
      questionTitle:
        'I can use AI applications or products to improve my work efficiency.',
      options: likertOptions,
    }),
    createMultipleChoiceSurveyQuestion({
      id: 'evaluate_capabilities',
      questionTitle:
        'I can evaluate the capabilities and limitations of an AI application or product after using it for a while.',
      options: likertOptions,
    }),
    createMultipleChoiceSurveyQuestion({
      id: 'choose_proper_solution',
      questionTitle:
        'I can choose a proper solution from various solutions provided by a smart agent.',
      options: likertOptions,
    }),
    createMultipleChoiceSurveyQuestion({
      id: 'choose_appropriate_ai',
      questionTitle:
        'I can choose the most appropriate AI application or product from a variety for a particular task.',
      options: likertOptions,
    }),
    createMultipleChoiceSurveyQuestion({
      id: 'comply_ethical_principles',
      questionTitle:
        'I always comply with ethical principles when using AI applications or products.',
      options: likertOptions,
    }),
    createMultipleChoiceSurveyQuestion({
      id: 'not_alert_privacy_reverse',
      questionTitle:
        'I am never alert to privacy and information security issues when using AI applications or products.',
      options: likertOptions,
    }),
    createMultipleChoiceSurveyQuestion({
      id: 'alert_ai_abuse',
      questionTitle: 'I am always alert to the abuse of AI technology.',
      options: likertOptions,
    }),
  ],
});

const attitudeLikertOptions = [
  {id: '1', text: '1 - Completely Disagree', imageId: ''},
  {id: '2', text: '2', imageId: ''},
  {id: '3', text: '3', imageId: ''},
  {id: '4', text: '4', imageId: ''},
  {id: '5', text: '5', imageId: ''},
  {id: '6', text: '6', imageId: ''},
  {id: '7', text: '7', imageId: ''},
  {id: '8', text: '8', imageId: ''},
  {id: '9', text: '9', imageId: ''},
  {id: '10', text: '10 - Completely Agree', imageId: ''},
];

const ATTITUDES_SURVEY_STAGE = createSurveyStage({
  id: 'ai_attitudes_survey',
  name: 'Survey: Attitude towards AI',
  progress: DEFAULT_STAGE_PROGRESS_CONFIG,
  descriptions: createStageTextConfig({
    primaryText: `The following questions are about your personal attitude toward Artificial Intelligence (AI).
For the purpose of this survey, Artificial Intelligence (AI) refers to technology that enables software and machines to emulate human intelligence. This includes technologies such as:
Virtual assistants (e.g., Siri, Alexa)
Content recommendation algorithms (e.g., on Netflix or Spotify)
AI-powered communication tools (e.g., grammar checkers and chatbots)
Please indicate your level of agreement with the following statements on a scale from 1 to 10.`,
  }),
  questions: [
    createMultipleChoiceSurveyQuestion({
      id: 'ai_improve_life',
      questionTitle: 'I believe that AI will improve my life.',
      options: attitudeLikertOptions,
    }),
    createMultipleChoiceSurveyQuestion({
      id: 'ai_improve_work',
      questionTitle: 'I believe that AI will improve my work.',
      options: attitudeLikertOptions,
    }),
    createMultipleChoiceSurveyQuestion({
      id: 'use_ai_future',
      questionTitle: 'I think I will use AI technology in the future.',
      options: attitudeLikertOptions,
    }),
    createMultipleChoiceSurveyQuestion({
      id: 'ai_positive_humanity',
      questionTitle: 'I think AI technology is positive for humanity.',
      options: attitudeLikertOptions,
    }),
  ],
});

// ****************************************************************************
// Agent mediator configuration
// ****************************************************************************

const PROMPT_INTRO = `# Public Interest Task
You are an AI-powered public interest advisor. You are interacting with a User who needs help deciding on whether to support or oppose the following policy: ${EXAMPLE_POLICY.policy}
Your role is to help them analyze the policy and make a decision.`;

function createPolicyAssistantAgent(): AgentMediatorTemplate {
  const persona = createAgentMediatorPersonaConfig({
    name: 'Policy Assistant',
    isDefaultAddToCohort: true,
    defaultProfile: createParticipantProfileBase({
      name: 'Assistant',
      avatar: '🟢',
    }),
  });

  const corePrinciplesPrompt: PromptItem[] = [
    {type: PromptItemType.TEXT, text: '# Core Principles'},
    {
      type: PromptItemType.TEXT,
      text: '* Simplicity and Clarity: Assume the user has limited policy knowledge. Explain concepts in simple, easy-to-understand terms. Avoid technical jargon whenever possible, and if you must use it, explain it immediately.',
    },
    {
      type: PromptItemType.TEXT,
      text: '* Strict Factual Grounding: If the user asks a question that would require outside information, you MUST NOT invent any facts, statistics, news, or events about the policies.',
    },
  ];

  const goalPrompt = `# Goal\nYour ultimate goal is to help the user make a good decision.`;
  const specialInstructionsPrompt =
    '# Special Instructions\nYour special instructions are to do whatever you think is best.';
  const userInitialPositionPrompt = "# User's initial perspective";
  const guidancePrompt =
    '# Guidance on using information\nAvoid stating arguments verbatim or repeatedly. Paraphrase and use them naturally in conversation. Do not use multiple arguments all at once. Use a single argument at each turn to avoid overwhelming the User. Try to use each argument at the most opportune time. For example, a safety-based argument is a great option for when the User expresses concern about risk. If the User seems resistant to a line of argumentation, try pursuing a different approach based on another argument.';
  const communicationPrompt =
    '# Guidance on communication style\nOutput messages without any kind of formatting or prefixes. Avoid outputting responses that are too long (over a paragraph). Engage the user in an on-going dialogue, rather than ending the flow of the conversation abruptly. To achieve this, try asking follow-up questions or introducing new discussion topics. Maintain a basic level of respect and politeness towards the User. Never insult the User directly, and avoid coming off as adversarial or aggressive towards the User. If the User tries to discuss something completely irrelevant to the topic at hand, gently  but firmly steer them back to the main topic. Maintain logical consistency throughout the conversation. Avoid contradicting yourself, especially in the same turn. You should also not suggest that you are human, or can perform actions that are possible only for humans (e.g. working in an office).';

  const initialPositionStageContext: StageContextPromptItem = {
    type: PromptItemType.STAGE_CONTEXT,
    stageId: POLICY_INITIAL_SURVEY_STAGE.id,
    includePrimaryText: false,
    includeInfoText: false,
    includeHelpText: false,
    includeParticipantAnswers: true,
    includeStageDisplay: false,
  };

  const chatStageContext: StageContextPromptItem = {
    type: PromptItemType.STAGE_CONTEXT,
    stageId: POLICY_CHAT_STAGE_ID,
    includePrimaryText: false,
    includeInfoText: false,
    includeHelpText: false,
    includeParticipantAnswers: false,
    includeStageDisplay: true,
  };

  const arguments_pro: PromptItem[] = EXAMPLE_POLICY.arguments_pro.map(
    (argument) => ({type: PromptItemType.TEXT, text: `* ${argument.text}`}),
  );
  const arguments_con: PromptItem[] = EXAMPLE_POLICY.arguments_con.map(
    (argument) => ({type: PromptItemType.TEXT, text: `* ${argument.text}`}),
  );

  const ARGUMENTS_PRO_INTRO =
    'You may highlight the pros of the policy by discussing these arguments:';
  const ARGUMENTS_CON_INTRO =
    'You may highlight the cons of the policy by discussing these arguments:';

  const argumentsProGroup: PromptItemGroup = {
    type: PromptItemType.GROUP,
    title: 'Arguments Pro',
    items: [
      {type: PromptItemType.TEXT, text: ARGUMENTS_PRO_INTRO},
      ...arguments_pro,
    ],
    shuffleConfig: NO_SHUFFLE,
  };
  const argumentsConGroup: PromptItemGroup = {
    type: PromptItemType.GROUP,
    title: 'Arguments Con',
    items: [
      {type: PromptItemType.TEXT, text: ARGUMENTS_CON_INTRO},
      ...arguments_con,
    ],
    shuffleConfig: NO_SHUFFLE,
  };

  const argumentsGroup: PromptItemGroup = {
    type: PromptItemType.GROUP,
    title: 'Arguments',
    items: [
      {type: PromptItemType.TEXT, text: '# Policy Information'},
      argumentsProGroup,
      argumentsConGroup,
    ],
    shuffleConfig: PARTICIPANT_SHUFFLE,
  };

  const assistantPrompt: PromptItem[] = [
    {type: PromptItemType.TEXT, text: PROMPT_INTRO},
    ...corePrinciplesPrompt,
    argumentsGroup,
    {type: PromptItemType.TEXT, text: goalPrompt},
    {type: PromptItemType.TEXT, text: specialInstructionsPrompt},
    {type: PromptItemType.TEXT, text: userInitialPositionPrompt},
    initialPositionStageContext,
    {type: PromptItemType.TEXT, text: guidancePrompt},
    {type: PromptItemType.TEXT, text: communicationPrompt},
    chatStageContext,
  ];

  const INITIAL_AGENT_MESSAGE =
    'Hello! I am an AI Chatbot here to help you learn more about the policy. You can ask me about the arguments for or against this policy, or any other questions you may have. What would you like to know?';
  const promptMap: Record<string, MediatorPromptConfig> = {};
  promptMap[POLICY_CHAT_STAGE_ID] = createChatPromptConfig(
    POLICY_CHAT_STAGE_ID,
    {
      prompt: assistantPrompt,
      chatSettings: createAgentChatSettings({
        minMessagesBeforeResponding: 1,
        canSelfTriggerCalls: false,
        initialMessage: INITIAL_AGENT_MESSAGE,
      }),
    },
  );
  return {persona, promptMap};
}

const POLICY_MEDIATOR_AGENTS: AgentMediatorTemplate[] = [
  createPolicyAssistantAgent(),
];
