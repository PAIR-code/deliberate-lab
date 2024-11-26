import {
  ElectionStrategy,
  Experiment,
  MultipleChoiceSurveyQuestion,
  RankingItemData,
  RankingType,
  RevealAudience,
  StageConfig,
  StageGame,
  SurveyQuestion,
  SurveyQuestionKind,
  createChatStage,
  createCompareChatDiscussion,
  createRankingStage,
  createExperimentConfig,
  createInfoStage,
  createPayoutStage,
  createProfileStage,
  createMetadataConfig,
  createMultipleChoiceSurveyQuestion,
  createRevealStage,
  createScaleSurveyQuestion,
  createStageTextConfig,
  createSurveyStage,
  createSurveyRevealItem,
  createTOSStage,
  createTransferStage,
} from '@deliberation-lab/utils';
  
/** Constants and functions to create the Gift Card Exchange game. */
 export const GIFT_CARDS = [
  { id: "1", imageId: "", text: "💄 Sephora, 🛒 Whole Foods" },  // Lipstick for Sephora, Apple for Whole Foods
  { id: "2", imageId: "", text: "🍏 Apple, 🎮 Steam" },  // Apple for Apple, Game Controller for Google Play
  { id: "3", imageId: "", text: "👟 Nike, 📱 Google Play" },  // Sneaker for Nike, Joystick for Steam
 ];

export const GIFT_CARDS_LIST_DESCRIPTION = GIFT_CARDS.map(
  item => `(${item.text})`
);

// ****************************************************************************
// Experiment config
// ****************************************************************************
export const GCE_METADATA = createMetadataConfig({
  name: 'Gift Card Exchange Experiment',
  publicName: 'Gift Card Exchange',
  description: 'A trading scenario involving gift cards.'
});

export function getGCEStageConfigs(): StageConfig[] {
  const stages: StageConfig[] = [];
  // Terms of service
  stages.push(GCE_TOS_STAGE);
  // Intro
  stages.push(GCE_INTRO_STAGE);
  // Profile
  stages.push(GCE_PROFILE_STAGE);
  // Part 1: Rank items
  stages.push(GCE_PART_1_INSTRUCTIONS_STAGE);
  stages.push(GCE_PART_1_RANKING_STAGE);
  // Part 2: Chat
  stages.push(GCE_PART_2_INSTRUCTIONS_STAGE);
  stages.push(
    createChatStage({
      game: StageGame.GCE,
      name: 'Group discussion',
      descriptions: {
        primaryText: '',
        infoText: `As a reminder, the bundles are ${GIFT_CARDS_LIST_DESCRIPTION}.`,
        helpText: '',
      }
    })
  );
  // Part 3: Selection and reveal
  stages.push(GCE_SELECTION_STAGE);
  stages.push(GCE_REVEAL_STAGE);

  // Part 4: Trade and reveal
  stages.push(GCE_TRADE_STAGE);
  stages.push(GCE_REVEAL2_STAGE);

  // Survey
  stages.push(GCE_FINAL_SURVEY_STAGE);
  return stages;
}

// ****************************************************************************
// Terms of Service stage
// ****************************************************************************
const GCE_TOS_LINES = [
  'Thank you for participating in this study.',
];

const GCE_TOS_STAGE = createTOSStage({
  game: StageGame.GCE,
  tosLines: GCE_TOS_LINES,
});

// ****************************************************************************
// Intro info stage
// ****************************************************************************
const GCE_INTRO_INFO_DESCRIPTION_PRIMARY =
`This experiment is part of a research project that explores a trading scenario. You may interact with others during the experiment.`;

const GCE_INTRO_INFO_LINES = [
  'You will receive a fixed compensation of $4 for your participation, with an opportunity to receive a bonus in the form of gift cards.',
  '💸 If you win a gift card, your gift card will be delivered digitally within 24-48 hours.',
  '‼️ If you experience any technical difficulties during the study, **please message the experiment administrators on Prolific as soon as possible.**',
  'Please click “Next stage” to proceed.',
];

const GCE_INTRO_STAGE = createInfoStage({
  game: StageGame.GCE,
  name: 'Welcome to the experiment',
  descriptions: createStageTextConfig({ primaryText: GCE_INTRO_INFO_DESCRIPTION_PRIMARY }),
  infoLines: GCE_INTRO_INFO_LINES,
});

// ****************************************************************************
// Profile stage
// ****************************************************************************
const GCE_PROFILE_STAGE = createProfileStage({
  game: StageGame.GCE,
});

// ****************************************************************************
// Part 1 Instructions info stage
// ****************************************************************************
const GCE_PART_1_INSTRUCTIONS_INFO_LINES = [
  'You will be presented with pairs of gift cards.',
  'Please rank these pairs from the one you’d most prefer to the one you’d least prefer.',
  'The gift card pairs are not separable, meaning you cannot choose individual cards from each pair. You will be selecting and ranking the pairs as combinations.',
  'Think carefully about the combinations you would most like, as your preferences may impact the gift card pair you receive.',
  'At the end of the experiment, you may be selected to receive one of the pairs based on your rankings and a lottery selection process.',
  'Please make your selections carefully and click "Next" when you’re ready to proceed.',
];

