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
  createLRRankingStage,
} from '@deliberation-lab/utils';
import {mustWaitForAllParticipants} from '../experiment.utils';
import {
  LAS_PART_1_SURVIVAL_SURVEY_STAGE_ID,
  LAS_PART_2_ELECTION_STAGE_ID,
  LAS_PART_2_UPDATED_TASK_SURVEY_STAGE_ID,
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
  stages.push(LR_BASELINE_CONFIDENCE_v2);

  // Transfer
  stages.push(LR_TRANSFER_STAGE);

  // Group Stage - Round 1
  stages.push(LR_R1_INSTRUCTIONS);
  stages.push(LR_R1_APPLY_STAGE);
  stages.push(LR_R1_BELIEF_CANDIDATES);
  stages.push(LR_R1_INSTRUCTIONS_GROUP);
  stages.push(LR_R1_GROUP_TASK_STAGE);
  stages.push(LR_R1_STATUS_FEEDBACK_STAGE);
  stages.push(LR_R1_BELIEF_STAGE);
  stages.push(LR_R1_BELIEF_CANDIDATES_UPDATE);
  stages.push(LR_ROUND1_CONFIDENCE_v2);

  // Group Stage - Round 2
  stages.push(LR_R2_INSTRUCTIONS);
  stages.push(LR_R2_APPLY_STAGE);
  stages.push(LR_R2_BELIEF_CANDIDATES);
  stages.push(LR_R2_INSTRUCTIONS_GROUP);
  stages.push(LR_R2_GROUP_TASK_STAGE);
  stages.push(LR_R2_STATUS_FEEDBACK_STAGE);
  stages.push(LR_R2_BELIEF_STAGE);
  stages.push(LR_R2_BELIEF_CANDIDATES_UPDATE);
  stages.push(LR_ROUND2_CONFIDENCE_v2);

  // Group Stage - Hypothetical Round 3
  //stages.push(LR_R3_INSTRUCTIONS);
  stages.push(LR_R3_APPLY_STAGE);

  // Final feedback, survey, payout
  stages.push(LR_FEEDBACK_STAGE);
  stages.push(LR_FEEDBACK_STAGE_BIS);
  stages.push(LR_PAYOUT_INFO_STAGE);
  stages.push(LR_PAYOUT_STAGE);
  stages.push(LR_SURVEY_STAGE_PRIMARY);
  stages.push(LR_FINAL_SURVEY_STAGE);

  return stages;
}

// ****************************************************************************
// Shared constants and functions
// ****************************************************************************

/*NEW TASK: SURVIVAL IN THE DESERT: */
export const SD_SCENARIO_REMINDER =
  'Here is a reminder of the scenario:\n\nYou have crash-landed in the Desert. The plane has burned out, the pilot is dead, and no one knows your exact location. You and the three other passengers are uninjured but stranded about 70 miles from the nearest known settlement.\nYou managed to save 10 items before the plane caught fire.\n\nEvaluate the relative importance of items in each presented pair by selecting the one you believe is most useful. You can earn £2 per correct answer if that question is drawn to determine your payoff.';

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
  '\nThis research is conducted by the Paris School of Economics and has been approved by their institutional review board for [ethical standards](https://www.parisschoolofeconomics.eu/a-propos-de-pse/engagements-ethiques/integrite-scientifique/).',
  '\nThe study will take approximately 35 minutes. Detailed instructions about the compensation will be provided in the relevant sections.',
  '\n By participating, you agree that your responses, including basic demographic information, will be saved. No identifiable personal data will be collected. All data will be anonymized and used solely for scientific research. Your data will not be shared with third parties.',
  "\n By ticking the box below and clicking 'Next,' you accept these terms and proceed with the study.",
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
const LR_INTRO_INFO_DESCRIPTION_PRIMARY = '';

const LR_INTRO_INFO_LINES = [
  'In this experiment you will play engaging games that present survival scenarios, and answer questions. \n',
  'This experiment consists of two parts:\n\n* Part 1: lasts about 10–15 minutes. \n* Part 2: lasts about 20 minutes.',
  'You will earn a **£5 fixed fee** for completing the full experiment. On top of that, you’ll have the opportunity to earn **bonuses of up to £3**, depending on your own and other participants decisions. At the end of the experiment, one of the tasks you are about to complete will be randomly selected to determine ârt of your bonus payment. On top of that, you can gain additional bonuses in certain questions (more details later).\n',
  '⚠️ At the end of Part 1, you will be redirected to a **waiting page**. This waiting time is part of the experiment and allows us to form groups, as the experiment involves live interactions with other participants in Part 2. **You must remain on this page for the full requested duration—if you leave early or close the study before the waiting period ends, your submission will not be approved.** Once a group is formed, you will be invited to continue to Part 2.\n' +
    '\n\n In rare cases, if we are unable to match you with a group for Part 2 (for example, if there are not enough participants online), you will complete only the first part and still receive a fixed fee for completing the first part.\n',
  'To sum up: You will complete the first part individually, and then wait to be invited to the next part of the experiment in groups. **If your are invited, your submission will only be approved if you do the full experiment**. In the rare case where we could not send you an invitation for Part 2, your submission will still be approved.\n',
  '💸 Your payments will be translated into the currency of your specification when they are paid out to you on the Prolific platform. **Please allow us 24-48 hours to process the payments.**',
  '‼️  This is an interactive experiment. Because of this, there may occasionally be short waiting periods while others make their decisions. These waiting times are already included in the estimated duration and payment. Please remain patient and attentive during these moments.\n ',
  'If you experience technical difficulties during the study, **please message the experiment administrators on Prolific as soon as possible.**',
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
    primaryText:
      'Here is the profile that has been randomly assigned to you. This information may be visible to other participants.',
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
  'At the end of the experiment, one task from the experiment will be randomly selected to determine your bonus payment. Within that task, one question will be chosen at random.',
  'If your answer to that question matches the solutions provided by a panel of experts, you will receive a £2 bonus; otherwise, the bonus will be £0.',
  '⚠️ **Important note: It is possible that your performance on this task will influence later stages of the experiment. Please make sure to stay focused and do your best throughout.**\n',
  'Please click “Next stage” to proceed.',
];

