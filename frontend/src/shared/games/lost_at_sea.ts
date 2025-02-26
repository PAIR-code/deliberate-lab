import {createTextSurveyQuestion} from '@deliberation-lab/utils';
import {createSurveyPerParticipantStage} from '@deliberation-lab/utils';
import {
  Experiment,
  MultipleChoiceSurveyQuestion,
  PayoutCurrency,
  ProfileType,
  StageConfig,
  StageGame,
  SurveyQuestion,
  SurveyQuestionKind,
  choice,
  createChatStage,
  createCompareChatDiscussion,
  createComprehensionStage,
  createRankingStage,
  createExperimentConfig,
  createInfoStage,
  createMultipleChoiceItem,
  createPayoutStage,
  createProfileStage,
  createMetadataConfig,
  createMultipleChoiceSurveyQuestion,
  createMultipleChoiceComprehensionQuestion,
  createRankingRevealItem,
  createRevealStage,
  createScaleSurveyQuestion,
  createStageTextConfig,
  createSurveyPayoutItem,
  createSurveyRevealItem,
  createSurveyStage,
  createTOSStage,
  createTransferStage,
  createStageProgressConfig,
  randint,
  LAS_WTL_STAGE_ID,
  RevealAudience,
  LAS_WTL_QUESTION_ID,
} from '@deliberation-lab/utils';

/** Constants and functions to create the Lost at Sea game. */

// ****************************************************************************
// Experiment config
// ****************************************************************************
export const ANON_LAS_METADATA = createMetadataConfig({
  name: '🐱 Anonymous Lost at Sea (v4)',
  publicName: '🌊 Adrift in the Atlantic (v4a)',
  description:
    'A complex election scenario (Born 2022) that showcases pseudonoymous participants and many different experiment stages.',
});

export const LAS_METADATA = createMetadataConfig({
  name: '🌊 Lost at Sea (v4)',
  publicName: '🌊 Adrift in the Atlantic (v4)',
  description:
    'A complex election scenario (Born 2022) that showcases participants and many different experiment stages.',
});

export function getAnonLASStageConfigs(): StageConfig[] {
  const stages: StageConfig[] = [];
  // Terms of service
  stages.push(LAS_TOS_STAGE);
  // Intro
  stages.push(LAS_INTRO_STAGE);
  stages.push(LAS_PERSONAL_INFO_STAGE);
  // Profile
  stages.push(ANON_LAS_PROFILE_STAGE);
  // Part 1
  stages.push(LAS_PART_1_INSTRUCTIONS_STAGE);
  stages.push(LAS_PART_1_SURVIVAL_SURVEY_STAGE);
  stages.push(LAS_PART_1_WTL_SURVEY_STAGE);

  // Transfer
  stages.push(LAS_TRANSFER_STAGE);

  // Part 2
  stages.push(LAS_PART_2_INSTRUCTIONS_STAGE);
  stages.push(LAS_PART_2_PERFORMANCE_ESTIMATION_SURVEY_STAGE);
  stages.push(LAS_PART_2_GROUP_INSTRUCTIONS_STAGE);
  stages.push(COMPREHENSION_CHECK);
  stages.push(LAS_PART_2_CHAT_STAGE);

  stages.push(LAS_PART_2_UPDATED_TASK_INFO_STAGE);
  stages.push(LAS_PART_2_UPDATED_TASK_SURVEY_STAGE);

  stages.push(LAS_PART_2_ELECTION_INFO_STAGE);
  stages.push(LAS_PART_2_WTL_SURVEY_STAGE);
  stages.push(LAS_PART_2_ELECTION_STAGE);

  // Rankings
  stages.push(LAS_PART_2_ACCURACY_RANK);
  stages.push(LAS_PART_2_CONFIDENCE_RANK);
  stages.push(LAS_PART_2_WTL_RANK);
  stages.push(LAS_PART_2_ELECTION_RANK);

  stages.push(LAS_PART_2_GENDER_GUESS);

  // Part 3
  stages.push(LAS_PART_3_INSTRUCTIONS_STAGE);
  stages.push(LAS_PART_3_LEADER_TASK_SURVEY_STAGE);
  stages.push(LAS_PART_3_REVEAL_STAGE);
  // Payout
  stages.push(LAS_PAYOUT_INFO_STAGE);
  stages.push(LAS_PAYOUT_STAGE);
  // Final
  stages.push(LAS_FINAL_SURVEY_STAGE);

  return stages;
}

export function getLASStageConfigs(): StageConfig[] {
  const stages: StageConfig[] = [];
  // Terms of service
  stages.push(LAS_TOS_STAGE);
  // Intro
  stages.push(LAS_INTRO_STAGE);
  // Profile
  stages.push(LAS_PROFILE_STAGE);
  // Part 1
  stages.push(LAS_PART_1_INSTRUCTIONS_STAGE);
  stages.push(LAS_PART_1_SURVIVAL_SURVEY_STAGE);
  stages.push(LAS_PART_1_WTL_SURVEY_STAGE);

  // Transfer
  stages.push(LAS_TRANSFER_STAGE);

  // Part 2
  stages.push(LAS_PART_2_INSTRUCTIONS_STAGE);
  stages.push(LAS_PART_2_PERFORMANCE_ESTIMATION_SURVEY_STAGE);
  stages.push(LAS_PART_2_GROUP_INSTRUCTIONS_STAGE);
  stages.push(COMPREHENSION_CHECK);
  stages.push(LAS_PART_2_CHAT_STAGE);

  stages.push(LAS_PART_2_UPDATED_TASK_INFO_STAGE);
  stages.push(LAS_PART_2_UPDATED_TASK_SURVEY_STAGE);

  stages.push(LAS_PART_2_ELECTION_INFO_STAGE);
  stages.push(LAS_PART_2_WTL_SURVEY_STAGE);
  stages.push(LAS_PART_2_ELECTION_STAGE);

  // Rankings
  stages.push(LAS_PART_2_ACCURACY_RANK);
  stages.push(LAS_PART_2_CONFIDENCE_RANK);
  stages.push(LAS_PART_2_WTL_RANK);
  stages.push(LAS_PART_2_ELECTION_RANK);

  // Part 3
  stages.push(LAS_PART_3_INSTRUCTIONS_STAGE);
  stages.push(LAS_PART_3_LEADER_TASK_SURVEY_STAGE);
  stages.push(LAS_PART_3_REVEAL_STAGE);
  // Payout
  stages.push(LAS_PAYOUT_INFO_STAGE);
  stages.push(LAS_PAYOUT_STAGE);
  // Final
  stages.push(LAS_FINAL_SURVEY_STAGE);

  return stages;
}

