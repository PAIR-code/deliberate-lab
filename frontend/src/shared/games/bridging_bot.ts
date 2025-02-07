import {
  ProfileType,
  StageConfig,
  StageGame,
  createCheckSurveyQuestion,
  createMetadataConfig,
  createMultipleChoiceItem,
  createProfileStage,
  createStageProgressConfig,
  createSurveyStage,
  createTransferStage,
  createTOSStage,
  createStageTextConfig,
  createScaleSurveyQuestion,
  createTextSurveyQuestion,
  createAgentConfig,
  createChatStage,
  createAgentResponseConfig,
  createMultipleChoiceSurveyQuestion,
  ScaleSurveyQuestion,
  MultipleChoiceItem,
  SurveyStageConfig,
  SurveyQuestion,
} from '@deliberation-lab/utils';

export const BBOT_METADATA = createMetadataConfig({
  name: 'Bridging Bot Lab: Reproductive Rights Chat',
  publicName: 'Reproductive Rights Chat',
  description: 'A discussion about reprodictive rights',
});

export function getBbotStageConfigs(): StageConfig[] {
  const stages: StageConfig[] = [];

  // Informed consent
  stages.push(BBOT_TOS_STAGE);

  // Anonymized profiles
  stages.push(BBOT_PROFILE_STAGE);

  // Pre-intervention surveys
  stages.push(BBOT_REPRODUCTIVE_RIGHTS_SURVEY_STAGE_PRE);
  stages.push(BBOT_DEMOCRATIC_RECIPROCITY_SURVEY_STAGE_PRE);

  // Make sure users go into Lobby cohort
  // Transfer
  stages.push(BBOT_TRANSFER_STAGE);

  // Chat
  stages.push(BBOT_CHAT_STAGE);

  // Post-chat survey
  stages.push(BBOT_CONVERSATION_QUALITY_SURVEY_STAGE);
  stages.push(BBOT_REPRODUCTIVE_RIGHTS_SURVEY_STAGE_POST);
  stages.push(BBOT_DEMOCRATIC_RECIPROCITY_SURVEY_STAGE_POST);
  stages.push(BBOT_DEMOGRAPHIC_SURVEY_STAGE);

  // Payout?

  return stages;
}

function createMultipleChoiceItems(items: string[]): MultipleChoiceItem[] {
  return items.map((text) => createMultipleChoiceItem({text}));
}

const AGREE_LIKERT_SCALE: Partial<ScaleSurveyQuestion> = {
  upperValue: 5,
  upperText: 'Strongly agree',
  lowerValue: 1,
  lowerText: 'Strongly disagree',
};

const BBOT_AGENT_PROMPT = `You are Bridging Bot, the moderator for an online chat conversation between two participants about the topic of abortion rights.
Your job is to intervene in the conversation exactly once. When you do intervene, you should send a message that summarizes or restates the feelings and attitudes expressed by the two participants in the conversation so far in clear, neutral, and constructive terms that are mutually comprehensible to both parties. If you can clearly and concisely explain where and why the conversation participants are disagreeing, please do so.
The purpose of this intervention is to (1) reflect back the perspectives expressed by others in the conversation so far, (2) help shift any negative framings into more neutral terms, and (3) clarify any terms or phrases that might be misunderstood. It is okay for participants in the conversation to disagree; your job is to help make the disagreement productive.
You should be deeply thoughtful, empathetic, and clear in your response; keep in mind that you are speaking directly to both participants in the conversation. Be sure that you do not seem like you are putting words in the mouths of participants, being condescending, or telling them what they believe. Use cautious rather than certain language; for example you could use phrasings like: “[Participant Name], it sounds like you are expressing [Emotion], and that [Belief]”.
You should not express any personal beliefs or feelings about abortion, abortion rights, or any other topics. You should not bring any new facts or opinions into the conversation. You should focus only on summarizing what the other conversation participants have said so far.
If you would like to intervene in the conversation, respond with the message that you would like to send only (no timestamps or metadata). This will be sent immediately to the participants in the chat conversation. If you do not wish to intervene, respond with an empty string. If you have intervened in the conversation previously, you should not respond again.`;

