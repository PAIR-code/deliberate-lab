/**
 * Leadership Rejection (LR) Experiment Template
 * Adapted from Lost at Sea (v4)
 *
 * Features:
 * - Two baseline individual tasks used to compute performance
 * - Performance-weighted probabilistic leader selection
 * - Multiple rounds with application, selection, feedback
 */

import {
  Experiment,
  MultipleChoiceSurveyQuestion,
  PayoutCurrency,
  ProfileType,
  StageConfig,
  StageKind,
  SurveyQuestion,
  SurveyQuestionKind,
  ParticipantProfile,
  ParticipantProfileBase,
  ParticipantProfileExtended,
  choice,
  createExperimentConfig,
  createInfoStage,
  createMultipleChoiceItem,
  createPayoutStage,
  createProfileStage,
  createMetadataConfig,
  createMultipleChoiceSurveyQuestion,
  createMultipleChoiceComprehensionQuestion,
  createRevealStage,
  createRankingRevealItem,
  createScaleSurveyQuestion,
  createStageTextConfig,
  createSurveyPayoutItem,
  createSurveyRevealItem,
  createSurveyStage,
  createTextSurveyQuestion,
  createTOSStage,
  createTransferStage,
  createStageProgressConfig,
  randint,
  RevealAudience,
  LRRankingStagePublicData,
  LAS_WTL_QUESTION_ID,
  LR_BASELINE_TASK1_ID,
  LR_BASELINE_TASK2_ID,
  r1_apply,
  createRankingStage,
} from '@deliberation-lab/utils';
import {mustWaitForAllParticipants} from '../experiment.utils';
import {
  LAS_PART_2_ELECTION_STAGE_ID,
  LAS_PART_3_LEADER_TASK_SURVEY_ID,
  LAS_PART_3_REVEAL_DESCRIPTION_INFO,
  LAS_PART_3_REVEAL_DESCRIPTION_PRIMARY,
} from './lost_at_sea';

// ****************************************************************************
// Experiment config
// ****************************************************************************

export const LR_METADATA = createMetadataConfig({
  name: '🎯 Leadership Rejection',
  publicName: 'Decision-making Experiment',
  description:
    'A multi-round experiment examining individual and group decision-making.',
});

/** Custom reveal item with render callback
interface CustomRevealItem {
  id: string;
  revealAudience: RevealAudience;
  revealScorableOnly: boolean;
  renderMessage: (
    participant: ParticipantProfileExtended,
    publicStageData: LRRankingStagePublicData,
  ) => string;
}
**/

/* ---------------------------------------------------------------------------
 * Stage flow
 * ------------------------------------------------------------------------- */
export function getLeadershipRejectionStageConfigs(): StageConfig[] {
  const stages: StageConfig[] = [];

  // Consent / intro
  stages.push(LR_TOS_STAGE);
  stages.push(LR_INTRO_STAGE);

  // Profile
  stages.push(LR_PERSONAL_INFO_STAGE);
  stages.push(LR_PROFILE_STAGE);

  //Individual stage
  stages.push(LR_P1_TASK1_INSTRUCTIONS_STAGE);
  stages.push(LR_BASELINE_TASK_1);
  stages.push(LR_P1_TASK2_INSTRUCTIONS_STAGE);
  stages.push(LR_BASELINE_TASK_2);
  stages.push(LR_BASELINE_CONFIDENCE);

  // Transfer
  stages.push(LR_TRANSFER_STAGE);

  // Group Stage - Round 1
  stages.push(LR_R1_INSTRUCTIONS);
  stages.push(LR_R1_APPLY_STAGE);
  stages.push(LR_R1_BELIEF_CANDIDATES);
  stages.push(LR_R1_INSTRUCTIONS_GROUP);
  stages.push(LR_R1_GROUP_TASK_STAGE);
  // stages.push(LR_R1_SELECTION_STAGE);
  stages.push(LR_R1_STATUS_FEEDBACK_STAGE);
  stages.push(LR_R1_BELIEF_STAGE);

  // Group Stage - Round 2
  stages.push(LR_R2_INSTRUCTIONS);
  stages.push(LR_R2_APPLY_STAGE);
  stages.push(LR_R2_BELIEF_CANDIDATES);
  stages.push(LR_R2_INSTRUCTIONS_GROUP);
  stages.push(LR_R2_GROUP_TASK_STAGE);
  //stages.push(LR_R2_STATUS_FEEDBACK_STAGE);
  stages.push(LR_R2_BELIEF_STAGE);

  // Group Stage - Hypothetical Round 3
  stages.push(LR_R3_INSTRUCTIONS);
  stages.push(LR_R3_APPLY_STAGE);

  // Final feedback, survey, payout
  // stages.push(LR_FEEDBACK_STAGE);
  // stages.push(LR_FINAL_SURVEY_STAGE);
  // stages.push(LR_PAYOUT_STAGE);

  return stages;
}

// ****************************************************************************
// Shared constants and functions
// ****************************************************************************

/*NEW TASK: SURVIVAL IN THE DESERT: */
export const SD_SCENARIO_REMINDER =
  'Here is a reminder of the scenario:\n\n You have crash-landed in the desert. Evaluate which of the two items is most useful for your survival...';