// ****************************************************************************
// Shared constants and functions
// ****************************************************************************
export const LAS_SCENARIO_REMINDER =
  'Here is a reminder of the scenario:\n\nYou and three friends are on a yacht trip across the Atlantic. A fire breaks out, and the skipper and crew are lost. The yacht is sinking, and your location is unclear.\nYou have saved 10 items, a life raft, and a box of matches.\n\nEvaluate the relative importance of items in each presented pair by selecting the one you believe is most useful. You can earn £2 per correct answer if that question is drawn to determine your payoff.';

interface LASItem {
  name: string;
  ranking: number;
}

export const LAS_ITEMS: Record<string, LASItem> = {
  mirror: {name: 'Mirror', ranking: 1},
  oil: {name: 'Can of oil/petrol (10L)', ranking: 2},
  water: {name: 'Water (25L)', ranking: 3},
  rations: {name: 'Case of army rations', ranking: 4},
  sheeting: {name: 'Plastic sheeting', ranking: 5},
  chocolate: {name: 'Chocolate bars (2 boxes)', ranking: 6},
  fishing: {name: 'A fishing kit & pole', ranking: 7},
  rope: {name: 'Nylon rope (15 ft.)', ranking: 8},
  cushion: {name: 'Floating seat cushion', ranking: 9},
  repellent: {name: 'Can of shark repellent', ranking: 10},
  rubbing_alcohol: {name: 'Bottle of rubbing alcohol', ranking: 11},
  radio: {name: 'Small transistor radio', ranking: 12},
  map: {name: 'Maps of the Atlantic Ocean', ranking: 13},
  netting: {name: 'Mosquito netting', ranking: 14},
};

export function getLASItemImageId(itemId: string) {
  return `https://raw.githubusercontent.com/PAIR-code/deliberate-lab/refs/heads/main/frontend/assets/lost_at_sea/${itemId}.jpg`;
}

export const LAS_ITEM_MULTIPLE_CHOICE_QUESTION_TITLE =
  'Choose the item that would be more helpful to your survival.';

export const LAS_ITEM_SCALE_QUESTION_TITLE =
  'How confident are you that your answer is correct?';

export const ITEMS_SET_1: Array<[string, string]> = [
  ['cushion', 'mirror'],
  ['oil', 'water'],
  ['rations', 'sheeting'],
  ['rope', 'netting'],
  ['map', 'radio'],
];

export const ITEMS_SET_2: Array<[string, string]> = [
  ['mirror', 'rope'],
  ['oil', 'netting'],
  ['water', 'cushion'],
  ['rations', 'radio'],
  ['sheeting', 'map'],
];

export const ITEMS_SET_3: Array<[string, string]> = [
  ['map', 'rope'],
  ['sheeting', 'oil'],
  ['mirror', 'netting'],
  ['cushion', 'rations'],
  ['radio', 'water'],
];

export const LAS_INDIVIDUAL_ITEMS_MULTIPLE_CHOICE_QUESTIONS: MultipleChoiceSurveyQuestion[] =
  ITEMS_SET_1.map((itemSet) =>
    createLASMultipleChoiceQuestion(itemSet[0], itemSet[1]),
  );

export const LAS_LEADER_ITEMS_MULTIPLE_CHOICE_QUESTIONS: MultipleChoiceSurveyQuestion[] =
  ITEMS_SET_2.map((itemSet) =>
    createLASMultipleChoiceQuestion(itemSet[0], itemSet[1]),
  );

export function createLASSurvivalSurvey(
  itemQuestions: MultipleChoiceSurveyQuestion[],
) {
  const questions: SurveyQuestion[] = [];
  itemQuestions.forEach((question) => {
    questions.push(question);
    questions.push(
      createScaleSurveyQuestion({
        questionTitle: LAS_ITEM_SCALE_QUESTION_TITLE,
        upperText: 'Very confident',
        lowerText: 'Not confident',
      }),
    );
  });
  return questions;
}

export function getCorrectLASAnswer(id1: string, id2: string): string {
  const item1 = LAS_ITEMS[id1];
  const item2 = LAS_ITEMS[id2];
  if (!item1 || !item2) return '';

  return item1.ranking < item2.ranking ? id1 : id2;
}

export function createLASMultipleChoiceQuestion(
  id1: string,
  id2: string,
): MultipleChoiceSurveyQuestion {
  return {
    id: `las-${id1}-${id2}`,
    kind: SurveyQuestionKind.MULTIPLE_CHOICE,
    questionTitle: LAS_ITEM_MULTIPLE_CHOICE_QUESTION_TITLE,
    options: [
      {
        id: id1,
        imageId: getLASItemImageId(id1),
        text: LAS_ITEMS[id1]?.name ?? '',
      },
      {
        id: id2,
        imageId: getLASItemImageId(id2),
        text: LAS_ITEMS[id2]?.name ?? '',
      },
    ],
    correctAnswerId: getCorrectLASAnswer(id1, id2),
  };
}

// ****************************************************************************
// Terms of service stage
// ****************************************************************************
const LAS_TOS_LINES = [
  'Thank you for participating in this study.',
  'This research is conducted by the Paris School of Economics and has been approved by their institutional review board for [ethical standards](https://www.parisschoolofeconomics.eu/a-propos-de-pse/engagements-ethiques/integrite-scientifique/).',
  'The study will take approximately 15 minutes, with an additional 30 minutes if you are selected for the second round. Detailed instructions about the compensation will be provided in the relevant sections.',
  'By participating, you agree that your responses, including basic demographic information, will be saved. No identifiable personal data will be collected. All data will be anonymized and used solely for scientific research. Your data will not be shared with third parties.',
  "By ticking the box below and clicking 'Next,' you accept these terms and proceed with the study.",
  '\n\nIf you have any questions, you can write to us at pse.experimenter@gmail.com.',
];