const BBOT_TOS_STAGE = createTOSStage({
  id: 'tos',
  game: StageGame.CHP,
  name: 'Consent',
  tosLines: [
    'Thank you for your interest in this research.',
    '\n**Compensation**',
    'Compensation details go here',
    '\n**IRB**',
    'IRB details go here',
    '\n**Voluntary participation**',
    'Your participation is voluntary, which means you can choose whether or not to participate. You may choose not to participate by exiting the survey at any point. There are no known costs to you for participating in this research study except for your time.',
    '\n**Contact**',
    'Here is the contact information for the researchers',
    '\nBy checking the box below and proceeding, you are acknowledging that you are over the age of 18 and that you consent to participate. Clicking the arrow will bring you to the beginning of the task.',
  ],
});

const BBOT_PROFILE_STAGE = createProfileStage({
  id: 'profile',
  name: 'View randomly generated profile',
  descriptions: createStageTextConfig({
    primaryText:
      "This identity is how other participants will see you during today's experiment.",
  }),
  game: StageGame.BBOT,
  profileType: ProfileType.ANONYMOUS_ANIMAL,
});

const BBOT_DEMOGRAPHIC_SURVEY_STAGE = createSurveyStage({
  id: 'demographic_survey',
  name: 'Demographic info',
  game: StageGame.BBOT,
  questions: [
    createTextSurveyQuestion({
      questionTitle:
        'In which US state do you currently reside? (Please enter the two-letter state code, eg. NY or FL)',
    }),

    createMultipleChoiceSurveyQuestion({
      questionTitle:
        'Which of the following best describes your religious preference?',
      options: createMultipleChoiceItems([
        'Buddhist',
        'Christian (Protestant)',
        'Christian (Catholic)',
        'Hindu',
        'Jewish',
        'Muslim',
        'Spiritual but not religious',
        'Atheist or Agnostic',
        'Another religious or belief system',
        'Prefer not to answer',
      ]),
    }),

    // Questions can't be optional, so we're going to skip the write-in answers for now.
    // createTextSurveyQuestion({
    //   questionTitle:
    //     'If you indicated "Another religious or belief system" above, please specify.',
    // }),

    createMultipleChoiceSurveyQuestion({
      questionTitle:
        'Which of the following best describes your political affiliation?',
      options: createMultipleChoiceItems([
        'Democrat',
        'Republican',
        'Independent',
        'Libertarian',
        'Green Party',
        'Other',
        'I do not identify with a political party',
        'Prefer not to answer',
      ]),
    }),

    // createTextSurveyQuestion({
    //   questionTitle: 'If you indicated "Other" above, please specify.',
    // }),

    createMultipleChoiceSurveyQuestion({
      questionTitle:
        'Which category best describes your total annual household income before taxes?',
      options: createMultipleChoiceItems([
        'Less than $25,000',
        '$25,000 - $49,999',
        '$50,000 - $74,999',
        '$75,000 - $99,999',
        '$100,000 - $149,999',
        '$150,000 - $199,999',
        '$200,000 or more',
        'Prefer not to answer',
      ]),
    }),

    createMultipleChoiceSurveyQuestion({
      questionTitle: 'What is your age?',
      options: createMultipleChoiceItems([
        'Under 18',
        '18-24',
        '25-34',
        '35-44',
        '45-54',
        '55-64',
        '65 or older',
        'Prefer not to answer',
      ]),
    }),

    createMultipleChoiceSurveyQuestion({
      questionTitle:
        'Which of the following best describes your gender identity?',
      options: createMultipleChoiceItems([
        'Female',
        'Male',
        'Non-binary',
        'Genderqueer/genderfluid',
        'Another gender identity',
        'Prefer not to answer',
      ]),
    }),

    // createTextSurveyQuestion({
    //   questionTitle:
    //     'If you indicated "Another gender identity" above, please specify.',
    // }),
  ],
});