const GCE_PART_1_INSTRUCTIONS_STAGE = createInfoStage({
  game: StageGame.GCE,
  name: 'Ranking instructions',
  infoLines: GCE_PART_1_INSTRUCTIONS_INFO_LINES,
});

// ****************************************************************************
// Part 1: Ranking stage 
// ****************************************************************************
export const GCE_PART_1_RANKING_ID = 'item_ranking';

export const RANKING_INSTRUCTIONS = 'Please rank the following gift card pairs, placing your most preferred at the top.'

const GCE_PART_1_RANKING_STAGE = createRankingStage({
  id: GCE_PART_1_RANKING_ID,
  game: StageGame.GCE,
  name: 'Initial item ranking',
  descriptions: createStageTextConfig({ infoText: RANKING_INSTRUCTIONS }),
  strategy: ElectionStrategy.NONE,
  rankingType: RankingType.ITEMS,
  rankingItems: GIFT_CARDS,
});

// ****************************************************************************
// Part 2: Chat stage
// ****************************************************************************
export const GCE_CHAT_INSTRUCTIONS = [
  'Now you’re going to chat with other participants about the gift card allocations.',
  'Please select different pairs of gift cards to discuss; otherwise, you will receive a random pair.',
  'In the next stage, you will be in a group chat with three other people. Together, you will need to unanimously decide who gets which pair of gift cards. Each participant must receive one pair of gift cards.',
  'If you do not reach a unanimous agreement on the allocations within XX minutes, the gift cards will be allocated randomly.',
  'Throughout the experiment, you will engage in multiple bargaining sessions (specifically, five different bargaining games) with different groups. One of the pairs of gift cards you negotiate for will be randomly given to you based on the outcomes of these discussions.',
  'Please communicate effectively with your group to ensure everyone is satisfied with the final allocations. Click "Next" to proceed.',
];

export  const GCE_PART_2_INSTRUCTIONS_STAGE = createInfoStage({
  game: StageGame.GCE,
  name: 'Chat instructions',
  infoLines: GCE_CHAT_INSTRUCTIONS,
});

// ****************************************************************************
// Part 3: Now rank the items 
// ****************************************************************************
const SELECTION_ID = 'gift_card_selection';
const GCE_SELECTION_STAGE = createSurveyStage({
  id: SELECTION_ID,
  game: StageGame.GCE,
  name: 'Select your gift card',
  descriptions: createStageTextConfig({ primaryText: 'Now, lock in the bundle of gift cards.'}),
  questions: [
    createMultipleChoiceSurveyQuestion({
      questionTitle: 'Which bundle did the group decide that you should receive?',
      options: GIFT_CARDS
    })
  ],
});

export const GCE_REVEAL_STAGE = createRevealStage({
  game: StageGame.GCE,
  name: 'Results reveal',
  descriptions: createStageTextConfig({
    primaryText: 'Here are the allocation results.'
  }),
  items: [createSurveyRevealItem({ id: SELECTION_ID })],
});

// ****************************************************************************
// Part 4: Opportunity to trade 
// ****************************************************************************

const TRADE_ID = 'gift_card_trade';
const GCE_TRADE_STAGE = createSurveyStage({
  id: TRADE_ID,
  game: StageGame.GCE,
  name: 'Opportunity to trade',
  descriptions: createStageTextConfig({ primaryText: 'Would you like to trade for a different gift card? Select your own if not.'}),
  questions: [
    createMultipleChoiceSurveyQuestion({
      questionTitle: 'Which would you prefer?',
      options: GIFT_CARDS
    })
  ]
});

export const GCE_REVEAL2_STAGE = createRevealStage({
  game: StageGame.GCE,
  name: 'Trade reveal',
  descriptions: createStageTextConfig({
    primaryText: 'Here are the results after any trades may have occurred.'
  }),
  items: [createSurveyRevealItem({ id: TRADE_ID })],
});

// ****************************************************************************
// Final survey stage
// ****************************************************************************
const GCE_FINAL_DESCRIPTION_PRIMARY =
`Thanks for participating. Please complete this final survey.`;

export const GCE_FINAL_SURVEY_QUESTIONS: SurveyQuestion[] = [{
  id: '0',
  kind: SurveyQuestionKind.TEXT,
  questionTitle: 'If someone were to negotiate for you in this exact game on your behalf, how would you describe your preferences over the pairs of gift cards in 25 words or less?'
}];

const GCE_FINAL_SURVEY_STAGE = createSurveyStage({
  game: StageGame.GCE,
  name: 'Final survey',
  descriptions: createStageTextConfig({ primaryText: GCE_FINAL_DESCRIPTION_PRIMARY }),
  questions: GCE_FINAL_SURVEY_QUESTIONS,
});