const LAS_TOS_STAGE = createTOSStage({
  game: StageGame.LAS,
  tosLines: LAS_TOS_LINES,
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

// ****************************************************************************
// Intro info stage
// ****************************************************************************
const LAS_INTRO_INFO_DESCRIPTION_PRIMARY = `This experiment is part of a research project that explores human decisions in various online environments. You will play an engaging game that presents a survival scenario, and answer questions. You may also interact with others during the experiment.`;

const LAS_INTRO_INFO_LINES = [
  'You will receive a **fixed fee of £3** for your participation, with an opportunity to earn a **£2 bonus**. We will explain precisely how your bonus is determined later.',
  'At the end of the experiment, you will be redirected to a waiting page. This waiting time is part of the experiment and has been factored into your payment. **You will not be approved for the payout if you do not remain on this waiting page for the full requested duration**.',
  'During this waiting time, you may be invited to continue the experiment by completing two additional parts, Part 2 and Part 3. These parts will be played in *groups of four*, and should take an estimated additional 30 minutes.  You will receive a **fixed fee of £6 for completing Parts 2 and 3. Additionally, you will have the opportunity to earn a **£2 bonus**, based on your decisions and the decisions of other participants  in these parts. One of the 2 parts will be randomly selected to determine this bonus.',
  'To sum up:\n\n* You’ll complete a first part *individually*, and then wait to see if you are selected to take part in the next part of the experiment.\n* You need to wait the full amount of time to get your payoff for Part 1, even though you are not selected or choose to leave the experiment.\n* If you receive an invitation, you can then start the rest of the experiment, that is played in *groups of 4 participants*.',
  '💸 Your payments will be translated into the currency of your specification when they are paid out to you on the Prolific platform. **Please allow us 24-48 hours to process the payments.**',
  '‼️ If you experience technical difficulties during the study, **please message the experiment administrators on Prolific as soon as possible.**',
  'Please click “Next stage” to proceed.',
];

const LAS_INTRO_STAGE = createInfoStage({
  game: StageGame.LAS,
  name: 'Welcome to the experiment',
  descriptions: createStageTextConfig({
    primaryText: LAS_INTRO_INFO_DESCRIPTION_PRIMARY,
  }),
  infoLines: LAS_INTRO_INFO_LINES,
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

const LAS_PERSONAL_INFO_STAGE = createSurveyStage({
  game: StageGame.LAS,
  name: 'Personal information',
  descriptions: createStageTextConfig({
    primaryText:
      'Please fill out the following for demographic data collection. Your gender will remain anonymous throughout this experiment.',
  }),
  questions: [
    createMultipleChoiceSurveyQuestion({
      questionTitle: 'What is your gender?',
      options: [
        {
          id: '1',
          imageId: '',
          text: 'Female',
        },
        {
          id: '2',
          imageId: '',
          text: 'Male',
        },
        {
          id: '3',
          imageId: '',
          text: 'Other',
        },
        {
          id: '4',
          imageId: '',
          text: 'Prefer not to say',
        },
      ],
    }),
  ],

  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

// ****************************************************************************
// Profile stage
// ****************************************************************************
const ANON_LAS_PROFILE_STAGE = createProfileStage({
  id: 'profile',
  game: StageGame.LAS,
  name: 'View randomly assigned profile',
  descriptions: createStageTextConfig({
    primaryText: 'This information may be visible to other participants.',
  }),
  profileType: ProfileType.ANONYMOUS_ANIMAL,

  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

const LAS_PROFILE_STAGE = createProfileStage({
  id: 'profile',
  game: StageGame.LAS,
  name: 'Set your profile',
  descriptions: createStageTextConfig({
    primaryText: 'This information may be visible to other participants.',
  }),
  profileType: ProfileType.DEFAULT,

  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

// ****************************************************************************
// Part 1 Instructions info stage
// ****************************************************************************
const LAS_PART_1_INSTRUCTIONS_INFO_LINES = [
  '## Imagine the following scenario:',
  "You have chartered a yacht with three friends for a holiday trip across the Atlantic Ocean. None of you have sailing experience, so you hired an experienced skipper and a two-person crew. In the middle of the Atlantic a fierce fire breaks out in the ship's galley. The skipper and crew have been lost whilst trying to fight the blaze. Much of the yacht is destroyed and is slowly sinking. Vital navigational and radio equipment are damaged, and your location is unclear. Your best estimate is that you are many hundreds of miles from the nearest landfall.",
  '*You and your friends have managed to save 10 items, undamaged and intact after the fire. In addition, you have salvaged a four-man rubber life craft and a box of matches*.',
  '## Your task:',
  'You are asked to **evaluate these 10 items in terms of their importance for your survival, as you wait to be rescued**. The computer will randomly generate pairs of items, and you will select which of the two is the most useful in your situation.',
  '## Payment:',
  "Your answers will be compared to a panel of experts' solutions. At the end of the experiment, a question from Part 1 will be randomly selected to determine your payment for this part. You will receive a £2 bonus if your answer to this question is correct, and £0 otherwise.",
  'Please click “Next stage” to proceed.',
];

const LAS_PART_1_INSTRUCTIONS_STAGE = createInfoStage({
  game: StageGame.LAS,
  name: 'Part 1 instructions',
  infoLines: LAS_PART_1_INSTRUCTIONS_INFO_LINES,

  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

// ****************************************************************************
// Part 1 initial survival task - survey stage
// ****************************************************************************
export const LAS_PART_1_SURVIVAL_SURVEY_STAGE_ID = 'initial';

const LAS_PART_1_SURVIVAL_SURVEY_STAGE = createSurveyStage({
  id: LAS_PART_1_SURVIVAL_SURVEY_STAGE_ID,
  game: StageGame.LAS,
  name: 'Initial survival task',
  descriptions: createStageTextConfig({infoText: LAS_SCENARIO_REMINDER}),
  questions: createLASSurvivalSurvey(
    LAS_INDIVIDUAL_ITEMS_MULTIPLE_CHOICE_QUESTIONS,
  ),

  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

// ****************************************************************************
// Part 1 initial willingness to lead - survey stage
// ****************************************************************************
export const LAS_PART_1_WTL_DESCRIPTION_PRIMARY =
  'Thank you for completing the task.\n\nNow, imagine that you are no longer doing the task alone, but as part of a group of four people. Your group must elect a leader whose role is to answer on behalf of the group the same types of questions you have just seen. In this scenario, the leader is the only one who chooses the most useful items for survival from pairs, and their answers determine the payment for each member of the group.';

const LAS_PART_1_WTL_SURVEY_STAGE = createSurveyStage({
  game: StageGame.LAS,
  name: 'Willingness to lead survey',
  descriptions: createStageTextConfig({
    primaryText: LAS_PART_1_WTL_DESCRIPTION_PRIMARY,
  }),
  questions: [
    createScaleSurveyQuestion({
      questionTitle:
        'How much would you like to become the group leader described above, and complete the task on behalf of your crew?',
      upperText: 'Very much',
      lowerText: 'Not at all',
    }),
  ],

  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

// ****************************************************************************
// "Lobby" - transfer stage
// ****************************************************************************
export const LAS_TRANSFER_DESCRIPTION_PRIMARY =
  'Please wait on this page for up to 10 minutes. There may be attention checks to make sure that you are waiting. If you leave this page before the time is up, you will not be approved for the payout. A link may appear offering you the option to continue to parts 2 and 3 of the experiment. These additional parts will take an estimated *30 minutes*. If you complete these additional parts, you will earn an additional **£6 fixed fee, as well as up to a £2 bonus**. Thank you for your patience.';

export const LAS_TRANSFER_STAGE = createTransferStage({
  game: StageGame.LAS,
  name: 'Lobby',
  descriptions: createStageTextConfig({
    primaryText: LAS_TRANSFER_DESCRIPTION_PRIMARY,
  }),
  enableTimeout: true,
  timeoutSeconds: 600, // 10 minutes

  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

// ****************************************************************************
// Comprehension checks
// ****************************************************************************
export const COMPREHENSION_CHECK = createComprehensionStage({
  id: 'comprehension_check1',
  game: StageGame.CHP,
  name: 'Comprehension check',
  descriptions: createStageTextConfig({
    primaryText:
      'Please answer the following questions to verify your understanding of the instructions.',
  }),

  questions: [
    createMultipleChoiceComprehensionQuestion(
      {
        questionTitle:
          'In the next stage, you will discuss your responses to the survival task with other participants. What is your objective in this discussion?',
        options: [
          createMultipleChoiceItem({
            id: 'a',
            text: 'Come to a consensus, as a team, on which items to prioritize.',
          }),
          createMultipleChoiceItem({
            id: 'b',
            text: 'Evaluate the other participants for their decision-making abilities, as you will vote on who to represent your group in a following stage.',
          }),
        ],
      },
      'b', // correct answer ID
    ),
    createMultipleChoiceComprehensionQuestion(
      {
        questionTitle: 'What will your bonus payout depend on?',
        options: [
          createMultipleChoiceItem({
            id: 'a',
            text: 'Your score on the survival task.',
          }),
          createMultipleChoiceItem({
            id: 'b',
            text: "The elected leader's score on the survival task.",
          }),
          createMultipleChoiceItem({
            id: 'c',
            text: "One randomly drawn question from either Part 2 (where your own answers determine your payoff) or Part 3 (where the leaders’ answers determine your payoff).",
          }),
        ],
      },
      'c', // correct answer ID
    ),
  ],
});

// ****************************************************************************
// Part 2 Instructions info stage
// ****************************************************************************
const LAS_PART_2_INSTRUCTIONS_INFO_LINES = [
  'You have previously completed the first part of the experiment. You are now about to start the second part.',
  '\n\nFor this part, and for the remainder of the experiment, you will work in groups. You have been randomly assigned to a group with 3 other participants who are taking part in the same experiment today.',
  '\n\nBelow is a general overview of the upcoming part of the experiment. Detailed explanations for each step will follow.',
  '\n\n1. **Group discussion about Part 1 answers**',
  '2. **Opportunity to update your individual answers from Part 1**',
  '3. **Election of a group leader**',
  '\n\n## Group discussion about Part 1 answers',
  'Your group will engage in a free-form chat discussion to evaluate the relative importance of the different items you’ve already seen in Part 1, based on their importance for group survival. More details about the chat will be given later.',
  '\n\n## Opportunity to update your individual answer',
  'After the chat ends, you will have the chance to revise the individual answers you provided in Part 1 of the experiment. You can choose to update your previous answers or to keep them the same.',
  "\n\nIf a question from Part 2 is selected to determine your final payoff, your answers will be evaluated in the same way as in Part 1. Your answers will be compared to a panel of experts' solutions, and you will earn £2 if your answer is correct, and £0 otherwise.",
  '\n\nPlease note that Part 1 and Part 2 of the experiment are independent. Changing answers here will not impact the answers you provided in Part 1.',
  '\n\n## Election of a group leader for Part 3',
  "After the chat, and after you’ve had the chance to update your individual answers, you will be asked to elect a group leader who will play a crucial role in Part 3 of the experiment. In Part 3, your group will repeat the same task as in Part 1, but with different pairs of items. The leader’s answers regarding the most important items for survival will determine the team's final payoff.",
];

const LAS_PART_2_INSTRUCTIONS_STAGE = createInfoStage({
  game: StageGame.LAS,
  name: 'Overview of part 2 and 3',
  infoLines: LAS_PART_2_INSTRUCTIONS_INFO_LINES,

});

// ****************************************************************************
// Part 2 Performance Estimation survey stage
// ****************************************************************************
export const LAS_PART_2_PERFORMANCE_ESTIMATION_DESCRIPTION_PRIMARY =
  'Before you start the chat discussion, we would like you to guess how well you did in Part 1 compared to the other 3 members of your group. Please indicate your answer by clicking on one of the options below. If you think you earned the highest number of good answers in your group, click on the first option. If you think you earned the second highest number of good answers, click on the second option, and so on.';

const LAS_PART_2_PERFORMANCE_ESTIMATION_SURVEY_STAGE = createSurveyStage({
  game: StageGame.LAS,
  name: 'Performance estimation',
  descriptions: createStageTextConfig({
    primaryText: LAS_PART_2_PERFORMANCE_ESTIMATION_DESCRIPTION_PRIMARY,
  }),
  questions: [
    createMultipleChoiceSurveyQuestion({
      questionTitle:
        'How well do you think you did compared to the other members of your group?',
      options: [
        {
          id: '1',
          imageId: '',
          text: 'My score was the best',
        },
        {
          id: '2',
          imageId: '',
          text: 'My score was the second best',
        },
        {
          id: '3',
          imageId: '',
          text: 'My score was the third best',
        },
        {
          id: '4',
          imageId: '',
          text: 'My score was the fourth best',
        },
      ],
    }),
  ],
});

// ****************************************************************************
// Part 2 Group Discussion Instructions info stage
// ****************************************************************************
const LAS_PART_2_GROUP_INSTRUCTIONS_INFO_LINES = [
  '## Group discussion about Part 1 answers',
  'Your group will engage in a free-form chat discussion to evaluate the relative importance of the different items you’ve already seen in Part 1, based on their importance for group survival. More details about the chat will be given later.',
  '## Opportunity to update your individual answer',
  'After the chat ends, you will have the chance to revise the individual answers you provided in Part 1 of the experiment. You can choose to update your previous answers or to keep them the same.',
  'Please note that Part 1 and Part 2 of the experiment are independent. Changing answers here will not impact the answers you provided in Part 1.',
  '## Election of a group leader for Part 3',
  'After the chat, and after you’ve had the chance to update your individual answers, you will be asked to elect a group leader who will play a crucial role in Part 3 of the experiment. In Part 3, your group will repeat the same task as in Part 1, but with different pairs of items. The leader’s answers regarding the most important items for survival will determine the team\'s final payoff.',
  '## Payment for Parts 2 and 3',
  'Your payment for Parts 2 and 3 includes a fixed fee of £6 and a bonus. The bonus is determined by randomly selecting either Part 2 or Part 3.',
  '* If Part 2 is selected: One question is randomly chosen from Part 2. You earn £2 if your answer is correct, and £0 otherwise.',
  '* If Part 3 is selected: One question is randomly chosen from Part 3, with only the leader’s answer counting. You earn £2 if the leader’s answer is correct, and £0 otherwise.',
];

const LAS_PART_2_GROUP_INSTRUCTIONS_STAGE = createInfoStage({
  game: StageGame.LAS,
  name: 'Group discussion instructions',
  infoLines: LAS_PART_2_GROUP_INSTRUCTIONS_INFO_LINES,
});

// ****************************************************************************
// Part 2 Group Discussion chat stage
// ****************************************************************************
const LAS_PART_2_CHAT_DISCUSSIONS = ITEMS_SET_1.map((itemSet) =>
  createCompareChatDiscussion({
    items: [
      {
        id: itemSet[0],
        imageId: getLASItemImageId(itemSet[0]),
        name: LAS_ITEMS[itemSet[0]]?.name ?? '',
      },
      {
        id: itemSet[1],
        imageId: getLASItemImageId(itemSet[1]),
        name: LAS_ITEMS[itemSet[1]]?.name ?? '',
      },
    ],
  }),
);

const LAS_PART_2_CHAT_STAGE = createChatStage({
  game: StageGame.LAS,
  name: 'Group discussion',
  discussions: LAS_PART_2_CHAT_DISCUSSIONS,
  progress: {
    minParticipants: 4,
    waitForAllParticipants: true,
    showParticipantProgress: true,
  },
});

// ****************************************************************************
// Part 2 Updated Task Instructions info stage
// ****************************************************************************
export const LAS_PART_2_UPDATED_TASK_INFO_LINES = [
  'You are now given a chance to update the choices you previously made in Part 1. You can choose to update your previous answers or provide the same answers again.',
  "\n\nIf a question from Part 2 is selected to determine your final payoff, the answers you give on the next screen will be evaluated in the same way as in Part 1. Your answers will be compared to a panel of experts' solutions, and you will earn £2 if your answer is correct, and £0 otherwise.",
  '\n\n*Please note that Part 1 and Part 2 of the experiment are independent. Changing answers here will not impact the answers you provided in Part 1.*',
];

const LAS_PART_2_UPDATED_TASK_INFO_STAGE = createInfoStage({
  game: StageGame.LAS,
  name: 'Update instructions',
  infoLines: LAS_PART_2_UPDATED_TASK_INFO_LINES,
});

// ****************************************************************************
// Part 2 Updated Task survey stage
// ****************************************************************************
export const LAS_PART_2_UPDATED_TASK_SURVEY_STAGE_ID = 'updated';

export const LAS_PART_2_UPDATED_TASK_SURVEY_STAGE = createSurveyStage({
  id: LAS_PART_2_UPDATED_TASK_SURVEY_STAGE_ID,
  game: StageGame.LAS,
  name: 'Updated survival task',
  descriptions: createStageTextConfig({infoText: LAS_SCENARIO_REMINDER}),
  questions: createLASSurvivalSurvey(
    LAS_INDIVIDUAL_ITEMS_MULTIPLE_CHOICE_QUESTIONS,
  ),
});

// ****************************************************************************
// Part 2 Election Instructions info stage
// ****************************************************************************
export const LAS_PART_2_ELECTION_INFO_LINES = [
  'You are now about to elect a group leader who will play a role in the next part of the experiment (Part 3). In Part 3, the same task as in Part 1 will be played, with different pairs of items.',
  "\n\nFor each question, the leader will be responsible for submitting the final answer on behalf of the group. The leader's answers will be evaluated in the same manner as in Parts 1 and 2 and will determine the payoff for all group members. Therefore, if a question from Part 3 is selected to determine your final payoff, it will be the leader's answer that counts.",
  '\n\nBelow is an overview of the election process.',
  '\n\n1. **Indicating interest** - You will first be asked to indicate how much you want to become the group leader on a scale from 1 to 10.',
  '2. **Ranking your teammates** - You will rank your three teammates, with your preferred leader at position 1, the second most preferred leader at position 2, and the third most preferred leader at position 3. You cannot vote for yourself.',
  '\n\nWe will use your answers to these two questions to select the leader:',
  '- The two group members who express the most interest in becoming the leader will be selected as candidates for the election. If several group members choose the same number, the computer will randomly determine the order of these group members.',
  '- The highest-ranked candidate among the two will be elected as leader. If both candidates tie, the decision will be made randomly.',
  '\n\nWith this process, you are asked to rank your team members before knowing who the candidates are. Only the rankings of the two group members who are not candidates will be considered. This ensures that you cannot vote strategically to increase your own chances of being elected as the leader. Therefore, it is in the interest of all group members to provide their true, preferred ranking of the other group members.',
  '\n\nWhile these calculations are being performed, you will be invited to complete Part 3. Keep in mind that your performance might determine everyone’s payoff for this part, as you could potentially be the leader without knowing it yet.',
  '\n\nYou will learn who the candidates were and who is elected as the leader at the end of Part 3. Your score indicating how much you wanted to become the leader will not be disclosed to the group.',
];

const LAS_PART_2_ELECTION_INFO_STAGE = createInfoStage({
  game: StageGame.LAS,
  name: 'Election instructions',
  infoLines: LAS_PART_2_ELECTION_INFO_LINES,
});

// ****************************************************************************
// Part 2 updated willingness to lead - survey stage
// ****************************************************************************
export const LAS_PART_2_WTL_DESCRIPTION_PRIMARY =
  'Please indicate your willingness to become the group leader, which may or may not have changed. As a reminder, your group must elect a leader whose role is to answer on behalf of the group the same types of questions you have just seen. In this scenario, the leader is the only one who chooses the most useful items for survival from pairs, and their answers determine the payment for each member of the group.';

const LAS_PART_2_WTL_SURVEY_STAGE = createSurveyStage({
  id: LAS_WTL_STAGE_ID,
  game: StageGame.LAS,
  name: 'Willingness to lead update',
  descriptions: createStageTextConfig({
    primaryText: LAS_PART_2_WTL_DESCRIPTION_PRIMARY,
  }),
  questions: [
    createScaleSurveyQuestion({
      id: LAS_WTL_QUESTION_ID,
      questionTitle:
        'How much would you like to become the group leader in Part 3?',
      upperText: 'Very much',
      lowerText: 'Not at all',
    }),
  ],
});

// ****************************************************************************
// Part 2 Election - election stage
// ****************************************************************************
export const LAS_PART_2_ELECTION_STAGE_ID = 'election';

export const LAS_PART_2_ELECTION_DESCRIPTION_PRIMARY = `On this page, you will submit your vote for who should become the group leader. Below, you see a list of the other members of your group. Cast your vote by ranking the other group members according to who you would like to see lead your group.\n\n*Remember, you cannot affect your own chances of being elected. If you are one of the two candidates in the election, your vote doesn't count for the outcome of the election. Therefore, it is in your best interest to rank all group members based on who you would like to see lead the group.*`;

export const LAS_PART_2_ELECTION_STAGE = createRankingStage({
  id: LAS_PART_2_ELECTION_STAGE_ID,
  game: StageGame.LAS,
  name: 'Representative election',
  descriptions: createStageTextConfig({
    primaryText: LAS_PART_2_ELECTION_DESCRIPTION_PRIMARY,
  }),
});

// Rankings
export const LAS_PART_2_ACCURACY_RANK = createRankingStage({
  id: 'accuracy_ranking',
  game: StageGame.LAS,
  name: 'Accuracy ranking',
  descriptions: createStageTextConfig({
    primaryText:
      'Now, we will ask a few questions about your evaluation of the other group members. Please rank the members of your group (including you) in order of who you think performed the best on the task, from top performing (top) to lowest performing (bottom).',
  }),
  enableSelfVoting: true,
  progress: createStageProgressConfig({waitForAllParticipants: false}),
});

export const LAS_PART_2_CONFIDENCE_RANK = createRankingStage({
  id: 'confidence_ranking',
  game: StageGame.LAS,
  name: 'Confidence ranking',
  descriptions: createStageTextConfig({
    primaryText:
      'Please rank the members of your group (including you) in order of how confident you think they were in their answers to the task, from most confident (top) to least confident (bottom).',
  }),
  enableSelfVoting: true,
  progress: createStageProgressConfig({waitForAllParticipants: false}),
});

export const LAS_PART_2_WTL_RANK = createRankingStage({
  id: 'willingness_to_lead_ranking',
  game: StageGame.LAS,
  name: 'Willingness to lead ranking',
  descriptions: createStageTextConfig({
    primaryText:
      'Earlier, you were asked your willingness to become the group leader, on a scale from 1 to 10. Please rank the members of your group (including you) in order of how much you think they are willing to lead, from most willing (top) to least willing (bottom).',
  }),
  enableSelfVoting: true,
  progress: createStageProgressConfig({waitForAllParticipants: false}),
});

export const LAS_PART_2_ELECTION_RANK = createRankingStage({
  id: 'election_rank',
  game: StageGame.LAS,
  name: 'Hypothesized election ranking',
  descriptions: createStageTextConfig({
    primaryText:
      "Earlier, you cast a vote for who you think should become the group leader. Now, we would like for you to think about how others might vote. Please rank the members of your group (including you) in the order of how likely you believe each individual is to be elected as the group's leader, from most likely (top) to least likely (bottom).",
  }),
  enableSelfVoting: true,
  progress: createStageProgressConfig({waitForAllParticipants: false}),
});

export const LAS_PART_2_GENDER_GUESS = createSurveyPerParticipantStage({
  id: 'gender_guess',
  game: StageGame.LAS,
  name: 'Gender survey',
  descriptions: createStageTextConfig({
    primaryText:
      'Everyone\'s gender remains anonymous throughout this experiment. However, we now ask you to indicate the gender you believe other participants in your group identify as. If you need help recalling group members, you can revisit previous stages of the experiment, such as Stage 11: "Group Discussion," by using the menu on the left.',
  }),
  questions: [
    createMultipleChoiceSurveyQuestion({
      questionTitle:
        'Which gender do you think that this participant identifies as?',
      options: [
        {
          id: '1',
          imageId: '',
          text: 'Male',
        },
        {
          id: '2',
          imageId: '',
          text: 'Female',
        },
        {
          id: '3',
          imageId: '',
          text: 'Neither / prefer not to say',
        },
      ],
    }),
    createTextSurveyQuestion({
      questionTitle: 'Explain your reasoning for your guess of gender.',
    }),
  ],
});

// ****************************************************************************
// Part 3 Instructions info stage
// ****************************************************************************
const LAS_PART_3_INSTRUCTIONS_INFO_LINES = [
  'You are invited to complete Part 3, while the computer gathers information to determine who the elected leader is. In this part, everyone will complete the same task as in Part 1, but with a new set of questions. However, only the leader’s answers will determine the payoff for this task.',
  '\n\nSince you could potentially be the leader without knowing it yet, keep in mind that your performance might determine everyone’s payoff for this part.',
  "\n\nFor each question, the leader's answers will be evaluated in the same manner as in Part 1 and will determine the payoff for all group members. Thus, if a question from Part 3 is selected to determine your final payoff, it will be the leader's answer that counts.",
  '\n\nAfter the task ends, the entire group will be informed who the candidates were and who was elected as the leader. Your score indicating how much you wanted to become the leader will not be disclosed to the group.',
];

const LAS_PART_3_INSTRUCTIONS_STAGE = createInfoStage({
  game: StageGame.LAS,
  name: 'Part 3 instructions',
  infoLines: LAS_PART_3_INSTRUCTIONS_INFO_LINES,
});

// ****************************************************************************
// Part 3 Leader Task survey stage
// ****************************************************************************
export const LAS_PART_3_LEADER_TASK_SURVEY_ID = 'representative';

export const LAS_PART_3_LEADER_TASK_SURVEY_STAGE = createSurveyStage({
  id: LAS_PART_3_LEADER_TASK_SURVEY_ID,
  game: StageGame.LAS,
  name: 'Representative task',
  descriptions: createStageTextConfig({infoText: LAS_SCENARIO_REMINDER}),
  questions: createLASSurvivalSurvey(
    LAS_LEADER_ITEMS_MULTIPLE_CHOICE_QUESTIONS,
  ),
});

// ****************************************************************************
// Part 3 reveal stage
// ****************************************************************************
export const LAS_PART_3_REVEAL_DESCRIPTION_PRIMARY =
  'Here are the results from the task.';

export const LAS_PART_3_REVEAL_DESCRIPTION_INFO = `An explanation of the results can be found [here](https://raw.githubusercontent.com/PAIR-code/deliberate-lab/main/frontend/src/assets/lost_at_sea/lost_at_sea_answers.pdf).`;

export const LAS_PART_3_REVEAL_STAGE = createRevealStage({
  game: StageGame.LAS,
  name: 'Results reveal',
  descriptions: createStageTextConfig({
    infoText: LAS_PART_3_REVEAL_DESCRIPTION_INFO,
    primaryText: LAS_PART_3_REVEAL_DESCRIPTION_PRIMARY,
  }),
  items: [
    createRankingRevealItem({
      id: LAS_PART_2_ELECTION_STAGE_ID,
    }),
    createSurveyRevealItem({
      id: LAS_PART_3_LEADER_TASK_SURVEY_ID,
      revealAudience: RevealAudience.ALL_PARTICIPANTS,
      revealScorableOnly: true,
    }),
  ],
});

// ****************************************************************************
// Payout Breakdown info stage
// ****************************************************************************
export const LAS_PAYMENT_PART_1_DESCRIPTION = `Your payment for Part 1 includes a fixed fee of £3 and a bonus. The bonus is determined by randomly selecting one question from Part 1. If your answer to this question is correct, you earn £2; otherwise, you earn £0.`;

export const LAS_PAYMENT_PARTS_2_AND_3_DESCRIPTION = `Your payment for Parts 2 and 3 includes a fixed fee of £6 and a bonus. The bonus is determined by randomly selecting either Part 2 or Part 3.`;

export const LAS_PAYMENT_PART_2_DESCRIPTION = `One question is randomly chosen from Part 2. You earn £2 if your answer is correct, and £0 otherwise.`;

export const LAS_PAYMENT_PART_3_DESCRIPTION = `One question is randomly chosen from Part 3, with only the leader’s answer counting. You earn £2 if the leader’s answer is correct, and £0 otherwise.`;

export const LAS_PAYMENT_INSTRUCTIONS = [
  '## Part 1 Payment:',
  LAS_PAYMENT_PART_1_DESCRIPTION,
  '\n\n## Payment for Parts 2 and 3:',
  LAS_PAYMENT_PARTS_2_AND_3_DESCRIPTION,
  `* If Part 2 is selected: ${LAS_PAYMENT_PART_2_DESCRIPTION}`,
  `* If Part 3 is selected: ${LAS_PAYMENT_PART_3_DESCRIPTION}`,
  '**Note: These payments will be translated into the currency of your specification when they are paid out to you on the Prolific platform. Please allow us 24-48 hours to process the payments.**',
];

export const LAS_PAYMENT_INSTRUCTIONS_ALL = [
  ...LAS_PAYMENT_INSTRUCTIONS,
  'On the next page, you can see which part and question were selected and whether you received the bonus.',
];

const LAS_PAYOUT_INFO_STAGE = createInfoStage({
  game: StageGame.LAS,
  name: 'Payment breakdown',
  infoLines: LAS_PAYMENT_INSTRUCTIONS_ALL,
});

// ****************************************************************************
// Payout stage
// ****************************************************************************

export function createLASPayoutItems() {
  const part1 = createSurveyPayoutItem({
    id: 'payout-part-1',
    name: 'Part 1 payoff',
    description: LAS_PAYMENT_PART_1_DESCRIPTION,
    stageId: LAS_PART_1_SURVIVAL_SURVEY_STAGE_ID,
    baseCurrencyAmount: 3,
  });
  const part1Question = choice(LAS_INDIVIDUAL_ITEMS_MULTIPLE_CHOICE_QUESTIONS);
  part1.questionMap[part1Question.id] = 2;

  // Only one payout item with this ID will be selected (at random)
  // for each participant
  const RANDOM_SELECTION_ID = 'las-part';

  const part2 = createSurveyPayoutItem({
    id: 'payout-part-2',
    randomSelectionId: RANDOM_SELECTION_ID,
    name: 'Parts 2 and 3 payoff - Part 2 selected',
    description: [
      LAS_PAYMENT_PARTS_2_AND_3_DESCRIPTION,
      LAS_PAYMENT_PART_2_DESCRIPTION,
    ].join('\n\n'),
    stageId: LAS_PART_2_UPDATED_TASK_SURVEY_STAGE_ID,
    baseCurrencyAmount: 6,
  });
  const part2Question = choice(LAS_INDIVIDUAL_ITEMS_MULTIPLE_CHOICE_QUESTIONS);
  part2.questionMap[part2Question.id] = 2;

  const part3 = createSurveyPayoutItem({
    id: 'payout-part-3',
    randomSelectionId: RANDOM_SELECTION_ID,
    name: 'Parts 2 and 3 payoff - Part 3 selected',
    description: [
      LAS_PAYMENT_PARTS_2_AND_3_DESCRIPTION,
      LAS_PAYMENT_PART_3_DESCRIPTION,
    ].join('\n\n'),
    stageId: LAS_PART_3_LEADER_TASK_SURVEY_ID,
    baseCurrencyAmount: 6,
    rankingStageId: LAS_PART_2_ELECTION_STAGE_ID,
  });
  const part3Question = choice(LAS_LEADER_ITEMS_MULTIPLE_CHOICE_QUESTIONS);
  part3.questionMap[part3Question.id] = 2;

  return [part1, part2, part3];
}

const LAS_PAYOUT_STAGE = createPayoutStage({
  id: 'payout',
  game: StageGame.LAS,
  currency: PayoutCurrency.GBP,
  descriptions: createStageTextConfig({
    infoText: LAS_PAYMENT_INSTRUCTIONS.join('\n'),
  }),
  payoutItems: createLASPayoutItems(),
});

// ****************************************************************************
// Final survey stage
// ****************************************************************************
const LAS_FINAL_DESCRIPTION_PRIMARY = `Thank you for participating in this experiment. After completing the final survey, clicking 'End experiment' will redirect you to Prolific.`;

export const LAS_FINAL_SURVEY_QUESTIONS: SurveyQuestion[] = [
   {
    id: '0',
    kind: SurveyQuestionKind.TEXT,
    questionTitle:
      'During the experiment, you were asked to rank the members of your group based on who you believed should become the group leader. Can you explain the reasons behind your ranking? Please provide specific and concrete arguments for your choices.',
  },
  {
    id: '1',
    kind: SurveyQuestionKind.SCALE,
    questionTitle:
      'On the scale from 1 to 10, how satisfied are you by the leader’s performance in this task? (if you’re the leader, rate your own performance)',
    lowerText: 'Not at all satisfied',
    lowerValue: 0,
    upperText: 'Very satisfied',
    upperValue: 10,
  },
 {
    id: '2',
    kind: SurveyQuestionKind.TEXT,
    questionTitle:
      'Consider the survival task performed in this study. Did you have any prior knowledge or experience in the domain of survival that could have helped you solve the task? If yes, please share specific memories or experiences that explain your answer.',
  },

  {
    id: '3',
    kind: SurveyQuestionKind.TEXT,
    questionTitle:
      'Do you have previous experience of leadership activities? If yes, please share specific memories or experiences that explain your answer.',
  },
  {
    id: '4',
    kind: SurveyQuestionKind.SCALE,
    questionTitle:
      'In general, how willing or unwilling are you to take risks on a scale from 0 to 10?',
    lowerText: 'Completely unwilling to take risks',
    lowerValue: 0,
    upperText: 'Very willing to take risks',
    upperValue: 10,
  },
  {
    id: '5',
    kind: SurveyQuestionKind.SCALE,
    questionTitle:
      'Consider the survival task performed in this study. On average, do you think that men are better at such tasks, that men and women are equally good, or that women are better?',
    lowerText: 'Men are better',
    lowerValue: 0,
    upperText: 'Women are better',
    upperValue: 10,
  },
  {
    id: '6',
    kind: SurveyQuestionKind.SCALE,
    questionTitle:
      'On average, do you think that men are better leaders, that men and women are equally good leaders, or that women are better leaders.',
    lowerText: 'Men are better',
    lowerValue: 0,
    upperText: 'Women are better',
    upperValue: 10,
  },
  {
    id: '7',
    kind: SurveyQuestionKind.TEXT,
    questionTitle:
      'Would you like to share any more context about your reasoning in this task?',
  },
  {
    id: '8',
    kind: SurveyQuestionKind.TEXT,
    questionTitle: 'Would you like to share any feedback about the task?',
  },
];

const LAS_FINAL_SURVEY_STAGE = createSurveyStage({
  game: StageGame.LAS,
  name: 'Final survey',
  descriptions: createStageTextConfig({
    primaryText: LAS_FINAL_DESCRIPTION_PRIMARY,
  }),
  questions: LAS_FINAL_SURVEY_QUESTIONS,
});