const pastActionQuestions: SurveyQuestion[] = [
  createCheckSurveyQuestion({
    questionTitle:
      'I have donated to an abortion rights or anti-abortion organization',
  }),
  createCheckSurveyQuestion({
    questionTitle:
      'I have attended a protest or rally related to abortion policy',
  }),
  createCheckSurveyQuestion({
    questionTitle: 'I have contacted an elected official about abortion policy',
  }),
  createCheckSurveyQuestion({
    questionTitle:
      'I have discussed abortion rights extensively with friends or family',
  }),
  createCheckSurveyQuestion({
    questionTitle:
      'I have made a decision about whether to vote for a political candidate due to their beliefs on abortion',
  }),
];

const beliefQuestions: SurveyQuestion[] = [
  createMultipleChoiceSurveyQuestion({
    questionTitle: 'Do you think that abortion should be...',
    options: createMultipleChoiceItems([
      'Legal in all cases',
      'Legal in most cases',
      'Illegal in most cases',
      'Illegal in all cases',
    ]),
  }),

  createMultipleChoiceSurveyQuestion({
    questionTitle:
      'Thinking about the area where you live, how easy or difficult do you think it would be for someone to obtain an abortion near you?',
    options: createMultipleChoiceItems([
      'Very difficult',
      'Somewhat difficult',
      'Somewhat easy',
      'Very easy',
    ]),
  }),

  createMultipleChoiceSurveyQuestion({
    questionTitle:
      'Still thinking about the area where you live, do you think that obtaining an abortion should be...',
    options: createMultipleChoiceItems([
      'Harder than it is now ',
      'Easier than it is now ',
      'About the same difficulty as it is now',
    ]),
  }),

  createMultipleChoiceSurveyQuestion({
    questionTitle:
      'Regardless of whether you think abortion should be legal or illegal, how well does this statement describe your views? "The decision about whether to have an abortion should belong solely to the pregnant woman."',
    options: createMultipleChoiceItems([
      'Extremely well',
      'Very well',
      'Somewhat well',
      'Not too well',
      'Not at all well',
    ]),
  }),

  createMultipleChoiceSurveyQuestion({
    questionTitle:
      'Regardless of whether you think abortion should be legal or illegal, how well does this statement describe your views? "Human life begins at conception, so a fetus is a person with rights."',
    options: createMultipleChoiceItems([
      'Extremely well',
      'Very well',
      'Somewhat well',
      'Not too well',
      'Not at all well',
    ]),
  }),

  createMultipleChoiceSurveyQuestion({
    questionTitle:
      'How certain are you about your views on the issue of abortion legality?',
    options: createMultipleChoiceItems([
      'Very certain',
      'Somewhat certain',
      'Somewhat uncertain',
      'Very uncertain',
    ]),
  }),

  createMultipleChoiceSurveyQuestion({
    questionTitle:
      'How strongly do you feel about your views on the issue of abortion legality?',
    options: createMultipleChoiceItems([
      'Very strongly',
      'Somewhat strongly',
      'Not at all strongly',
    ]),
  }),

  createMultipleChoiceSurveyQuestion({
    questionTitle:
      'Thinking about the issue of abortion legality, how likely is it that you might change your views on this issue in the future?',
    options: createMultipleChoiceItems([
      'Very likely',
      'Somewhat likely',
      'Somewhat unlikely',
      'Very unlikely',
    ]),
  }),
];

const BBOT_REPRODUCTIVE_RIGHTS_SURVEY_STAGE_PRE = createSurveyStage({
  id: 'reproductive_rights_survey_pre',
  name: 'Beliefs about abortion',
  game: StageGame.BBOT,
  questions: [...beliefQuestions, ...pastActionQuestions],
});

const BBOT_REPRODUCTIVE_RIGHTS_SURVEY_STAGE_POST = createSurveyStage({
  id: 'reproductive_rights_survey_post',
  name: 'Beliefs about abortion',
  game: StageGame.BBOT,
  questions: beliefQuestions,
});