interface SDItem {
  name: string;
  ranking: number;
}
export const SD_ITEMS: Record<string, SDItem> = {
  mirror: {name: 'A Mirror', ranking: 1},
  raincoat: {name: 'A plastic raincoat per Person', ranking: 2},
  water: {name: 'Water (2L / per Person)', ranking: 3},
  flashlight: {name: 'A flashlight with 4 batteries', ranking: 4},
  parachute: {name: 'A Parachute (red and white)', ranking: 5},
  knife: {name: 'A Folding Knife', ranking: 6},
  pistol: {name: 'A .45 Calibre Pistol (loaded)', ranking: 7},
  aid: {name: 'A First-Aid Kit', ranking: 8},
  book: {name: 'A book titled “Edible Animals in the Desert”', ranking: 9},
  salt: {name: 'A bottle of salt tablets', ranking: 10},
};

//export function getSDItemImageId(itemId: string) {
// return `https://raw.githubusercontent.com/PAIR-code/deliberate-lab/refs/heads/main/frontend/assets/survival_desert/${itemId}.jpg`;
//}
export function getSDItemImageId(itemId: string) {
  return `https://raw.githubusercontent.com/clebouleau/deliberate-lab/main/frontend/assets/survival_desert/${itemId}.jpg`;
}

export const SD_ITEM_MULTIPLE_CHOICE_QUESTION_TITLE =
  'Choose the item that would be more helpful to your survival.';

export const SD_ITEM_SCALE_QUESTION_TITLE =
  'How confident are you that your answer is correct?';

export const ITEMS_SD_SET_1: Array<[string, string]> = [
  ['salt', 'raincoat'],
  ['parachute', 'pistol'],
  ['water', 'knife'],
  ['aid', 'mirror'],
  ['flashlight', 'book'],
];

export const ITEMS_SD_SET_2: Array<[string, string]> = [
  ['mirror', 'book'],
  ['flashlight', 'knife'],
  ['parachute', 'aid'],
  ['water', 'salt'],
  ['pistol', 'raincoat'],
];

export const SD_INDIVIDUAL_ITEMS_MULTIPLE_CHOICE_QUESTIONS: MultipleChoiceSurveyQuestion[] =
  ITEMS_SD_SET_1.map((itemSet) =>
    createSDMultipleChoiceQuestion(itemSet[0], itemSet[1]),
  );

export const SD_LEADER_ITEMS_MULTIPLE_CHOICE_QUESTIONS: MultipleChoiceSurveyQuestion[] =
  ITEMS_SD_SET_2.map((itemSet) =>
    createSDMultipleChoiceQuestion(itemSet[0], itemSet[1]),
  );

export function createSDSurvivalSurvey(
  itemQuestions: MultipleChoiceSurveyQuestion[],
) {
  const questions: SurveyQuestion[] = [];
  itemQuestions.forEach((question) => {
    questions.push(question);
    questions.push(
      createScaleSurveyQuestion({
        questionTitle: SD_ITEM_SCALE_QUESTION_TITLE,
        upperText: 'Very confident',
        lowerText: 'Not confident',
      }),
    );
  });
  return questions;
}

export function getCorrectSDAnswer(id1: string, id2: string): string {
  const item1 = SD_ITEMS[id1];
  const item2 = SD_ITEMS[id2];
  if (!item1 || !item2) return '';

  return item1.ranking < item2.ranking ? id1 : id2;
}

export function createSDMultipleChoiceQuestion(
  id1: string,
  id2: string,
): MultipleChoiceSurveyQuestion {
  return {
    id: `sd-${id1}-${id2}`,
    kind: SurveyQuestionKind.MULTIPLE_CHOICE,
    questionTitle: SD_ITEM_MULTIPLE_CHOICE_QUESTION_TITLE,
    options: [
      {
        id: id1,
        imageId: getSDItemImageId(id1),
        text: SD_ITEMS[id1]?.name ?? '',
      },
      {
        id: id2,
        imageId: getSDItemImageId(id2),
        text: SD_ITEMS[id2]?.name ?? '',
      },
    ],
    correctAnswerId: getCorrectSDAnswer(id1, id2),
  };
}

/*LAS TASK */

export const LAS_SCENARIO_REMINDER =
  'Here is a reminder of the scenario:\n\nYou and your friends are on a yacht trip across the Atlantic. A fire breaks out, and the skipper and crew are lost. The yacht is sinking, and your location is unclear.\nYou have saved 10 items, a life raft, and a box of matches.\n\nEvaluate the relative importance of items in each presented pair by selecting the one you believe is most useful. You can earn £2 per correct answer if that question is drawn to determine your payoff.';

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

