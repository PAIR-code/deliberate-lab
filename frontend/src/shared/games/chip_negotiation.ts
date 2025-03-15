import {
  ALTERNATE_PROFILE_SET_ID,
  ChipItem,
  ProfileType,
  StageConfig,
  StageGame,
  createCheckSurveyQuestion,
  createChipPayoutItem,
  createChipStage,
  createComprehensionStage,
  createInfoStage,
  createMetadataConfig,
  createMultipleChoiceItem,
  createMultipleChoiceComprehensionQuestion,
  createPayoutStage,
  createProfileStage,
  createStageProgressConfig,
  createSurveyStage,
  createTransferStage,
  createTOSStage,
  createStageTextConfig,
  createScaleSurveyQuestion,
  createTextSurveyQuestion,
  randint,
} from '@deliberation-lab/utils';

// ****************************************************************************
// Game parameters
// ****************************************************************************
export const N_INITIAL_GREEN_CHIPS = 10;
export const N_INITIAL_BLUE_CHIPS = 10;
export const N_INITIAL_RED_CHIPS = 10;
export const N_INITIAL_PURPLE_CHIPS = 10;

// ****************************************************************************
// Experiment config
// ****************************************************************************
export function getChipMetadata(numChips: number) {
  let emoji = '🔴'; // Default to red
  let name = 'Chip Negotiation';
  let publicName = 'Chip Negotiation';
  let description =
    'A trading scenario that showcases a custom negotiation module';

  if (numChips === 2) {
    emoji = '🟢'; // Green for 2 chips
    name = `${emoji} Chip Negotiation (2 Chips)`;
    publicName = `${emoji} Chip Negotiation (v2)`;
    description += ' with red and green chips.';
  } else if (numChips === 3) {
    emoji = '🔵'; // Blue for 3 chips
    name = `${emoji} Chip Negotiation (3 Chips)`;
    publicName = `${emoji} Chip Negotiation (v3)`;
    description += ' with red, green, and blue chips.';
  } else if (numChips === 4) {
    emoji = '🟣'; // Purple for 4 chips
    name = `${emoji} Chip Negotiation (4 Chips)`;
    publicName = `${emoji} Chip Negotiation (v4)`;
    description += ' with red, green, blue, and purple chips.';
  }

  return createMetadataConfig({
    name,
    publicName,
    description,
  });
}

export function getChipNegotiationStageConfigs(numChips = 3): StageConfig[] {
  const stages: StageConfig[] = [];

  // Informed consent
  stages.push(CHIP_TOS_STAGE);

  // Anonymized profiles
  stages.push(CHIP_PROFILE_STAGE);

  // Overview stages
  stages.push(createChipInfoStage1(numChips));
  stages.push(createChipInfoStage2(numChips));
  stages.push(CHIP_INFO_STAGE_OVERVIEW3);

  // Comprehension check
  stages.push(CHIP_COMPREHENSION_CHECK);

  // Gameplay stages
  stages.push(CHIP_INFO_STAGE_GAMEPLAY);
  stages.push(CHIP_INFO_STAGE_GAMEPLAY2);
  stages.push(CHIP_INFO_STAGE_GAMEPLAY4);
  stages.push(CHIP_INFO_STAGE_GAMEPLAY5);

  // Comprehension check
  stages.push(CHIP_COMPREHENSION_CHECK2);

  stages.push(CHIP_INFO_STAGE_PAYOUT);
  stages.push(createChipInfoPayout(numChips));

  // Transfer
  stages.push(TRANSFER_STAGE);

  // Round 1
  stages.push(getChipNegotiationStage1(numChips));

  // Round 2
  stages.push(CHIP_INFO_PART2);
  stages.push(CHIP_ALTERNATE_PROFILE_STAGE);
  stages.push(getChipNegotiationStage2(numChips));
  stages.push(CHIP_PAYOUT_STAGE);

  // Post-negotiation survey stage
  stages.push(CHIP_SURVEY_STAGE);

  return stages;
}