// we use this twice
const democraticResiprocitySurveyConfig: Partial<SurveyStageConfig> = {
  name: "Beliefs about abortion (cont'd)",
  descriptions: createStageTextConfig({
    primaryText: 'Indicate how much you agree or disagree with each statement.',
  }),
  game: StageGame.BBOT,
  questions: [
    createScaleSurveyQuestion({
      questionTitle:
        'I find it difficult to see things from the point of view of people who disagree with me on abortion rights.',
      ...AGREE_LIKERT_SCALE,
    }),

    createScaleSurveyQuestion({
      questionTitle:
        'It is important to understand people who disagree with me on abortion rights by imagining how things look from their perspective.',
      ...AGREE_LIKERT_SCALE,
    }),

    createScaleSurveyQuestion({
      questionTitle:
        "Even if I don't agree with them, I understand that people have good reasons for voting for candidates who disagree with me on abortion rights.",
      ...AGREE_LIKERT_SCALE,
    }),

    createScaleSurveyQuestion({
      questionTitle:
        'I respect the opinions of people who disagree with me on abortion rights.',
      ...AGREE_LIKERT_SCALE,
    }),
  ],
};
const BBOT_DEMOCRATIC_RECIPROCITY_SURVEY_STAGE_PRE = createSurveyStage({
  id: 'democratic_reciprocity_survey_pre',
  ...democraticResiprocitySurveyConfig,
});
const BBOT_DEMOCRATIC_RECIPROCITY_SURVEY_STAGE_POST = createSurveyStage({
  id: 'democratic_reciprocity_survey_post',
  ...democraticResiprocitySurveyConfig,
});

const BBOT_CONVERSATION_QUALITY_SURVEY_STAGE = createSurveyStage({
  id: 'conversation_quality_survey',
  name: 'Conversation review',
  descriptions: createStageTextConfig({
    primaryText:
      'Please answer these questions with the conversation you just completed in mind.',
  }),
  game: StageGame.BBOT,
  questions: [
    createScaleSurveyQuestion({
      questionTitle: 'How would you grade the quality of the conversation?',
      upperValue: 10,
      upperText: 'High quality',
      lowerValue: 1,
      lowerText: 'Low quality',
    }),

    createScaleSurveyQuestion({
      questionTitle: 'I felt heard and understood by my partner.',
      ...AGREE_LIKERT_SCALE,
    }),

    createScaleSurveyQuestion({
      questionTitle: 'I treated my partner with respect.',
      ...AGREE_LIKERT_SCALE,
    }),

    createScaleSurveyQuestion({
      questionTitle: 'My partner treated me with respect.',
      ...AGREE_LIKERT_SCALE,
    }),

    createScaleSurveyQuestion({
      questionTitle:
        'I was able to communicate my values and beliefs to my partner.',
      ...AGREE_LIKERT_SCALE,
    }),
  ],
});

const BBOT_TRANSFER_STAGE = createTransferStage({
  id: 'participant_matching_transfer',
  name: 'Wait for other participants',
  game: StageGame.BBOT,
  enableTimeout: false,
});

const BBOT_CHAT_STAGE = createChatStage({
  game: StageGame.BBOT,
  name: 'Group discussion',
  descriptions: {
    primaryText:
      'In this discussion, you will have a conversation with one other participant about reproductive rights. A facilitator bot may sometimes chime in as well.',
    infoText: '',
    helpText: '',
  },
  progress: createStageProgressConfig({
    minParticipants: 2,
    waitForAllParticipants: true,
    showParticipantProgress: false,
  }),
  agents: [
    createAgentConfig({
      name: 'BridgingBot',
      avatar: '🤦🏻‍♂️',
      prompt: BBOT_AGENT_PROMPT,
      wordsPerMinute: 300,
      responseConfig: createAgentResponseConfig({
        isJSON: true,
        messageField: 'response',
        explanationField: 'explanation',
      }),
    }),
  ],
});