const LR_P1_TASK1_INSTRUCTIONS_STAGE = createInfoStage({
  name: 'Part 1a instructions',
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
  name: 'Part 1a - Survival task',
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
  '## We now ask you to imagine a new scenario:',
  'You and three friends are flying in a small twin-engine plane when it crash-lands in the Atacama Desert. The aircraft has burned out completely, and the pilot and co-pilot did not survive. None of you are injured, but no one was able to report your position before the crash. Shortly before impact, the pilot estimated you were about 50 miles from a mining camp—the nearest known settlement—and roughly 65 miles off your planned route. The immediate area is quite flat, except for occasional cacti, and appears to be rather barren. The last weather report indicated that the temperature would reach 110 F today, which means that the temperature at ground level will be 130 F. You are dressed in lightweight clothing-short-sleeved shirts, pants, socks, and street shoes.',
  'Before your plane caught fire, your group was able to salvage 10 items, undamaged and intact. In addition, everyone has a handkerchief and collectively, you have 3 packs of cigarettes and a ballpoint pen.',
  '## Your task:',
  'You are asked to **evaluate these 10 items in terms of their importance for your survival, as you wait to be rescued**. The computer will randomly generate pairs of items, and you will select which of the two is the most useful in your situation.',
  '## Payment:',
  'At the end of the experiment, one task from the experiment will be randomly selected to determine your bonus payment. Within that task, one question will be chosen at random.',
  'If your answer to that question matches the solutions provided by a panel of experts, you will receive a £2 bonus; otherwise, the bonus will be £0.',
  '⚠️ **Important note: It is possible that your performance on this task will influence later stages of the experiment. Please make sure to stay focused and do your best throughout.**\n',
  'Please click “Next stage” to proceed.',
];

const LR_P1_TASK2_INSTRUCTIONS_STAGE = createInfoStage({
  name: 'Part 1b instructions',
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
  name: 'Part 1b - Survival task',
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
  'You can get an extra bonus for that question. At the end of the experiment, one of the estimation questions (from this or a similar section) will be randomly selected. If your estimation is correct, you will receive an £0.50 extra bonus.';

const LR_BASELINE_CONFIDENCE = createSurveyStage({
  name: 'Part 1 - Performance Estimation',
  descriptions: createStageTextConfig({
    primaryText: LR_BASELINE_CONF_INFO,
  }),
  questions: [
    createMultipleChoiceSurveyQuestion({
      questionTitle:
        'We would like you to guess how well you did in Part 1 compared to a sample of 100 other participants who completed the same task before you. \n\n How well do you think you did compared to previous participants?',
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

export const LR_BASELINE_CONF_INFO_v2 =
  'You can get an extra bonus for these questions. At the end of the experiment, one of the estimation questions (from this or a similar section) will be randomly selected. If your estimation is correct, you will receive an £0.50 extra bonus.';

const LR_BASELINE_CONFIDENCE_v2 = createSurveyStage({
  name: 'Part 1 - Performance Estimation',
  descriptions: createStageTextConfig({
    primaryText: LR_BASELINE_CONF_INFO_v2,
  }),
  questions: [
    createMultipleChoiceSurveyQuestion({
      questionTitle:
        '\n Imagine you were matched with a group of five other participants (so six in total, including you) doing the same task at the moment. Based on your performance in the previous task, please select the option that best reflects your belief about your rank:',
      options: [
        {
          id: '1',
          imageId: '',
          text: 'I would be ranked 1st (the best performer in my group)',
        },
        {
          id: '2',
          imageId: '',
          text: 'I would be ranked 2nd',
        },
        {
          id: '3',
          imageId: '',
          text: 'I would be ranked 3rd',
        },
        {
          id: '4',
          imageId: '',
          text: 'I would be ranked 4th',
        },
        {
          id: '5',
          imageId: '',
          text: 'I would be ranked 5th',
        },
        {
          id: '6',
          imageId: '',
          text: 'I would be ranked 6th (the worst performer in my group)',
        },
      ],
    }),
    createScaleSurveyQuestion({
      id: 'conf_baseline',
      questionTitle:
        'How many questions of the 10 questions do you think you answered correctly in the previous tasks?',
      lowerText: '',
      upperText: '',
      lowerValue: 0,
      upperValue: 10,
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
  'Please wait on this page for up to 10 minutes while we pair you with other participants for the next part of the experiment.' +
  '\n\n During this time, there may be occasional attention checks to ensure that you are waiting and still active.' +
  '\n\n **If you leave this page or close the browser before the time is up, your submission will not be approved for payment.**' +
  '\n\n Once we find a suitable group, a link will appear on this page inviting you to continue to the next part of the experiment. If you decline the invitation, your submission will not be approved, as completing Part 2 is required for full participation.' +
  '\n\n In the rare case that we are unable to find a group for you within 10 minutes, the page will time out automatically. If this happens, your submission will still be approved and you will receive a fixed fee for your participation.' +
  '\n\n The next part will take approximately 20 minutes to complete.' +
  '\n\n This is an interactive experiment, meaning you will be grouped with other participants who are playing at the same time. Because of this, there may occasionally be short waiting periods while others make their decisions. These waiting times are already included in the estimated duration and payment. Please remain patient and attentive during these moments.' +
  'Thank you for your patience!';

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
  `You are now about to start the second part of the Experiment.`,
  'For this part, and for the remainder of the experiment, you will work in groups. You have been randomly assigned to a group with other participants who are taking part in the same experiment today.' +
    '\n\n **A leader will be designated within each group**. The details concerning the role of the leaders and how they are chosen are provided below. \n',
  'The task that you will complete in Part 2a is the same as in the first part of this experiment but with different pairs of items. \n',

  "\n\n **Leader Role**: For each question, the leaders will be responsible for providing an answer on behalf of the group. The leader's answers will be evaluated just as in Part 1 (i.e. compared to the answers given by a panel of experts), and **all members' payoff for this task will be entirely determined by the leader's answers**. Leaders will receive a fixed £0.50 payment for endorsing the role.\n\n",

  '\n\n **Leader Selection**: On the next page, you will be asked whether you would like to apply for the leader role.\n' +
    '* Everyone who chooses to apply will be considered a candidate.\n' +
    '* We will then conduct a weighted lottery based on performance scores in Part 1a and Part 1b:\n' +
    '  * Participants with higher performance scores  higher in Part 1a and 1b have chances of being selected.\n' +
    '  * The top performer (the person who has the highest number of correct answers out of the 10 questions of Part 1a + Part 1b) has the highest chance of being selected.\n' +
    '  * The probability then decreases with rank. For example, if 4 people apply:\n' +
    '    * Best performer → ~60%\n' +
    '    * Second → 30%\n' +
    '    * Third → 8%\n' +
    '    * Fourth → 2%\n' +
    '* If no one applies, all group members will automatically enter the lottery using the same rule.\n\n',

  '\n\n **Timing of the Selection**: To avoid unnecessary waiting, everyone will complete the group task before the leader is revealed. ⚠️ Keep in mind that you could be selected as the leader, so please do your best to maximize your own (and potentially your group’s) payoff during the task.\n\n',

  '\n\n **Payment**: At the end of the experiment, one task will be randomly selected to determine your bonus payment. Within that task, one question will also be chosen at random.\n' +
    'If the selected question comes from Part 2a, the leader’s answer will be used to determine the outcome. You will receive a £2 bonus if the leader’s answer is correct, and £0 otherwise.\n',
];

const LR_R1_INSTRUCTIONS = createInfoStage({
  name: 'Part 2a - Instructions',
  infoLines: LR_R1_INSTRUCTIONS_INFO,
});

//==========================================================
// Application stage
//==========================================================
export const LR_R1_APPLY_STAGE_INFO =
  'As mentioned on the previous page one leader will be appointed in each group. The leader will be chosen through a lottery in which only those who apply are considered, and each applicant’s chance of being selected depends on their performance (with higher performers having higher odds), while if no one applies, all group members enter the lottery under the same rule.' +
  'The leader’s answer will determine everyone’s payoff for this stage of the experiment.\n';

const LR_R1_APPLY_STAGE = createSurveyStage({
  id: 'r1_apply',
  name: 'Part 2a - Apply',
  descriptions: createStageTextConfig({
    primaryText: LR_R1_APPLY_STAGE_INFO,
  }),
  questions: [
    createMultipleChoiceSurveyQuestion({
      id: 'apply_r1',
      questionTitle:
        'Would you like to apply to be the leader of your group for this stage?',
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
  name: 'Part 2a - Survey',
  descriptions: createStageTextConfig({
    primaryText:
      'You can get an extra bonus for that question. At the end of the experiment, one of the estimation questions (from this or a similar section) will be randomly selected. If your estimation is correct, you will receive an £0.50 extra bonus.',
  }),
  questions: [
    createScaleSurveyQuestion({
      id: 'r1_belief_candidate',
      questionTitle:
        'How many members of the group applied to the role (excluding you), according to you?',
      lowerText: '',
      upperText: '',
      lowerValue: 0,
      upperValue: 5,
    }),
  ],
});

//==========================================================
// Group Task 1
//==========================================================

//Instructions
export const LR_R1_INSTRUCTIONS_GROUP_INFO =
  'You will complete the group task, while the computer gathers information to determine who the selected leader is. ' +
  "\n\n Recall that for this task only the leader's answers count." +
  "\n\n  ⚠️ Since you could potentially be the leader without knowing it yet, keep in mind that your performance might determine everyone's payoff for this part." +
  "\n\nAfter the task ends, you will be informed of whether or not you were the leader for this round.'+" +
  'Remember also that in the extreme case where no one applied, you could be selected as the leader. As a result, try to perform to the best of your ability in the following task, regardless of your application status.';

export const LR_R1_INSTRUCTIONS_GROUP = createLRRankingStage({
  id: 'r1_instructions',
  name: 'Part 2a - Task Instructions',
  descriptions: createStageTextConfig({
    primaryText: LR_R1_INSTRUCTIONS_GROUP_INFO,
  }),
  progress: createStageProgressConfig({waitForAllParticipants: true}),
});

//Task
export const LR_R1_GROUP_TASK_ID = 'grouptask1';

export const LR_R1_GROUP_TASK_STAGE = createSurveyStage({
  id: LR_R1_GROUP_TASK_ID,
  name: 'Part 2a - Group task',
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
  name: 'Part 2a — Leader Selection Result',
  descriptions: createStageTextConfig({
    primaryText: 'Results of leader selection for this round.',
    infoText: 'Please wait until everyone in your group has reached this page.',
  }),
  progress: createStageProgressConfig({
    showParticipantProgress: false,
    waitForAllParticipants: false,
  }),
  items: [
    createRankingRevealItem({
      id: 'r1_instructions',
      customRender: 'leaderStatus', // 🧩 triggers your custom reveal
      revealAudience: RevealAudience.CURRENT_PARTICIPANT,
    }),
  ],
});

//==========================================================
// Attribution beliefs Stage
//==========================================================

const LR_R1_BELIEF_STAGE = createSurveyStage({
  id: 'r1_belief',
  name: 'Part 2a - Survey',
  questions: [
    createMultipleChoiceSurveyQuestion({
      id: 'belief_binary_rule_r1',
      questionTitle:
        'Do you think the selected leader had the highest performance score in your group? (If you correctly answer this question you can get an extra £0.50 bonus)',
      options: [
        {id: 'yes', imageId: '', text: 'Yes'},
        {id: 'no', imageId: '', text: 'No'},
      ],
    }),
    createScaleSurveyQuestion({
      id: 'belief_rule_r1',
      questionTitle:
        'Thinking about the result of this round — whether you were selected as leader, not selected, or chose not to apply. To what extent do you think the outcome of the leadership selection was due to performance versus external circumstances/luck?',
      lowerText: 'Entirely due to external factors (luck, randomness)',
      upperText: 'Entirely due to performance',
      lowerValue: 0,
      upperValue: 100,
      useSlider: true,
    }),
  ],
});

const LR_R1_BELIEF_CANDIDATES_UPDATE = createSurveyStage({
  id: 'r1_belief_candidate_update',
  name: 'Part 2a - Survey',
  descriptions: createStageTextConfig({
    primaryText:
      'You can get an extra bonus for that question. At the end of the experiment, one of the estimation questions (from this or a similar section) will be randomly selected. If your estimation is correct, you will receive an £0.50 extra bonus.',
  }),
  questions: [
    createScaleSurveyQuestion({
      id: 'r1_belief_candidate_update',
      questionTitle:
        'We ask you to answer this question again: How many members of the group applied to the role (excluding you), according to you?',
      lowerText: '',
      upperText: '',
      lowerValue: 0,
      upperValue: 5,
    }),
  ],
});
export const LR_ROUND1_CONF_INFO_v2 =
  'You can get an extra bonus for that question. At the end of the experiment, one of the estimation questions (from this or a similar section) will be randomly selected. If your estimation is correct, you will receive an £0.50 extra bonus.';

const LR_ROUND1_CONFIDENCE_v2 = createSurveyStage({
  name: 'Part 2a - Performance Estimation',
  descriptions: createStageTextConfig({
    primaryText: LR_ROUND1_CONF_INFO_v2,
  }),
  questions: [
    createMultipleChoiceSurveyQuestion({
      questionTitle:
        'We would like you to guess how well you did in the previous task compared to other members of your group. Please select the option that best reflects your belief about your rank:',
      options: [
        {
          id: '1',
          imageId: '',
          text: 'I would be ranked 1st (the best performer in my group)',
        },
        {
          id: '2',
          imageId: '',
          text: 'I would be ranked 2nd',
        },
        {
          id: '3',
          imageId: '',
          text: 'I would be ranked 3rd',
        },
        {
          id: '4',
          imageId: '',
          text: 'I would be ranked 4th',
        },
        {
          id: '5',
          imageId: '',
          text: 'I would be ranked 5th',
        },
        {
          id: '6',
          imageId: '',
          text: 'I would be ranked 6th (the worst performer in my group)',
        },
      ],
    }),
    createScaleSurveyQuestion({
      id: 'conf_round1',
      questionTitle:
        'How many of the 5 questions from the previous task do you think you answered correctly?',
      lowerText: '',
      upperText: '',
      lowerValue: 0,
      upperValue: 5,
    }),
  ],
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
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
  `In the next part of the experiment, you are given the chance to select a leader again. The role of the leader, as well as the selection rule, are the same as before.`,
  'The type of task that you will complete in this part is similar to previous survival tasks, but with different pairs of items.',
  'As a reminder, here is how leaders are selected:',
  "\n\n **Leader Role**: For each question, the leaders will be responsible for providing an answer on behalf of the group. The leader's answers will be evaluated just as in Part 1 (i.e. compared to the answers given by a panel of experts), and **all members' payoff for this task will be entirely determined by the leader's answers**. Leaders will receive a fixed £0.50 payment for endorsing the role.\n\n",

  '\n\n **Leader Selection**: On the next page, you will be asked whether you would like to apply for the leader role.\n' +
    '* Everyone who chooses to apply will be considered a candidate.\n' +
    '* We will then conduct a weighted lottery based on performance scores in Part 1a and Part 1b:\n' +
    '  * Participants with higher performance scores  higher in Part 1a and 1b have chances of being selected.\n' +
    '  * The top performer (the person who has the highest number of correct answers out of the 10 questions of Part 1a + Part 1b) has the highest chance of being selected.\n' +
    '  * The probability then decreases with rank. For example, if 4 people apply:\n' +
    '    * Best performer → ~60%\n' +
    '    * Second → 30%\n' +
    '    * Third → 8%\n' +
    '    * Fourth → 2%\n' +
    '* If no one applies, all group members will automatically enter the lottery using the same rule.\n\n',

  '\n\n **Timing of the Selection**: To avoid unnecessary waiting, everyone will complete the group task before the leader is revealed. ⚠️ Keep in mind that you could be selected as the leader, so please do your best to maximize your own (and potentially your group’s) payoff during the task.\n\n',

  '\n\n **Payment**: At the end of the experiment, one task will be randomly selected to determine your bonus payment. Within that task, one question will also be chosen at random.\n' +
    'If the selected question comes from Part 2a, the leader’s answer will be used to determine the outcome. You will receive a £2 bonus if the leader’s answer is correct, and £0 otherwise.\n',
];

export const LR_R2_INSTRUCTIONS = createInfoStage({
  id: 'r2_first_instructions',
  name: 'Part 2b - Instructions',
  progress: createStageProgressConfig({waitForAllParticipants: false}),
  infoLines: LR_R2_INSTRUCTIONS_INFO,
});

//==========================================================
// Survey stage
//==========================================================
export const LR_R2_APPLY_STAGE_INFO =
  'As mentioned on the previous page one leader will be appointed in each group. The leader will be chosen through a lottery in which only those who apply are considered, and each applicant’s chance of being selected depends on their performance (with higher performers having higher odds), while if no one applies, all group members enter the lottery under the same rule.' +
  'The leader’s answer will determine everyone’s payoff for this stage of the experiment.\n';

const LR_R2_APPLY_STAGE = createSurveyStage({
  id: 'r2_apply',
  name: 'Part 2b - Apply',
  descriptions: createStageTextConfig({
    primaryText: LR_R2_APPLY_STAGE_INFO,
  }),
  questions: [
    createMultipleChoiceSurveyQuestion({
      id: 'apply_r2',
      questionTitle:
        'Would you like to apply to be the leader of your group for this stage?',
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
  name: 'Part 2b - Survey',
  descriptions: createStageTextConfig({
    primaryText:
      'You can get an extra bonus for that question. At the end of the experiment, one of the estimation questions (from this or a similar section) will be randomly selected. If your estimation is correct, you will receive an £0.50 extra bonus.',
  }),
  questions: [
    createScaleSurveyQuestion({
      id: 'r2_belief_candidate',
      questionTitle:
        'How many members of the group applied to the role (excluding you), according to you?',
      lowerText: '',
      upperText: '',
      lowerValue: 0,
      upperValue: 5,
    }),
  ],
});

export const LR_R2_INFO_INSTRUCTIONS_GROUP =
  'You will complete the group task, while the computer gathers information to determine who the selected leader is. ' +
  "\n\n Recall that for this task only the leader's answers count." +
  "\n\n  ⚠️ Since you could potentially be the leader without knowing it yet, keep in mind that your performance might determine everyone's payoff for this part." +
  "\n\nAfter the task ends, you will be informed of whether or not you were the leader for this round.'+" +
  'Remember also that in the extreme case where no one applied, you could be selected as the leader. As a result, try to perform to the best of your ability in the following task, regardless of your application status.';

export const LR_R2_INSTRUCTIONS_GROUP = createLRRankingStage({
  id: 'r2_instructions',
  name: 'Part 2b - Task Instructions',
  descriptions: createStageTextConfig({
    primaryText: LR_R2_INFO_INSTRUCTIONS_GROUP,
  }),
  progress: createStageProgressConfig({waitForAllParticipants: true}),
});

// Instructions

//==========================================================
// Group Task
//==========================================================

//Task
export const LR_R2_GROUP_TASK_ID = 'grouptask2';

export const LR_R2_GROUP_TASK_STAGE = createSurveyStage({
  id: LR_R2_GROUP_TASK_ID,
  name: 'Part 2b - Group task',
  descriptions: createStageTextConfig({infoText: SD_SCENARIO_REMINDER}),
  questions: createSDSurvivalSurvey(SD_LEADER_ITEMS_MULTIPLE_CHOICE_QUESTIONS),
});

//==========================================================
// Feedback Stage
//==========================================================

export const LR_R2_STATUS_FEEDBACK_STAGE = createRevealStage({
  id: 'r2_status_feedback',
  name: 'Part 2b — Leader Selection Result',
  descriptions: createStageTextConfig({
    primaryText: 'Results of leader selection for this round.',
    infoText: 'Please wait until everyone in your group has reached this page.',
  }),
  progress: createStageProgressConfig({
    showParticipantProgress: false,
    waitForAllParticipants: false,
  }),
  items: [
    createRankingRevealItem({
      id: 'r2_instructions',
      customRender: 'leaderStatus', // 🧩 triggers your custom reveal
      revealAudience: RevealAudience.CURRENT_PARTICIPANT,
    }),
  ],
});

//==========================================================
// Attribution beliefs Stage
//==========================================================

const LR_R2_BELIEF_STAGE = createSurveyStage({
  id: 'r2_belief',
  name: 'Part 2b - Survey',
  questions: [
    createMultipleChoiceSurveyQuestion({
      id: 'belief_binary_rule_r2',
      questionTitle:
        'Do you think the selected leader had the highest performance score in your group? (If you correctly answer this question you can get an extra £0.50 bonus)',
      options: [
        {id: 'yes', imageId: '', text: 'Yes'},
        {id: 'no', imageId: '', text: 'No'},
      ],
    }),
    createScaleSurveyQuestion({
      id: 'belief_rule_r2',
      questionTitle:
        'Thinking about the result of this round — whether you were selected as leader, not selected, or chose not to apply. To what extent do you think the outcome of the leadership selection was due to performance versus external circumstances/luck?',
      lowerText: 'Entirely due to external factors (luck, randomness)',
      upperText: 'Entirely due to performance',
      lowerValue: 0,
      upperValue: 100,
      useSlider: true,
    }),
  ],
});

const LR_R2_BELIEF_CANDIDATES_UPDATE = createSurveyStage({
  id: 'r2_belief_candidate_update',
  name: 'Part 2b - Survey',
  descriptions: createStageTextConfig({
    primaryText:
      'You can get an extra bonus for that question. At the end of the experiment, one of the estimation questions (from this or a similar section) will be randomly selected. If your estimation is correct, you will receive an £0.50 extra bonus.',
  }),
  questions: [
    createScaleSurveyQuestion({
      id: 'r2_belief_candidate_update',
      questionTitle:
        'We ask you to answer this question again: How many members of the group applied to the role (excluding you), according to you?',
      lowerText: '',
      upperText: '',
      lowerValue: 0,
      upperValue: 5,
    }),
  ],
});
export const LR_ROUND2_CONF_INFO_v2 =
  'You can get an extra bonus for that question. At the end of the experiment, one of the estimation questions (from this or a similar section) will be randomly selected. If your estimation is correct, you will receive an £0.50 extra bonus.';

const LR_ROUND2_CONFIDENCE_v2 = createSurveyStage({
  name: 'Part 2b - Performance Estimation',
  descriptions: createStageTextConfig({
    primaryText: LR_ROUND2_CONF_INFO_v2,
  }),
  questions: [
    createMultipleChoiceSurveyQuestion({
      questionTitle:
        'We would like you to guess how well you did in the previous task compared to other members of your group. Please select the option that best reflects your belief about your rank:',
      options: [
        {
          id: '1',
          imageId: '',
          text: 'I would be ranked 1st (the best performer in my group)',
        },
        {
          id: '2',
          imageId: '',
          text: 'I would be ranked 2nd',
        },
        {
          id: '3',
          imageId: '',
          text: 'I would be ranked 3rd',
        },
        {
          id: '4',
          imageId: '',
          text: 'I would be ranked 4th',
        },
        {
          id: '5',
          imageId: '',
          text: 'I would be ranked 5th',
        },
        {
          id: '6',
          imageId: '',
          text: 'I would be ranked 6th (the worst performer in my group)',
        },
      ],
    }),
    createScaleSurveyQuestion({
      id: 'conf_round2',
      questionTitle:
        'How many of the 5 questions from the previous task do you think you answered correctly?',
      lowerText: '',
      upperText: '',
      lowerValue: 0,
      upperValue: 5,
    }),
  ],
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
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
  `Imagine you could complete the group task one last time with a new leader (same task, same role, same selection process).`,
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
  name: 'Part 2c',
  descriptions: createStageTextConfig({
    primaryText: `Imagine you could complete the group task one last time with a new leader (same task, same role, same selection process).`,
  }),
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
        'How much would you like to be the leader (0 = not at all, 10 = very much)?',
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
// Final survey stage -
//==========================================================
//==========================================================
//==========================================================
const LR_SURVEY_PRIMARY = `Please rate how much you agree with the following statements. (1= strongly disagree, 7 = strongly agree)`;
export const LR_SURVEYFULL_QUESTION: SurveyQuestion[] = [
  createScaleSurveyQuestion({
    id: 'g',
    questionTitle:
      'Even the things in life I can’t control tend to go my way because I’m lucky. ',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: 'h',
    questionTitle: 'I consistently have good luck',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: 'i',
    questionTitle: 'I often feel like it’s my lucky day',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: 'j',
    questionTitle: 'Luck works in my favour',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: 'k',
    questionTitle: ' I consider myself to be a lucky person',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: 'q',
    questionTitle: 'Some people are consistently lucky, and others are unlucky',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: 's',
    questionTitle:
      'There is such a thing as good luck that favors some people, but not others',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: 'u',
    questionTitle: 'Luck plays an important part in everyone’s life',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: 'v',
    questionTitle: 'I believe in Luck',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),

  createScaleSurveyQuestion({
    id: '2z',
    questionTitle:
      'I would rather do something at which I feel confident and relaxed than something which is challenging and difficult.',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: '2a',
    questionTitle:
      'When a group I belong to plans an activity, I would rather direct it myself than just help out and have someone else organize it.',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: '2b',
    questionTitle:
      ' I would rather learn easy, fun games than difficult, thought games.',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: '2c',
    questionTitle:
      'If I am not good at something, I would rather keep struggling to master it than move on to something I may be good at.',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: '2d',
    questionTitle: 'Once I undertake a task, I persist.',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: '2e',
    questionTitle:
      'I prefer to work in situations that require a high level of skill.',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: '2f',
    questionTitle:
      ' I more often attempt tasks that I am not sure I can do than tasks that I believe I can do.',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: '2g',
    questionTitle: 'I like to be busy all the time.',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
];
export const LR_SURVEYFULL__QUESTIOND: SurveyQuestion[] = [
  createScaleSurveyQuestion({
    id: 'a',
    questionTitle: 'I consider myself to be an unlucky person',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: 'b',
    questionTitle: 'I consistently have bad luck',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: 'c',
    questionTitle:
      'Even the things in life I can control in life don’t go my way because I am unlucky',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: 'd',
    questionTitle: 'Luck works against me',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: 'e',
    questionTitle: 'I often feel like it’s my unlucky day',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: 'f',
    questionTitle:
      'I mind leaving things to chance because I am an unlucky person',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: 'g',
    questionTitle:
      'Even the things in life I can’t control tend to go my way because I’m lucky. ',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: 'h',
    questionTitle: 'I consistently have good luck',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: 'i',
    questionTitle: 'I often feel like it’s my lucky day',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: 'j',
    questionTitle: 'Luck works in my favour',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: 'k',
    questionTitle: ' I consider myself to be a lucky person',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: 'l',
    questionTitle:
      'I don’t mind leaving things to chance because I’m a lucky person ',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: 'm',
    questionTitle:
      ' It’s a mistake to base any decisions on how unlucky you feel',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: 'n',
    questionTitle: 'Being unlucky is nothing more than random',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: 'o',
    questionTitle:
      ' It’s a mistake to base any decisions on how lucky you feel',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: 'p',
    questionTitle: 'Being lucky is nothing more than random',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: 'q',
    questionTitle: 'Some people are consistently lucky, and others are unlucky',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: 'r',
    questionTitle:
      'Some people are consistently unlucky, and others are lucky ',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: 's',
    questionTitle:
      'There is such a thing as good luck that favours some people, but not others',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: 't',
    questionTitle:
      'There is such a thing as bad luck that affects some people more than others',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: 'u',
    questionTitle: 'Luck plays an important part in everyone’s life',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
  createScaleSurveyQuestion({
    id: 'v',
    questionTitle: 'I believe in Luck',
    lowerText: 'Strongly disagree',
    lowerValue: 1,
    upperText: 'Strongly agree',
    upperValue: 7,
  }),
];

const LR_SURVEY_STAGE_PRIMARY = createSurveyStage({
  name: 'Final survey (1/2)',
  descriptions: createStageTextConfig({
    primaryText: LR_SURVEY_PRIMARY,
  }),
  questions: LR_SURVEYFULL_QUESTION,
});

const LR_FINAL_SURVEY = `Please answer the following questions.`;

export const LR_FINAL_SURVEY_QUESTION: SurveyQuestion[] = [
  createTextSurveyQuestion({
    id: '0',
    questionTitle:
      'During the experiment, you were asked whether wanted to apply to become the group leader. Can you explain the reasons behind your choice? Please provide specific and concrete arguments for your choices.',
  }),
  createMultipleChoiceSurveyQuestion({
    id: '1',
    questionTitle:
      'After seeing the outcome of the leader’s selection in Part 2b (accepted vs. rejected if you applied, or just not selected if you did not apply), did you choose to reapply in the next Round? ',
    options: [
      {id: 'yes', imageId: '', text: 'Yes'},
      {id: 'no', imageId: '', text: 'No'},
    ],
  }),
  createTextSurveyQuestion({
    id: '1b',
    questionTitle: 'Why? (Explain your answer to the previous question)',
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
  name: 'Final survey (2/2)',
  descriptions: createStageTextConfig({
    primaryText: LR_FINAL_SURVEY,
  }),
  questions: LR_FINAL_SURVEY_QUESTION,
});

//==========================================================
// * PAYOUT STAGE
//==========================================================

//==========================================================
//==========================================================
//==========================================================
//  FINAL FEEDBACK + SURVEY + PAYOUT
//==========================================================
//==========================================================
//==========================================================
export const LR_FEEDBACK_STAGE_PRIMARY = 'Here are the results from the task.';
export const LR_FEEDBACK_STAGE_INFO = `An explanation of the results can be found [here](https://raw.githubusercontent.com/PAIR-code/deliberate-lab/main/frontend/src/assets/lost_at_sea/task_answers.pdf).`;

export const r1_instructions = 'r1_instructions';
export const r2_instructions = 'r2_instructions';

export const LR_FEEDBACK_STAGE = createRevealStage({
  name: 'Results reveal - Part 2a (Group Stage)',
  descriptions: createStageTextConfig({
    infoText: LR_FEEDBACK_STAGE_INFO,
    primaryText: LR_FEEDBACK_STAGE_PRIMARY,
  }),
  items: [
    createRankingRevealItem({
      id: r1_instructions,
    }),
    createSurveyRevealItem({
      id: LR_R1_GROUP_TASK_ID,
      revealAudience: RevealAudience.ALL_PARTICIPANTS,
      revealScorableOnly: true,
    }),
  ],
});

export const LR_FEEDBACK_STAGE_BIS = createRevealStage({
  name: 'Results reveal - Part 2b (Group Stage)',
  descriptions: createStageTextConfig({
    infoText: LR_FEEDBACK_STAGE_INFO,
    primaryText: LR_FEEDBACK_STAGE_PRIMARY,
  }),
  items: [
    createRankingRevealItem({
      id: r2_instructions,
    }),
    createSurveyRevealItem({
      id: LR_R2_GROUP_TASK_ID,
      revealAudience: RevealAudience.ALL_PARTICIPANTS,
      revealScorableOnly: true,
    }),
  ],
  progress: createStageProgressConfig({
    showParticipantProgress: false,
    waitForAllParticipants: false,
  }),
});

// ****************************************************************************
// Payout Breakdown info stage
// ****************************************************************************
export const LR_PAYMENT_PART_1_DESCRIPTION = `If Part 1a or Part 1b is selected, the bonus is determined by randomly selecting one question from this part. If your answer to this question is correct, you earn £2; otherwise, you earn £0.`;
export const LR_PAYMENT_PART_1A_DESCRIPTION = `On top of the fixed fee, your payment includes a bonus from one randomly selected Part of the experiment. Part 1a was selected to determine your bonus. The bonus is determined by randomly selecting one question from this part. If your answer to this question is correct, you earn £2; otherwise, you earn £0.`;

export const LR_PAYMENT_PART_1B_DESCRIPTION = `On top of the fixed fee, your payment includes a bonus from one randomly selected Part of the experiment. Part 1b was selected to determine your bonus. The bonus is determined by randomly selecting one question from this part. If your answer to this question is correct, you earn £2; otherwise, you earn £0.`;

export const LR_PAYMENT_PARTS_2_AND_3_DESCRIPTION = `If Part 2a or Part 2b is selected to determine your bonus, one question is randomly chosen, with only the leader's answer counting. You earn £2 if the leader's answer is correct, and £0 otherwise.`;

export const LR_PAYMENT_PART_2_DESCRIPTION = `On top of the fixed fee, your payment includes a bonus from one randomly selected Part of the experiment. Part 2a was selected to determine your bonus. One question is randomly chosen from this part, with only the leader's answer counting. You earn £2 if the leader's answer is correct, and £0 otherwise.`;

export const LR_PAYMENT_PART_3_DESCRIPTION = `On top of the fixed fee, your payment includes a bonus from one randomly selected Part of the experiment. Part 2b was selected to determine your bonus. One question is randomly chosen from this part with only the leader's answer counting. You earn £2 if the leader's answer is correct, and £0 otherwise.`;

export const LR_PAYMENT_INSTRUCTIONS = [
  'Your payment includes a fixed fee of £5 and a £2 bonus from one randomly selected Part of the experiment.',
  '## If Part 1a or 1b is selected:',
  LR_PAYMENT_PART_1_DESCRIPTION,
  '\n ## If Parts 2a or 2b is selected:',
  LR_PAYMENT_PARTS_2_AND_3_DESCRIPTION,
  'On the next page, you will see which question was selected for the £2 bonus.',
  //`* If Part 2 is selected: ${LR_PAYMENT_PART_2_DESCRIPTION}`,
  //`* If Part 3 is selected: ${LR_PAYMENT_PART_3_DESCRIPTION}`,
  'In addition, you answered several estimation questions throughout the experiment; one of these will be randomly selected to determine an extra £0.50 bonus.',
  'If you served as the leader at any point, you will also receive £0.50 for each round in which you were the leader.',
  'These additional bonuses will be calculated and paid on Prolific within the next 24–48 hours. If you would like more information about how they were computed, please contact the researcher via Prolific.',
];

export const LR_PAYMENT_INSTRUCTIONS_ALL = [...LR_PAYMENT_INSTRUCTIONS];

const LR_PAYOUT_INFO_STAGE = createInfoStage({
  name: 'Payment breakdown',
  infoLines: LR_PAYMENT_INSTRUCTIONS_ALL,
});

// ****************************************************************************
// Payout stage
// ****************************************************************************

export function createLRPayoutItems() {
  const RANDOM_SELECTION_ID = 'lr-part';

  const part1a = createSurveyPayoutItem({
    id: 'payout-part-1a',
    randomSelectionId: RANDOM_SELECTION_ID,
    name: 'Part 1a selected',
    description: LR_PAYMENT_PART_1A_DESCRIPTION,
    stageId: LR_BASELINE_TASK1_ID,
    baseCurrencyAmount: 6,
  });
  const part1aQuestion = choice(LAS_INDIVIDUAL_ITEMS_MULTIPLE_CHOICE_QUESTIONS);
  part1a.questionMap[part1aQuestion.id] = 2;

  // Only one payout item with this ID will be selected (at random)
  // for each participant

  const part1b = createSurveyPayoutItem({
    id: 'payout-part-1b',
    randomSelectionId: RANDOM_SELECTION_ID,
    name: 'Parts 1b selected',
    description: LR_PAYMENT_PART_1B_DESCRIPTION,
    stageId: LR_BASELINE_TASK2_ID,
    baseCurrencyAmount: 6,
  });
  const part1bQuestion = choice(SD_INDIVIDUAL_ITEMS_MULTIPLE_CHOICE_QUESTIONS);
  part1b.questionMap[part1bQuestion.id] = 2;

  const part2 = createSurveyPayoutItem({
    id: 'payout-part-2',
    randomSelectionId: RANDOM_SELECTION_ID,
    name: 'Parts 2a selected',
    description: [LR_PAYMENT_PART_2_DESCRIPTION].join('\n\n'),
    stageId: LR_R1_GROUP_TASK_ID,
    baseCurrencyAmount: 6,
    rankingStageId: LAS_PART_2_ELECTION_STAGE_ID,
  });
  const part2Question = choice(LAS_LEADER_ITEMS_MULTIPLE_CHOICE_QUESTIONS);
  part2.questionMap[part2Question.id] = 2;

  const part3 = createSurveyPayoutItem({
    id: 'payout-part-3',
    randomSelectionId: RANDOM_SELECTION_ID,
    name: 'Parts 2b selected',
    description: [LR_PAYMENT_PART_3_DESCRIPTION].join('\n\n'),
    stageId: LR_R2_GROUP_TASK_ID,
    baseCurrencyAmount: 6,
  });
  const part3Question = choice(SD_LEADER_ITEMS_MULTIPLE_CHOICE_QUESTIONS);
  part3.questionMap[part3Question.id] = 2;

  return [part1a, part1b, part2, part3];
}

const LR_PAYOUT_STAGE = createPayoutStage({
  id: 'payout',
  currency: PayoutCurrency.GBP,
  //descriptions: createStageTextConfig({
  // infoText: LR_PAYMENT_INSTRUCTIONS.join('\n'),
  //}),
  payoutItems: createLRPayoutItems(),
});