// ****************************************************************************
// Informed consent stage
// ****************************************************************************
const CHIP_TOS_STAGE = createTOSStage({
  id: 'tos',
  game: StageGame.CHP,
  name: 'Terms of service',
  tosLines: [
    'Thank you for your interest in this research. If you choose to participate, you will be asked to play negotiation games with other participants. In total, this will take around 25 minutes.',
    '\n**Compensation**',
    'You will be paid a base amount for playing the games and completing the survey. You may receive an additional bonus on your performance in the games.',
    '\n**IRB**',
    'The results of this study will be used solely for research purposes. Our team will keep all your information from this study strictly confidential, as required by law. The IRB at the Massachusetts Institute of Technology is responsible for protecting the rights and welfare of research volunteers like you.',
    '\n**Voluntary participation**',
    'Your participation is voluntary, which means you can choose whether or not to participate. You may choose not to participate by exiting the survey at any point. There are no known costs to you for participating in this research study except for your time.',
    '\n**Contact**',
    'Please feel free to contact us through Prolific or your game administrator if you have any questions, concerns, or complaints about this study.',
    '\nBy checking the box below and proceeding, you are acknowledging that you are over the age of 18 and that you consent to participate. Clicking the arrow will bring you to the beginning of the task.',
  ],
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

// ****************************************************************************
// Anonymized profiles stage
// ****************************************************************************
const CHIP_PROFILE_STAGE = createProfileStage({
  id: 'profile',
  name: 'View randomly generated profile',
  descriptions: createStageTextConfig({
    primaryText:
      "This identity is how other players will see you during today's experiment.",
  }),
  game: StageGame.CHP,
  profileType: ProfileType.ANONYMOUS_ANIMAL,
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

const CHIP_ALTERNATE_PROFILE_STAGE = createProfileStage({
  id: `profile_${ALTERNATE_PROFILE_SET_ID}`,
  name: 'View secondary randomly generated profile',
  descriptions: createStageTextConfig({
    primaryText:
      'This identity is how other players will see you during the second game.',
  }),
  game: StageGame.CHP,
  profileType: ProfileType.ANONYMOUS_ANIMAL,
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

// ****************************************************************************
// Info stage for chip negotiation
// ****************************************************************************

function createChipInfoStage1(numChips: number) {
  const infoLines = [
    'In this experiment, you will be playing a trading game with other participants.',
    'All of you will be given the same initial number of',
  ];

  // Adjust the chips included based on numChips
  if (numChips === 2) {
    infoLines[1] += ' 🔴 red chips and 🟢 green chips';
  } else if (numChips === 3) {
    infoLines[1] += ' 🔴 red chips, 🟢 green chips, and 🔵 blue chips';
  } else if (numChips === 4) {
    infoLines[1] +=
      ' 🔴 red chips, 🟢 green chips, 🔵 blue chips, and 🟣 purple chips';
  }

  infoLines[1] +=
    ', but you may value the different colors of chips differently.';

  infoLines.push(
    'By making and accepting offers, you can exchange chips with the other players to increase the total value of your chips.',
    'You may receive a bonus payment depending on the value of your chips at the end of the game.',
  );

  return createInfoStage({
    id: 'info_overview1',
    game: StageGame.CHP,
    name: 'Instructions: overview',
    infoLines,
    progress: createStageProgressConfig({
      showParticipantProgress: false,
    }),
  });
}

function createChipInfoStage2(numChips: number) {
  const infoLines = [
    'You will play this trading game two times against two different groups of participants. In each game, you and the other participants will start with:',
  ];

  // Adjust the chips included based on numChips
  if (numChips >= 2) {
    infoLines.push(`* 🔴 ${N_INITIAL_RED_CHIPS} **red** chips`);
    infoLines.push(`* 🟢 ${N_INITIAL_GREEN_CHIPS} **green** chips`);
  }
  if (numChips >= 3) {
    infoLines.push(`* 🔵 ${N_INITIAL_BLUE_CHIPS} **blue** chips`);
  }
  if (numChips === 4) {
    infoLines.push(`* 🟣 ${N_INITIAL_PURPLE_CHIPS} **purple** chips`);
  }

  infoLines.push('**Valuations:**');

  if (numChips === 2) {
    infoLines.push(
      'Each 🟢 green chip is worth $0.50 to each participant. However, you will all have different valuations for the red chips, randomly chosen between $0.10 and $1.00.',
    );
    infoLines.push(
      'For example, Cat might value 🔴 red chips at $0.30 each, while Mouse might value 🔴 red chips at $0.80 each.',
    );
  } else if (numChips === 3) {
    infoLines.push(
      'Each 🟢 green chip is worth $0.50 to each participant. However, you will all have different valuations for the red and blue chips, randomly chosen between $0.10 and $1.00.',
    );
    infoLines.push(
      'For example, Cat might value 🔴 red chips at $0.30 each and 🔵 blue chips at $0.70 each, while Mouse might value 🔴 red chips at $0.80 each and 🔵 blue chips at $0.30 each.',
    );
  } else if (numChips === 4) {
    infoLines.push(
      'Each 🟢 green chip is worth $0.50 to each participant. However, you will all have different valuations for the red, blue, and purple chips, randomly chosen between $0.10 and $1.00.',
    );
    infoLines.push(
      'For example, Cat might value 🔴 red chips at $0.30 each, 🔵 blue chips at $0.70 each, and 🟣 purple chips at $0.50 each, while Mouse might value 🔴 red chips at $0.80 each, 🔵 blue chips at $0.30 each, and 🟣 purple chips at $0.60 each.',
    );
  }

  infoLines.push(
    '\n**What this means:**',
    'Because each participant values the chips differently, there may be good reason to trade.',
  );

  if (numChips >= 2) {
    infoLines.push(
      'For instance, if you don’t care much about 🔴 red chips but someone else does, you might offer your red chips to them in exchange for 🟢 green chips, which you like more.',
    );
  }
  if (numChips === 3) {
    infoLines.push(
      'Similarly, you might trade 🔵 blue chips with another participant if they value them more than you do.',
    );
  }
  if (numChips === 4) {
    infoLines.push(
      'Similarly, you might trade 🔵 blue chips with another participant if they value them more than you do. The same goes for 🟣 purple chips, depending on your valuation of them compared to the other participants.',
    );
  }

  infoLines.push(
    "You know your own chip valuation and that everyone values 🟢 green chips the same, at $0.50 per chip. However, you do not know the other players' valuations for the other chips.",
  );

  infoLines.push("**Parcipant Knowledge of Others' Valuations:**");

  infoLines.push(
    'You know your own chip valuation and that everyone values 🟢 green chips the same, at $0.50 per chip.',
    "However, you do not know the other players' valuations for the other chips, and they do not know your valuations (besides 🟢 green chips).",
  );

  return createInfoStage({
    id: 'info_overview2',
    game: StageGame.CHP,
    name: 'Instructions: chip valuations 1',
    infoLines,
    progress: createStageProgressConfig({
      showParticipantProgress: false,
    }),
  });
}

const CHIP_INFO_STAGE_OVERVIEW3 = createInfoStage({
  id: 'info_overview3',
  game: StageGame.CHP,
  name: 'Instructions: chip valuations 2',
  infoLines: [
    'The following table is shown to you during the game. It provides the number of chips everyone has as well as a reminder of your own valuations.',
    '![Example of chip count table](https://i.imgur.com/ImUM14D.png)',
  ],
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

// ****************************************************************************
// Comprehension checks
// ****************************************************************************
export const CHIP_COMPREHENSION_CHECK = createComprehensionStage({
  id: 'comprehension_check1',
  game: StageGame.CHP,
  name: 'Comprehension check',
  descriptions: createStageTextConfig({
    primaryText:
      'Please answer the following questions to verify your understanding of the instructions. You may proceed once you have answered the questions correctly.',
  }),
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
  questions: [
    createMultipleChoiceComprehensionQuestion(
      {
        questionTitle: 'How many 🔴 red chips will **you** start with?',
        options: [
          createMultipleChoiceItem({id: 'a', text: '5'}),
          createMultipleChoiceItem({id: 'b', text: '10'}),
          createMultipleChoiceItem({id: 'c', text: '8'}),
          createMultipleChoiceItem({id: 'd', text: '15'}),
        ],
      },
      'b', // correct answer ID
    ),
    createMultipleChoiceComprehensionQuestion(
      {
        questionTitle:
          'How many 🟢 green chips will each **other** player start with?',
        options: [
          createMultipleChoiceItem({id: 'a', text: '20'}),
          createMultipleChoiceItem({id: 'b', text: '5'}),
          createMultipleChoiceItem({id: 'c', text: '50'}),
          createMultipleChoiceItem({id: 'd', text: '10'}),
        ],
      },
      'd', // correct answer ID
    ),
    createMultipleChoiceComprehensionQuestion(
      {
        questionTitle:
          'True or false: you and the other players will always value 🟢 green chips at the same amount, $0.50 per chip.',
        options: [
          createMultipleChoiceItem({id: 'a', text: 'True'}),
          createMultipleChoiceItem({id: 'b', text: 'False'}),
        ],
      },
      'a', // correct answer ID)
    ),

    createMultipleChoiceComprehensionQuestion(
      {
        questionTitle:
          'True or false: you and the other players will always value NON-green chips at the same amount, $0.50 per chip.',
        options: [
          createMultipleChoiceItem({id: 'a', text: 'True'}),
          createMultipleChoiceItem({id: 'b', text: 'False'}),
        ],
      },
      'b', // correct answer ID)
    ),
  ],
});

export const CHIP_COMPREHENSION_CHECK2 = createComprehensionStage({
  id: 'comprehension_check2',
  game: StageGame.CHP,
  name: 'Comprehension check 2',
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
  descriptions: createStageTextConfig({
    primaryText:
      'Please answer the following questions to verify your understanding of the instructions. You may proceed once you have answered the questions correctly.',
  }),

  questions: [
    createMultipleChoiceComprehensionQuestion(
      {
        questionTitle:
          'True or false: A player can propose multiple trades during their turn in a round.',
        options: [
          createMultipleChoiceItem({id: 'a', text: 'True'}),
          createMultipleChoiceItem({id: 'b', text: 'False'}),
        ],
      },
      'b', // correct answer ID
    ),
    createMultipleChoiceComprehensionQuestion(
      {
        questionTitle: 'Which of the following trades is NOT allowed?',
        options: [
          createMultipleChoiceItem({
            id: 'a',
            text: 'Trading 🔴 3 red chips for 🟢 2 green chips',
          }),
          createMultipleChoiceItem({
            id: 'b',
            text: 'Trading 🟢 4 green chips for 🔴 4 red chips',
          }),
          createMultipleChoiceItem({
            id: 'c',
            text: 'Trading 🔴 2 red chips for 🔴 4 red chips',
          }),
          createMultipleChoiceItem({
            id: 'd',
            text: 'Trading 🟢 5 green chips for 🔴 3 red chips',
          }),
        ],
      },
      'c', // correct answer ID
    ),
    createMultipleChoiceComprehensionQuestion(
      {
        questionTitle:
          'True or false: The number of chips offered must equal the number of chips requested.',
        options: [
          createMultipleChoiceItem({id: 'a', text: 'True'}),
          createMultipleChoiceItem({id: 'b', text: 'False'}),
        ],
      },
      'b', // correct answer ID
    ),
    createMultipleChoiceComprehensionQuestion(
      {
        questionTitle:
          'True or False: Players who accept a trade proposal **do not know** at the time of accepting the proposal whether they will be the one chosen to complete the trade.',
        options: [
          createMultipleChoiceItem({id: 'a', text: 'True'}),
          createMultipleChoiceItem({id: 'b', text: 'False'}),
        ],
      },
      'a', // correct answer ID
    ),
    createMultipleChoiceComprehensionQuestion(
      {
        questionTitle:
          'Say that a player proposes trading 🔴 3 red chips for 🟢 4 green chips. Who can accept this trade?',
        options: [
          createMultipleChoiceItem({
            id: 'a',
            text: 'Any player with 4 or more green chips',
          }),
          createMultipleChoiceItem({
            id: 'b',
            text: 'Only players with exactly 4 green chips',
          }),
          createMultipleChoiceItem({
            id: 'c',
            text: 'Only the player with the most green chips',
          }),
          createMultipleChoiceItem({
            id: 'd',
            text: 'Any player with any number of green chips',
          }),
        ],
      },
      'a', // correct answer ID
    ),
  ],
});

// ****************************************************************************
// Gameplay instructions
// ****************************************************************************

const CHIP_INFO_STAGE_GAMEPLAY = createInfoStage({
  id: 'info_gameplay',
  game: StageGame.CHP,
  name: 'Gameplay: rounds',
  infoLines: [
    `## How the game works`,
    `The game consists of **3 rounds** of trading. During each round, each player will have a turn to propose **1 trade**. These turns are pre-determined in a random order.`,
  ],
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

const CHIP_INFO_STAGE_GAMEPLAY2 = createInfoStage({
  id: 'info_gameplay2',
  game: StageGame.CHP,
  name: 'Gameplay: proposing a trade',
  infoLines: [
    `## Trade proposals`,
    `To propose a trade, a player must:`,
    `1. Request a certain quantity of chips of a single color from any other player to **get**.`,
    `2. Specify a certain quantity of chips of a different color to **give** in return.`,
    `\n## 🌟 One tip`,
    'As a reminder, you can **always** make a beneficial offer as long as you have one chip left. For example, if you have one 🔴 red chip remaining, you can offer to **give** it and get 10 🟢 green chips in return for a profit. However, it is unlikely that someone will take you up on this offer. Please consider the tradeoffs. 🙂',

    `\n## Trade rules`,
    `* Players cannot offer more chips than they currently hold. For example, if you only have 5 🔴 red chips, you cannot offer 6 🔴 red chips.`,
    `* Players cannot trade chips of the same color. For example, you cannot trade 🔴 red chips for 🔴 red chips.`,
    '![Example of offering a trade](https://i.imgur.com/Jzah8Ot.png)',
  ],
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

const CHIP_INFO_STAGE_GAMEPLAY4 = createInfoStage({
  id: 'info_gameplay4',
  game: StageGame.CHP,
  name: 'Gameplay: completing a trade',
  infoLines: [
    `## Trade completion`,
    `When an offer is presented, all other active participants get a chance to accept or decline. Note: Active participants are those not currently making the offer.`,
    '![Example of receiving an offer](https://i.imgur.com/NJL4AvQ.png)',
    `Participants make their decisions simultaneously and privately. The participant who receives the offer is not dependent on who accepts the trade first. Some possible outcomes:`,
    `* If no one accepts, the trade does not happen, and the turn ends.`,
    `* If multiple participants accept, one accepting participant is *chosen at random* to complete the trade with the offering participant. This means that the participant proposing the trade cannot choose who they trade with.`,
    `* If only one participant accepts, the trade will happen.`,
  ],
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

const CHIP_INFO_STAGE_GAMEPLAY5 = createInfoStage({
  id: 'info_gameplay5',
  game: StageGame.CHP,
  name: 'Gameplay: summary',
  infoLines: [
    `## Key points to remember`,
    `* In each round, each player gets to propose one trade and respond to other player's trades.`,
    `* You can only propose trades between different colored chips, and cannot offer to give a chip amount that you do not have.`,
    `* When multiple players accept a trade, the trading partner is randomly selected.`,
    `\nFeel free to click back to previous sections to review the instructions.`,
  ],
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

// ****************************************************************************
// Payment information
// ****************************************************************************/

const CHIP_INFO_STAGE_PAYOUT = createInfoStage({
  id: 'info_payment1',
  game: StageGame.CHP,
  name: 'Payment information',
  infoLines: [
    '## Bonus payment',
    'At the end of the study, we will randomly pick **one** of the two negotiation games you played and give you a bonus payment from that game.',
    'There are two important features to remember about the bonus:',
    '  * The bonus will be equivalent to how much money you earn through trading *beyond* what you start with.',
    '  * If you do not complete both games, you will not receive a bonus payment.',
    'In short, you want to make as much money as you can through trading!',
  ],
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

function createChipInfoPayout(numChips: number) {
  const infoLines = ['## Bonus payment example calculation'];

  let startingValue = '';
  let endingValue = '';
  let bonus = '';

  if (numChips === 2) {
    startingValue = `(10 * 0.30 + 10 * 0.50) = **$8.00**`;
    endingValue = `* 🔴 12 red chips valued at $0.30 each\n* 🟢 10 green chips valued at $0.50 each`;
    bonus = `($8.60 - $8.00) = **$0.60**`;
  } else if (numChips === 3) {
    startingValue = `(10 * 0.30 + 10 * 0.50 + 10 * 0.70) = **$15.00**`;
    endingValue = `* 🔴 8 red chips valued at $0.30 each\n* 🟢 7 green chips valued at $0.50 each\n* 🔵 21 blue chips valued at $0.70 each`;
    bonus = `($20.60 - $15.00) = **$5.60**`;
  } else if (numChips === 4) {
    startingValue = `(10 * 0.30 + 10 * 0.50 + 10 * 0.70 + 10 * 0.40) = **$19.00**`;
    endingValue = `* 🔴 8 red chips valued at $0.30 each\n* 🟢 7 green chips valued at $0.50 each\n* 🔵 21 blue chips valued at $0.70 each\n* 🟣 5 purple chips valued at $0.40 each`;
    bonus = `($22.60 - $19.00) = **$3.60**`;
  }

  infoLines.push(
    ` Suppose that for the first game, you started with 10 chips of each color, worth ${startingValue}.`,
    'At the end of that game, you have:',
    endingValue,
    `You would receive ${bonus} as a bonus for the first game.`,
    'If you did not increase the value of your chips, you would not receive a bonus.',
    '\n**Your total bonus will be randomly selected from either the first or the second game.**',
    '\nThe exact values will depend on your random chip valuations and your final holdings, so your payment may differ from this example.',
    '\nThis payment is in addition to the base payment for participating.',
  );

  return createInfoStage({
    id: 'info_payment2',
    game: StageGame.CHP,
    name: 'Payment information examples',
    infoLines,
    progress: createStageProgressConfig({
      showParticipantProgress: false,
    }),
  });
}

const CHIP_INFO_PART2 = createInfoStage({
  id: 'info_part2',
  game: StageGame.CHP,
  name: 'Instructions for part 2',
  infoLines: [
    '# Congratulations!',
    'You’ve successfully completed your first game! Now, it’s time to play again with all the **same rules**. However, for this second round, please note the following changes:',
    '* **New profile:** You will be playing as a new profile, and you will be playing against different animal profiles.',
    '* **New chip values:** The value of the 🟢 green chip will remain the same for everyone ($0.50). You will receive a different valuation for your other chips.',
    'All players participating in this round are also playing for their second time. **Enjoy the game!**',
  ],
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

// ****************************************************************************
// Transfer stages
// ****************************************************************************/
export const TRANSFER_STAGE = createTransferStage({
  id: 'transfer',
  game: StageGame.CHP,
  name: 'Transfer stage',
  descriptions: createStageTextConfig({
    primaryText:
      'Please wait on this page for up to 10 minutes as you are transferred to the next stage of this experiment. Thank you for your patience.',
  }),
  enableTimeout: true,
  timeoutSeconds: 600, // 10 minutes
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

// ****************************************************************************
// Chip negotiation stage
// ****************************************************************************
function getChips(numChips: number) {
  const redChip = {
    id: 'RED',
    name: 'red',
    avatar: '🔴',
    canBuy: true,
    canSell: true,
    startingQuantity: N_INITIAL_RED_CHIPS,
    lowerValue: 0.1,
    upperValue: 1,
  };

  const blueChip = {
    id: 'BLUE',
    name: 'blue',
    avatar: '🔵',
    canBuy: true,
    canSell: true,
    startingQuantity: N_INITIAL_BLUE_CHIPS,
    lowerValue: 0.1,
    upperValue: 1,
  };

  const purpleChip = {
    id: 'PURPLE',
    name: 'purple',
    avatar: '🟣',
    canBuy: true,
    canSell: true,
    startingQuantity: N_INITIAL_PURPLE_CHIPS,
    lowerValue: 0.1,
    upperValue: 1,
  };

  const greenChip = {
    id: 'GREEN',
    name: 'green',
    avatar: '🟢',
    canBuy: true,
    canSell: true,
    startingQuantity: N_INITIAL_GREEN_CHIPS,
    lowerValue: 0.5,
    upperValue: 0.5,
  };

  const chips: ChipItem[] = [redChip];
  if (numChips > 2) {
    chips.push(blueChip);
  }
  if (numChips > 3) {
    chips.push(purpleChip);
  }

  // All games have the same-valuation green chip
  chips.push(greenChip);

  return chips;
}

const CHIP_NEGOTIATION_STAGE1_ID = 'negotiation1';
const CHIP_NEGOTIATION_STAGE2_ID = `negotiation2_${ALTERNATE_PROFILE_SET_ID}`;

function getChipNegotiationStage1(numChips: number) {
  return createChipStage({
    id: CHIP_NEGOTIATION_STAGE1_ID,
    game: StageGame.CHP,
    name: 'First negotiation game',
    descriptions: createStageTextConfig({
      infoText: `As a reminder, there are three rounds in this game. You will have an opportunity to send an offer to the other participants, and response to their offers, in each round. The objective is to maximize your payout at the end of the game by trading chips to your advantage.\n\nFeel free to refer to the instructions in previous stages for more detail.`,
      helpText: `If you see the "It's your turn" panel, that means others are waiting on you to make an offer! As a reminder, you can **always** make a beneficial offer as long as you have one chip left. For example, if you have one 🔴 red chip remaining, you can offer to **give** it and get 10 🟢 green chips in return for a profit. However, it is unlikely that someone will take you up on this offer. Please consider the tradeoffs.
      `,
    }),
    chips: getChips(numChips),
    progress: {
      minParticipants: 3,
      waitForAllParticipants: true,
      showParticipantProgress: true,
    },
  });
}

function getChipNegotiationStage2(numChips: number) {
  return createChipStage({
    id: CHIP_NEGOTIATION_STAGE2_ID,
    game: StageGame.CHP,
    name: 'Second negotiation game',
    descriptions: createStageTextConfig({
      infoText: `As a reminder, there are three rounds in this game. You will have an opportunity to send an offer to the other participants, and response to their offers, in each round. The objective is to maximize your payout at the end of the game by trading chips to your advantage.\n\nFeel free to refer to the instructions in previous stages for more detail.`,
      helpText: `If you see the "It's your turn" panel, that means others are waiting on you to make an offer! As a reminder, you can **always** make a beneficial offer as long as you have one chip left. For example, if you have one 🔴 red chip remaining, you can offer to **give** it and get 10 🟢 green chips in return for a profit. However, it is unlikely that someone will take you up on this offer. Please consider the tradeoffs.
      `,
    }),
    chips: getChips(numChips),
  });
}

// ****************************************************************************
// Payout stage
// ****************************************************************************
export function createPayoutItems() {
  // Only one payout item with this ID will be selected (at random)
  // for each participant
  const RANDOM_SELECTION_ID = 'negotiation-payout';

  const game1 = createChipPayoutItem({
    randomSelectionId: RANDOM_SELECTION_ID,
    name: 'Payout from game 1 (one game was randomly selected)',
    stageId: CHIP_NEGOTIATION_STAGE1_ID,
    baseCurrencyAmount: 0,
  });

  const game2 = createChipPayoutItem({
    randomSelectionId: RANDOM_SELECTION_ID,
    name: 'Payout from game 2 (one game was randomly selected)',
    stageId: CHIP_NEGOTIATION_STAGE2_ID,
    baseCurrencyAmount: 0,
  });
  return [game1, game2];
}

const CHIP_PAYOUT_STAGE = createPayoutStage({
  id: 'random_payout',
  game: StageGame.CHP,
  payoutItems: createPayoutItems(),
});

// ****************************************************************************
// Post-negotiation survey stage
// ****************************************************************************
const CHIP_SURVEY_STAGE = createSurveyStage({
  id: 'survey',
  name: 'Final survey',
  game: StageGame.CHP,
  questions: [
    createTextSurveyQuestion({
      questionTitle:
        'Please describe your strategy in the game in a few sentences.',
    }),
    createTextSurveyQuestion({
      questionTitle:
        'Please describe any experiences or background that may have influenced your performance in the game.',
    }),
    createScaleSurveyQuestion({
      questionTitle:
        "On a scale from 1 to 10, how would you rate your trading strategy, where 1 is highly **competitive** (focused mainly on your own gains) and 10 is highly **collaborative** (focused on other players's potential gains and mutual benefits?",
      upperText: 'Very aggressive',
      lowerText: 'Not at all aggressive',
    }),
    createScaleSurveyQuestion({
      questionTitle:
        'On a scale from 1 to 10, how certain are you that you made the best possible trades during the experiment?',
      upperText: 'Very confident',
      lowerText: 'Not at all confident',
    }),
    createScaleSurveyQuestion({
      questionTitle:
        'On a scale from 1 to 10, how satisfied are you with your final trading outcomes?',
      upperText: 'Very satisfied',
      lowerText: 'Not at all satisfied',
    }),
    createScaleSurveyQuestion({
      questionTitle:
        "On a scale of 1 to 10, how would you rate the mental effort you put into today's trading games, where 1 means 'I barely engaged in any thinking' and 10 means 'I put in significant mental effort'?",
      upperText: 'Very high mental exertion',
      lowerText: 'No mental exertion at all',
    }),
    createTextSurveyQuestion({
      questionTitle:
        'Please provide any additional context on your answers above.',
    }),
    createTextSurveyQuestion({
      questionTitle:
        'Please help us to improve this experiment. How was your experience today? Were there any elements of the instructions or gameplay that you found confusing?',
    }),
  ],
});