// ─────────────────────────────────────────────────────────────────────────────
//  Terms of Service
// ─────────────────────────────────────────────────────────────────────────────
const LR_TOS_LINES = [
  'Thank you for participating in this study.',
  'This research is conducted by the Paris School of Economics and has been approved by their institutional review board for [ethical standards](https://www.parisschoolofeconomics.eu/a-propos-de-pse/engagements-ethiques/integrite-scientifique/).',
  'The study will take approximately 15 minutes, with an additional 30 minutes if you are selected for the second round. Detailed instructions about the compensation will be provided in the relevant sections.',
  'By participating, you agree that your responses, including basic demographic information, will be saved. No identifiable personal data will be collected. All data will be anonymized and used solely for scientific research. Your data will not be shared with third parties.',
  "By ticking the box below and clicking 'Next,' you accept these terms and proceed with the study.",
  '\n\nIf you have any questions, you can write to us at pse.experimenter@gmail.com.',
];

const LR_TOS_STAGE = createTOSStage({
  tosLines: LR_TOS_LINES,
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

// ****************************************************************************
// Intro info stage
// ****************************************************************************
const LR_INTRO_INFO_DESCRIPTION_PRIMARY = `This experiment is part of a research project that explores human decisions in various online environments. You will play an engaging game that presents a survival scenario, and answer questions. You may also interact with others during the experiment.`;

const LR_INTRO_INFO_LINES = [
  'You will receive a **fixed fee of £3** for your participation, with an opportunity to earn a **£2 bonus**. We will explain precisely how your bonus is determined later.',
  'At the end of the experiment, you will be redirected to a waiting page. This waiting time is part of the experiment and has been factored into your payment. **You will not be approved for the payout if you do not remain on this waiting page for the full requested duration**.',
  'During this waiting time, you may be invited to continue the experiment by completing two additional parts, Part 2 and Part 3. These parts will be played in *groups of four*, and should take an estimated additional 30 minutes.  You will receive a **fixed fee of £6 for completing Parts 2 and 3. Additionally, you will have the opportunity to earn a **£2 bonus**, based on your decisions and the decisions of other participants  in these parts. One of the 2 parts will be randomly selected to determine this bonus.',
  "To sum up:\n\n* You'll complete a first part *individually*, and then wait to see if you are selected to take part in the next part of the experiment.\n* You need to wait the full amount of time to get your payoff for Part 1, even though you are not selected or choose to leave the experiment.\n* If you receive an invitation, you can then start the rest of the experiment, that is played in *groups of 6 participants*.",
  '💸 Your payments will be translated into the currency of your specification when they are paid out to you on the Prolific platform. **Please allow us 24-48 hours to process the payments.**',
  '‼️ If you experience technical difficulties during the study, **please message the experiment administrators on Prolific as soon as possible.**',
  'Please click “Next stage” to proceed.',
];

const LR_INTRO_STAGE = createInfoStage({
  name: 'Welcome to the experiment',
  descriptions: createStageTextConfig({
    primaryText: LR_INTRO_INFO_DESCRIPTION_PRIMARY,
  }),
  infoLines: LR_INTRO_INFO_LINES,
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

const LR_PERSONAL_INFO_STAGE = createSurveyStage({
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

const LR_PROFILE_STAGE = createProfileStage({
  id: 'profile',
  name: 'View randomly assigned profile',
  descriptions: createStageTextConfig({
    primaryText: 'This information may be visible to other participants.',
  }),
  profileType: ProfileType.ANONYMOUS_PARTICIPANT,

  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

// ****************************************************************************
// Part 1 - Task 1
// ****************************************************************************

// *******************
// Instructions

const LR_P1_TASK1_INSTRUCTIONS_INFO_LINES = [
  '## Imagine the following scenario:',
  "You have chartered a yacht with three friends for a holiday trip across the Atlantic Ocean. None of you have sailing experience, so you hired an experienced skipper and a two-person crew. In the middle of the Atlantic a fierce fire breaks out in the ship's galley. The skipper and crew have been lost whilst trying to fight the blaze. Much of the yacht is destroyed and is slowly sinking. Vital navigational and radio equipment are damaged, and your location is unclear. Your best estimate is that you are many hundreds of miles from the nearest landfall.",
  '*You and your friends have managed to save 10 items, undamaged and intact after the fire. In addition, you have salvaged a four-man rubber life craft and a box of matches*.',
  '## Your task:',
  'You are asked to **evaluate these 10 items in terms of their importance for your survival, as you wait to be rescued**. The computer will randomly generate pairs of items, and you will select which of the two is the most useful in your situation.',
  '## Payment:',
  "Your answers will be compared to a panel of experts' solutions. At the end of the experiment, a question from Part 1 will be randomly selected to determine your payment for this part. You will receive a £2 bonus if your answer to this question is correct, and £0 otherwise.",
  'Please click “Next stage” to proceed.',
];

const LR_P1_TASK1_INSTRUCTIONS_STAGE = createInfoStage({
  name: 'Part 1 instructions',
  infoLines: LR_P1_TASK1_INSTRUCTIONS_INFO_LINES,

  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

// *******************
// Task 1a

//export const LR_BASELINE_TASK1_ID = 'baseline1';

const LR_BASELINE_TASK_1 = createSurveyStage({
  id: LR_BASELINE_TASK1_ID,
  name: 'Individual survival task baseline 1',
  descriptions: createStageTextConfig({infoText: LAS_SCENARIO_REMINDER}),
  questions: createLASSurvivalSurvey(
    LAS_INDIVIDUAL_ITEMS_MULTIPLE_CHOICE_QUESTIONS,
  ),

  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

// ****************************************************************************
// Part 1 - Task 2
// ****************************************************************************

// *******************
// Instructions

const LR_P1_TASK2_INSTRUCTIONS_INFO_LINES = [
  '## Imagine the following scenario:',
  'It is approximately 10:00 am in mid-July and you, together with three of your friends, have just crash landed in the Atacama Desert in South America. Your light twin-engine plane including the pilot and co-pilot has completely burned out with only the frame remaining. None of you have been injured. The pilot was unable to notify anyone of your position before the crash. However, he had indicated before impact that you were 50 miles from a mining camp, which is the nearest known settlement, and approximately 65 miles off the course that was filed in your Flight Plan. The immediate area is quite flat, except for occasional cacti, and appears to be rather barren. The last weather report indicated that the temperature would reach 110 F today, which means that the temperature at ground level will be 130 F. You are dressed in lightweight clothing-short-sleeved shirts, pants, socks, and street shoes.',
  '*Before your plane caught fire, your group was able to salvage 10 items, undamaged and intact. In addition, Everyone has a handkerchief and collectively, you have 3 packs of cigarettes and a ballpoint pen.*.',
  '## Your task:',
  'You are asked to **evaluate these 10 items in terms of their importance for your survival, as you wait to be rescued**. The computer will randomly generate pairs of items, and you will select which of the two is the most useful in your situation.',
  '## Payment:',
  "Your answers will be compared to a panel of experts' solutions. At the end of the experiment, a question from Part 1 will be randomly selected to determine your payment for this part. You will receive a £2 bonus if your answer to this question is correct, and £0 otherwise.",
  'Please click “Next stage” to proceed.',
];

const LR_P1_TASK2_INSTRUCTIONS_STAGE = createInfoStage({
  name: 'Part 1 instructions',
  infoLines: LR_P1_TASK2_INSTRUCTIONS_INFO_LINES,

  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

// *******************
// Task 1b

// export const LR_BASELINE_TASK2_ID = 'baseline2';

const LR_BASELINE_TASK_2 = createSurveyStage({
  id: LR_BASELINE_TASK2_ID,
  name: 'Individual survival task baseline 2',
  descriptions: createStageTextConfig({infoText: SD_SCENARIO_REMINDER}),
  questions: createSDSurvivalSurvey(
    SD_INDIVIDUAL_ITEMS_MULTIPLE_CHOICE_QUESTIONS,
  ),

  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

// ****************************************************************************
// Part 1 - Confidence Stage
// ****************************************************************************
export const LR_BASELINE_CONF_INFO =
  'We would like you to guess how well you did in Part 1 compared to a sample of 100 other participants who completed the same task before you. Please answer the questions below.';

const LR_BASELINE_CONFIDENCE = createSurveyStage({
  name: 'Performance Estimation',
  descriptions: createStageTextConfig({
    primaryText: LR_BASELINE_CONF_INFO,
  }),
  questions: [
    createMultipleChoiceSurveyQuestion({
      questionTitle:
        'How well do you think you did compared to previous participants?',
      options: [
        {
          id: '1',
          imageId: '',
          text: 'My score is in the top quarter of all participants',
        },
        {
          id: '2',
          imageId: '',
          text: 'My score is in the second quarter (above average)',
        },
        {
          id: '3',
          imageId: '',
          text: 'My score is in the third quarter (below average)',
        },
        {
          id: '4',
          imageId: '',
          text: 'My score is in the bottom quarter',
        },
      ],
    }),
  ],

  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

// ****************************************************************************
// "Lobby" - transfer stage
// ****************************************************************************
export const LR_TRANSFER_DESCRIPTION_PRIMARY =
  'Please wait on this page for up to 10 minutes. There may be attention checks to make sure that you are waiting. If you leave this page before the time is up, you will not be approved for the payout. A link may appear offering you the option to continue to parts 2 and 3 of the experiment. These additional parts will take an estimated *30 minutes*. If you complete these additional parts, you will earn an additional **£6 fixed fee, as well as up to a £2 bonus**. Thank you for your patience.';

export const LR_TRANSFER_STAGE = createTransferStage({
  name: 'Lobby',
  descriptions: createStageTextConfig({
    primaryText: LR_TRANSFER_DESCRIPTION_PRIMARY,
  }),
  enableTimeout: true,
  timeoutSeconds: 600, // 10 minutes

  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

//==========================================================
//==========================================================
//==========================================================
// GROUP STAGE - ROUND 1
//==========================================================
//==========================================================
//==========================================================

//==========================================================
// Info stage
//==========================================================

const LR_R1_INSTRUCTIONS_INFO = [
  `You will now play in a group of 6 participants.`,
  'Each round, one participant is chosen as the leader. The leader’s answers determine the payoff for all group members.',
  'The leader will be chosen based on performance in the initial tasks, combined with a random component.',
  'Better performers have higher chances of being selected, but the process is not fully deterministic.',
];

const LR_R1_INSTRUCTIONS = createInfoStage({
  name: 'Round 1 - Instructions',
  infoLines: LR_R1_INSTRUCTIONS_INFO,
});

//==========================================================
// Application stage
//==========================================================

const LR_R1_APPLY_STAGE = createSurveyStage({
  id: 'r1_apply',
  name: 'Round 1',
  questions: [
    createMultipleChoiceSurveyQuestion({
      id: 'apply_r1',
      questionTitle: 'Would you like to apply to become the leader?',
      options: [
        {id: 'yes', imageId: '', text: 'Yes'},
        {id: 'no', imageId: '', text: 'No'},
      ],
    }),
    createScaleSurveyQuestion({
      id: 'wtl_r1',
      questionTitle:
        'How much do you want to be the leader (0 = not at all, 10 = very much)?',
      lowerText: 'Not at all',
      upperText: 'Very much',
      lowerValue: 0,
      upperValue: 10,
    }),
  ],
});

const LR_R1_BELIEF_CANDIDATES = createSurveyStage({
  id: 'r1_belief_candidate',
  name: 'Round 1 - Survey',
  questions: [
    createScaleSurveyQuestion({
      id: 'r1_belief_candidate',
      questionTitle:
        'How many members of the group applied to the role (excluding you), according to you?',
      lowerText: '0',
      upperText: '5',
      lowerValue: 0,
      upperValue: 5,
    }),
  ],
});

/* //==========================================================
// Selection function (not shown to participant)
//==========================================================*/

/* NEED A FUNCTION TO COMPUTE WHO IS THE SELECTED LEADER BASED ON
    a) performance in individual stages (score Task 1a + score Task 1b)
    b) applications (apply_r1 = yes)
 => Apply a weighted probability lottery to select the leader, where weights depends on i) performance and ii) number of candidates to select
 => If there are no candidates, apply the same mechanism but to all group members
 => On top of that, for each non-candidate (in groups where there is a least one candidate) > consider this participant
  as a hypothetical candidate on top of the real set of candidate and recompute the outcome in this counterfactual reality

Store the status of each participant:
- candidate_accepted
- candidate_rejected
- non_candidate_accepted
- non_candidate_hypo_accepted
- non_candidate_hypo_rejected
*/

//==========================================================
// Group Task 1
//==========================================================

//Instructions
export const LR_R1_INSTRUCTIONS_GROUP_INFO = [
  "You are invited to complete the group task, while the computer gathers information to determine who the selected leader is. In this part, everyone will complete the same task as in Part 1, but with a new set of questions. However, only the leader's answers will determine the payoff for this task.",
  "\n\nSince you could potentially be the leader without knowing it yet, keep in mind that your performance might determine everyone's payoff for this part.",
  "\n\nFor each question, the leader's answers will be evaluated in the same manner as in Part 1 and will determine the payoff for all group members. Thus, if a question from Part 3 is selected to determine your final payoff, it will be the leader's answer that counts.",
  '\n\nAfter the task ends, you will be informed of whether or not you were the leader for this round.',
  'Remember also that in the extreme case where no one applied, you could be selected as the leader. As a result, try to perform to the best of your ability in the following task, regardless of your application status.',
];

export const LR_R1_INSTRUCTIONS_GROUP = createRankingStage({
  id: 'r1_instructions',
  name: 'Round 1 - Task Instructions',
  // infoLines: LR_R1_INSTRUCTIONS_GROUP_INFO,
});

//Task
export const LR_R1_GROUP_TASK_ID = 'grouptask1';

export const LR_R1_GROUP_TASK_STAGE = createSurveyStage({
  id: LR_R1_GROUP_TASK_ID,
  name: 'Group task',
  descriptions: createStageTextConfig({infoText: LAS_SCENARIO_REMINDER}),
  questions: createLASSurvivalSurvey(
    LAS_LEADER_ITEMS_MULTIPLE_CHOICE_QUESTIONS,
  ),
});

//==========================================================
// Feedback Stage
//==========================================================

export const LR_R1_STATUS_FEEDBACK_STAGE = createRevealStage({
  id: 'r1_status_feedback',
  name: 'Round 1 — Leader Selection Result',
  descriptions: createStageTextConfig({
    primaryText: 'Results of leader selection for this round.',
    infoText: 'Please wait until everyone in your group has reached this page.',
  }),
  progress: createStageProgressConfig({
    showParticipantProgress: false,
    waitForAllParticipants: true,
  }),
  items: [
    createRankingRevealItem({
      id: 'r1_instructions',
      customRender: 'leaderStatus', // 🧩 triggers your custom reveal
      revealAudience: RevealAudience.CURRENT_PARTICIPANT,
    }),
  ],
});
/*
function createLeaderStatusRevealStage(
  id: string,
  name: string,
  renderMessage: CustomRevealItem['renderMessage'],
  selectionId: string, // add this argument
) {
  return createRevealStage({
    id,
    name,
    descriptions: createStageTextConfig({
      primaryText: 'Results of leader selection for this round.',
      infoText:
        'Please wait until everyone in your group has reached this page.',
    }),
    progress: createStageProgressConfig({
      showParticipantProgress: false,
    }),
    items: [
      {
        id: selectionId,
        kind: StageKind.Ranking,
        revealAudience: RevealAudience.CURRENT_PARTICIPANT,
        revealScorableOnly: false,
        customRender: 'Chris', // we’ll handle display logic in your frontend UI
      }, // this bypasses TS restriction only here, safely
    ],
  });
}
*/
// ---------------------------------------------------------------------------
// Use it for your reveal stages
// ---------------------------------------------------------------------------
/*
export const LR_R1_STATUS_FEEDBACK_STAGE = createLeaderStatusRevealStage(
  'r1_status_feedback',
  'Round 1 — Leader Selection Result',
  (participant, publicStageData) => {
    const status = publicStageData.leaderStatusMap?.[participant.publicId];
    switch (status) {
      case 'candidate_accepted':
        return '✅ Your application to be the leader in this round was accepted.';
      case 'candidate_rejected':
        return '❌ Your application to be the leader in this round was rejected.';
      case 'non_candidate_accepted':
        return '✅ You did not apply to be the leader, but since no one applied, you were selected.';
      case 'non_candidate_rejected':
        return '❌ You did not apply to be the leader. Since no one applied, everyone was considered, but you were not selected.';
      case 'non_candidate_hypo_selected':
        return '💡 You did not apply to be the leader, and someone else was selected. Had you applied, you would have been selected.';
      case 'non_candidate_hypo_rejected':
        return 'ℹ️ You did not apply to be the leader, and someone else was selected. Had you applied, you would have been rejected.';
      default:
        return '⏳ Waiting for results...';
    }
  },
  'r1_selection', // 👈 this is the Firestore doc id containing LRRankingStagePublicData
);
*/
/* Here we need everyone synchronized !!!

Reveal to participants their status, conditional on
- candidate_accepted
- candidate_rejected
- non_candidate_accepted
- non_candidate_hypo_accepted
- non_candidate_hypo_rejected

The messages should be:
"

 */

//==========================================================
// Attribution beliefs Stage
//==========================================================

const LR_R1_BELIEF_STAGE = createSurveyStage({
  id: 'r1_belief',
  name: 'Belief about Selection Rule',
  questions: [
    createScaleSurveyQuestion({
      id: 'belief_rule_r1',
      questionTitle:
        'How much do you think the result was due to your performance versus chance? (0 = purely random, 100 = purely performance-based)',
      lowerText: 'Purely random',
      upperText: 'Purely performance-based',
      lowerValue: 0,
      upperValue: 100,
    }),
  ],
});

//==========================================================
//==========================================================
//==========================================================
// Group Stage - Round 2
//==========================================================
//==========================================================
//==========================================================

//==========================================================
// Info stage
//==========================================================
export const LR_R2_INSTRUCTIONS_INFO = [
  `You will now start Round 2 with the same group of 6 participants.`,
  'A new leader will be selected using the same rule as before.',
  'The leader’s answers determine the payoff for all group members.',
  'The leader will be chosen based on performance in the initial tasks, combined with a random component.',
  'Better performers have higher chances of being selected, but the process is not fully deterministic.',
];

export const LR_R2_INSTRUCTIONS = createInfoStage({
  name: 'Round 2 - Instructions',
  infoLines: LR_R2_INSTRUCTIONS_INFO,
});

//==========================================================
// Survey stage
//==========================================================

const LR_R2_APPLY_STAGE = createSurveyStage({
  id: 'r2_apply',
  name: 'Round 2',
  questions: [
    createMultipleChoiceSurveyQuestion({
      id: 'apply_r2',
      questionTitle: 'Would you like to apply to become the leader?',
      options: [
        {id: 'yes', imageId: '', text: 'Yes'},
        {id: 'no', imageId: '', text: 'No'},
      ],
    }),
    createScaleSurveyQuestion({
      id: 'wtl_r2',
      questionTitle:
        'How much do you want to be the leader (0 = not at all, 10 = very much)?',
      lowerText: 'Not at all',
      upperText: 'Very much',
      lowerValue: 0,
      upperValue: 10,
    }),
  ],
});

const LR_R2_BELIEF_CANDIDATES = createSurveyStage({
  id: 'r2_belief_candidate',
  name: 'Round 2 - Survey',
  questions: [
    createScaleSurveyQuestion({
      id: 'r1_belief_candidate',
      questionTitle:
        'How many members of the group applied to the role (excluding you), according to you?',
      lowerText: '0',
      upperText: '5',
      lowerValue: 0,
      upperValue: 5,
    }),
  ],
});

//==========================================================
// Group Task
//==========================================================

// Instructions
export const LR_R2_INSTRUCTIONS_GROUP_INFO = [
  "You are invited to complete the group task, while the computer gathers information to determine who the selected leader is. In this part, everyone will complete the same task as in Part 1, but with a new set of questions. However, only the leader's answers will determine the payoff for this task.",
  "\n\nSince you could potentially be the leader without knowing it yet, keep in mind that your performance might determine everyone's payoff for this part.",
  "\n\nFor each question, the leader's answers will be evaluated in the same manner as in Part 1 and will determine the payoff for all group members. Thus, if a question from Part 3 is selected to determine your final payoff, it will be the leader's answer that counts.",
  '\n\nAfter the task ends, you will be informed of whether or not you were the leader for this round.',
  'Remember also that in the extreme case where no one applied, you could be selected as the leader. As a result, try to perform to the best of your ability in the following task, regardless of your application status.',
];

export const LR_R2_INSTRUCTIONS_GROUP = createInfoStage({
  id: 'r2_instructions',
  name: 'Round 2 - Task Instructions',
  infoLines: LR_R2_INSTRUCTIONS_GROUP_INFO,
});

//Task
export const LR_R2_GROUP_TASK_ID = 'grouptask2';

export const LR_R2_GROUP_TASK_STAGE = createSurveyStage({
  id: LR_R2_GROUP_TASK_ID,
  name: 'Group task 2',
  descriptions: createStageTextConfig({infoText: SD_SCENARIO_REMINDER}),
  questions: createSDSurvivalSurvey(SD_LEADER_ITEMS_MULTIPLE_CHOICE_QUESTIONS),
});

//==========================================================
// Feedback Stage
//==========================================================

/* export const LR_R2_STATUS_FEEDBACK_STAGE = createRevealStage({
  id: 'r2_status_feedback',
  name: 'Round 2 — Leader Selection Result',
  descriptions: createStageTextConfig({
    primaryText: 'Results of leader selection for this round.',
    infoText: 'Please wait until everyone in your group has reached this page.',
  }),
  progress: createStageProgressConfig({
    showParticipantProgress: false,
    waitForAllParticipants: true,
  }),
  items: [
    createLRRankingRevealItem({
      id: 'r2_instructions',
      revealAudience: RevealAudience.CURRENT_PARTICIPANT,
      customRender: 'leaderStatus', // 👈 triggers LR-specific rendering
    }),
  ],
});
/*
export const LR_R2_SELECTION_STAGE = createRevealStage({
  id: 'r2_selection',
  name: 'Leader selection (backend only)',
  descriptions: createStageTextConfig({
    infoText: 'Determining leader...',
    primaryText: 'Determining leader...',
  }),
  items: [],
  progress: createStageProgressConfig({
    showParticipantProgress: false,
    waitForAllParticipants: true, // ⏳ ensures all are present
  }),
});
/*

export const LR_R2_STATUS_FEEDBACK_STAGE = createLeaderStatusRevealStage(
  'r2_status_feedback',
  'Round 2 — Leader Selection Result',
  (participant, publicStageData) => {
    const status = publicStageData.leaderStatusMap?.[participant.publicId];
    switch (status) {
      case 'candidate_accepted':
        return '✅ Your application to be the leader in this round was accepted.';
      case 'candidate_rejected':
        return '❌ Your application to be the leader in this round was rejected.';
      case 'non_candidate_accepted':
        return '✅ You did not apply to be the leader, but since no one applied, you were selected.';
      case 'non_candidate_rejected':
        return '❌ You did not apply to be the leader. Since no one applied, everyone was considered, but you were not selected.';
      case 'non_candidate_hypo_selected':
        return '💡 You did not apply to be the leader, and someone else was selected. Had you applied, you would have been selected.';
      case 'non_candidate_hypo_rejected':
        return 'ℹ️ You did not apply to be the leader, and someone else was selected. Had you applied, you would have been rejected.';
      default:
        return '⏳ Waiting for results...';
    }
  },
  'r2_selection',
);

 */
//==========================================================
// Attribution beliefs Stage
//==========================================================

const LR_R2_BELIEF_STAGE = createSurveyStage({
  id: 'r2_belief',
  name: 'Belief about Selection Rule',
  questions: [
    createScaleSurveyQuestion({
      id: 'belief_rule_r2',
      questionTitle:
        'How much do you think the result was due to your performance versus chance? (0 = purely random, 100 = purely performance-based)',
      lowerText: 'Purely random',
      upperText: 'Purely performance-based',
      lowerValue: 0,
      upperValue: 100,
    }),
  ],
});

//==========================================================
//==========================================================
//==========================================================
// Group Stage - Round 3 (hypothetical)
//==========================================================
//==========================================================

//==========================================================
// Info stage
//==========================================================
export const LR_R3_INSTRUCTIONS_INFO = [
  `Imagine you could play a third round.`,
  'A new leader would be selected using the same rule as before.',
  'The leader’s answers determine the payoff for all group members.',
  'The leader will be chosen based on performance in the initial tasks, combined with a random component.',
  'Better performers have higher chances of being selected, but the process is not fully deterministic.',
];

export const LR_R3_INSTRUCTIONS = createInfoStage({
  name: 'Round 3 - Instructions',
  infoLines: LR_R3_INSTRUCTIONS_INFO,
});

//==========================================================
// Survey stage
//==========================================================

const LR_R3_APPLY_STAGE = createSurveyStage({
  id: 'r3_apply',
  name: 'Round 3',
  questions: [
    createMultipleChoiceSurveyQuestion({
      id: 'apply_r3',
      questionTitle:
        'Would you like to apply to become the leader in this hypothetical round?',
      options: [
        {id: 'yes', imageId: '', text: 'Yes'},
        {id: 'no', imageId: '', text: 'No'},
      ],
    }),
    createScaleSurveyQuestion({
      id: 'wtl_r3',
      questionTitle:
        'How much do you want to be the leader (0 = not at all, 10 = very much)?',
      lowerText: 'Not at all',
      upperText: 'Very much',
      lowerValue: 0,
      upperValue: 10,
    }),
  ],
});

//==========================================================
//==========================================================
//==========================================================
//  FINAL FEEDBACK + SURVEY + PAYOUT
//==========================================================
//==========================================================
//==========================================================
// export const LR_FEEDBACK_STAGE_PRIMARY = 'Here are the results from the task.';

// export const LR_FEEDBACK_STAGE_INFO = `An explanation of the results can be found [here](https://raw.githubusercontent.com/PAIR-code/deliberate-lab/main/frontend/src/assets/lost_at_sea/task_answers.pdf).`;

/*
export const LR_FEEDBACK_STAGE = createRevealStage({
  name: 'Results reveal',
  descriptions: createStageTextConfig({
    infoText: LR_FEEDBACK_STAGE_INFO,
    primaryText: LR_FEEDBACK_STAGE_PRIMARY,
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
*/
//FUNCTION ABOVE NEEDS TO BE ADJUSTED TO JUST REVEAL ANSWERS OF THE LEADER IN THE TWO GROUP TASKS
// AND WHETHER CORRECT OR NOT

//==========================================================
//==========================================================
//==========================================================
// Final survey stage
//==========================================================
//==========================================================
//==========================================================

// const LR_FINAL_SURVEY_PRIMARY = `Thank you for participating in this experiment. After completing the final survey, clicking 'End experiment' will redirect you to Prolific.`;
/* export const LR_FINAL_SURVEY_QUESTION: SurveyQuestion[] = [
  createTextSurveyQuestion({
    id: '0',
    questionTitle:
      'During the experiment, you were asked whether wanted to apply to become the group leader. Can you explain the reasons behind your choice? Please provide specific and concrete arguments for your choices.',
  }),
  createScaleSurveyQuestion({
    id: '1',
    questionTitle:
      "On the scale from 1 to 10, how satisfied are you by the leader's performance in the first group task? (if you're the leader, rate your own performance)",
    lowerText: 'Not at all satisfied',
    lowerValue: 0,
    upperText: 'Very satisfied',
    upperValue: 10,
  }),
  createScaleSurveyQuestion({
    id: '1bis',
    questionTitle:
      "On the scale from 1 to 10, how satisfied are you by the leader's performance in the second group task? (if you're the leader, rate your own performance)",
    lowerText: 'Not at all satisfied',
    lowerValue: 0,
    upperText: 'Very satisfied',
    upperValue: 10,
  }),
  createTextSurveyQuestion({
    id: '2',
    questionTitle:
      'Consider the survival task performed in this study. Did you have any prior knowledge or experience in the domain of survival that could have helped you solve the task? If yes, please share specific memories or experiences that explain your answer.',
  }),

  createTextSurveyQuestion({
    id: '3',
    questionTitle:
      'Do you have previous experience of leadership activities? If yes, please share specific memories or experiences that explain your answer.',
  }),
  createScaleSurveyQuestion({
    id: '4',
    questionTitle:
      'In general, how willing or unwilling are you to take risks on a scale from 0 to 10?',
    lowerText: 'Completely unwilling to take risks',
    lowerValue: 0,
    upperText: 'Very willing to take risks',
    upperValue: 10,
  }),
  createScaleSurveyQuestion({
    id: '5',
    questionTitle:
      'Consider the survival task performed in this study. On average, do you think that men are better at such tasks, that men and women are equally good, or that women are better?',
    lowerText: 'Men are better',
    lowerValue: 0,
    upperText: 'Women are better',
    upperValue: 10,
  }),
  createScaleSurveyQuestion({
    id: '6',
    questionTitle:
      'On average, do you think that men are better leaders, that men and women are equally good leaders, or that women are better leaders.',
    lowerText: 'Men are better',
    lowerValue: 0,
    upperText: 'Women are better',
    upperValue: 10,
  }),
  createTextSurveyQuestion({
    id: '7',
    questionTitle:
      'Would you like to share any more context about your reasoning in this task?',
  }),
  createTextSurveyQuestion({
    id: '8',
    questionTitle: 'Would you like to share any feedback about the task?',
  }),
];

const LR_FINAL_SURVEY_STAGE = createSurveyStage({
  name: 'Final survey',
  descriptions: createStageTextConfig({
    primaryText: LR_FINAL_SURVEY_PRIMARY,
  }),
  questions: LR_FINAL_SURVEY_QUESTION,
});

//==========================================================
// * PAYOUT STAGE
//==========================================================

/*Need to create payout function that
a) randomly select one of the four tasks (1a, 1b, 2 or 3)
b) pick one question in this task
c) pay a bonus if answer is correct (if 1a, 1b individual answer, if 2 or 3 leader's answer)
d) randomly select one belief question
(confidence in individual stage, number of candidates in Round 1 pre or post, Round2 pre or post, attribution in Round 1 or in Round 2)
=> reveal which question chosen, and I'll compute the bonus myself with a code to pay it afterwards on Prolific (no need to code it on theplatform)
e) add a £50 bonus for each time one was leader (so up to 1£)


 */
