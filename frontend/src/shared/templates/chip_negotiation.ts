import {
  SECONDARY_PROFILE_SET_ID,
  TERTIARY_PROFILE_SET_ID,
  ChipAssistanceMode,
  ChipItem,
  ProfileType,
  StageConfig,
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
  createMultipleChoiceSurveyQuestion,
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

  // Show anonymized profile 1
  stages.push(CHIP_PROFILE_STAGE);

  // Overview stages (introduce chip game)
  stages.push(createChipInfoStage1(numChips));
  stages.push(createChipInfoStage2(numChips));

  // Comprehension check
  stages.push(CHIP_COMPREHENSION_CHECK);

  // Information on proposing and accepting trades
  stages.push(CHIP_INFO_STAGE_GAMEPLAY_PROPOSING);
  stages.push(CHIP_INFO_STAGE_GAMEPLAY_RESPONDING);

  // Comprehension check
  stages.push(CHIP_COMPREHENSION_CHECK2);

  // Information on AI assistance and payout
  stages.push(CHIP_INFO_STAGE_GAMEPLAY_AI_ASSISTANCE);
  stages.push(createChipInfoPayout(numChips));

  // Pre-game survey stage
  stages.push(CHIP_PRE_SURVEY_STAGE1);

  // Transfer
  stages.push(TRANSFER_STAGE);

  // Coach mode
  stages.push(COACH_MODE_INSTRUCTION);
  stages.push(getChipNegotiationCoach(numChips));
  stages.push(CHIP_COACH_FEEDBACK_STAGE);

  // Advisor mode
  stages.push(ADVISOR_MODE_INSTRUCTION);
  stages.push(CHIP_SECONDARY_PROFILE_STAGE); // Show anonymized profile 2
  stages.push(getChipNegotiationAdvisor(numChips));
  stages.push(CHIP_ADVISOR_FEEDBACK_STAGE);

  // Delegate mode
  stages.push(DELEGATE_MODE_INSTRUCTION);
  stages.push(CHIP_TERTIARY_PROFILE_STAGE); // Show anonymized profile 3
  stages.push(getChipNegotiationDelegate(numChips));
  stages.push(CHIP_DELEGATE_FEEDBACK_STAGE);

  // Payout (averaged between three games)
  stages.push(CHIP_PAYOUT_STAGE);

  // Post-negotiation survey stage
  stages.push(CHIP_POST_SURVEY_STAGE);

  return stages;
}

// ****************************************************************************
// Informed consent stage
// ****************************************************************************
const CHIP_TOS_STAGE = createTOSStage({
  id: 'tos',
  name: 'Terms of service',
  tosLines: [
    'Thank you for your interest in this research. If you choose to participate, you will be asked to play negotiation games with other participants. In total, this will take up to 60 minutes, factoring in time you may spend waiting for others to join your live sessions. If the games take longer than expected, you will be compensated fairly for your additional time.',
    '\n**Compensation**',
    'You will be paid a base amount for playing the games and completing the survey. You may receive an additional bonus based on your performance in the games, up to $10 USD.',
    '\n**IRB**',
    'The results of this study will be used solely for research purposes. Our team will keep all your information from this study strictly confidential, as required by law. The IRB is responsible for protecting the rights and welfare of research volunteers like you.',
    '\n**Voluntary participation**',
    'Your participation is voluntary, which means you can choose whether or not to participate. You may choose not to participate by exiting at any point. There are no known costs to you for participating in this research study except for your time.',
    '\n**Contact**',
    'Please feel free to contact us through Prolific or your game administrator if you have any questions, concerns, or complaints about this study.',
    '\nBy checking the box below and proceeding, you are acknowledging that you are over the age of 18 and that you consent to participate. Clicking "Next Step" will bring you to the beginning of the task.',
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
  profileType: ProfileType.ANONYMOUS_ANIMAL,
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

const CHIP_SECONDARY_PROFILE_STAGE = createProfileStage({
  id: `profile_${SECONDARY_PROFILE_SET_ID}`,
  name: 'View randomly generated profile for second game',
  descriptions: createStageTextConfig({
    primaryText:
      'This identity is how other players will see you during the second game.',
  }),
  profileType: ProfileType.ANONYMOUS_ANIMAL,
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

const CHIP_TERTIARY_PROFILE_STAGE = createProfileStage({
  id: `profile_${TERTIARY_PROFILE_SET_ID}`,
  name: 'View randomly generated profile for third game',
  descriptions: createStageTextConfig({
    primaryText:
      'This identity is how other players will see you during the third game.',
  }),
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
    'In this experiment, you will be playing a trading game with two other participants.',
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
    'You may receive a bonus payment depending on the value of your chips at the end of the game.\n',
    '\n',
    `\n# How the game works`,
    `The game consists of **3 rounds** of trading. During each round, each player will have a turn to propose **1 trade**. These turns are pre-determined in a random order.`,
  );

  return createInfoStage({
    id: 'info_overview1',
    name: 'Instructions: overview',
    infoLines,
    progress: createStageProgressConfig({
      showParticipantProgress: false,
    }),
  });
}

function createChipInfoStage2(numChips: number) {
  const infoLines = [
    'You will play this trading game three times. In each game, you and the other participants will start with:',
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
      'For example, Cat might value 🔴 red chips at $0.30 each, while Mouse might value 🔴 red chips at $0.80 each.',
    );
    infoLines.push(
      "‼️ IMPORTANT: You know your own chip valuation and that everyone values � green chips at $0.50 per chip. However, you do not know the other players' valuations for the other chips, and they do not know your valuations (besides 🟢 green chips)!",
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
    'The following table is shown to you during the game. It provides the number of chips everyone has as well as a reminder of your own valuations.',
    '![Example of a table](https://i.imgur.com/pm3FrZs.png)',
  );

  return createInfoStage({
    id: 'info_overview2',
    name: 'Instructions: chip valuations',
    infoLines,
    progress: createStageProgressConfig({
      showParticipantProgress: false,
    }),
  });
}

// ****************************************************************************
// Comprehension checks
// ****************************************************************************
export const CHIP_COMPREHENSION_CHECK = createComprehensionStage({
  id: 'comprehension_check1',
  name: 'Comprehension check',
  descriptions: createStageTextConfig({
    primaryText:
      'Please answer the following questions to verify your understanding of the instructions. Use the navigation bar to click on previous stages to refresh your memory. You may proceed once you have answered the questions correctly.',
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
  name: 'Comprehension check 2',
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
  descriptions: createStageTextConfig({
    primaryText:
      'Please answer the following questions to verify your understanding of the instructions. Use the navigation bar to click on previous stages to refresh your memory. You may proceed once you have answered the questions correctly.',
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

const CHIP_INFO_STAGE_GAMEPLAY_PROPOSING = createInfoStage({
  id: 'info_gameplay2',
  name: 'Gameplay: proposing a trade',
  infoLines: [
    `## Trade proposals`,
    `To propose a trade, a player must:`,
    `1. Request a certain quantity of chips of a single color from any other player to **get**.`,
    `2. Specify a certain quantity of chips of a different color to **give** in return.`,
    `\n\n## Trade rules`,
    `* Players cannot offer more chips than they currently hold. For example, if you only have 5 🔴 red chips, you cannot offer 6 🔴 red chips.`,
    `* Players cannot trade chips of the same color. For example, you cannot trade 🔴 red chips for 🔴 red chips.`,
    `\n\n## ⏰ Time limit`,
    'Please enter your offer within 1 minute! If you do not enter your offer within 1 minute, the experimenter will send you an attention check.',
    '![Example of offering a trade](https://i.imgur.com/Jzah8Ot.png)',
    `\n## 🌟 One tip`,
    'As a reminder, you can **always** make a beneficial offer as long as you have one chip left. For example, if you have one 🔴 red chip remaining, you can offer to **give** it and get 10 🟢 green chips in return for a profit. However, it is unlikely that someone will take you up on this offer. Please consider the tradeoffs. 🙂',
  ],
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

const CHIP_INFO_STAGE_GAMEPLAY_RESPONDING = createInfoStage({
  id: 'info_gameplay4',
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

const CHIP_INFO_STAGE_GAMEPLAY_AI_ASSISTANCE = createInfoStage({
  id: 'info_gameplay5',
  name: 'Gameplay: AI assistance',
  infoLines: [
    `Today, you will play three versions of the negotiation game against different players. In each game, you will have access to one of the following AI assistance modes, which will be described in further detail later:`,
    `* **AI delegate**: In delegation mode, you can delegate your trading decisions to an AI assistant. The AI will take actions on your behalf.`,
    `* **AI advisor**: In advisor mode, you can ask an AI assistant to give recommendations on which action to take. The AI will provide suggestions, but you must make the final decision.`,
    `* **AI coach**: In coach mode, you can ask an AI assistant for feedback on your actions. The AI will provide coaching, but you must make the final decision.`,
    `\nAt each turn, you will have the option of opting into AI assistance or not. You will always have the option to ignore the AI assistance and take actions yourself.`,
  ],
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

// ****************************************************************************
// Payment information
// ****************************************************************************/

function createChipInfoPayout(numChips: number) {
  const infoLines = [
    '## Bonus payment',
    'At the end of the study, we will *average* the money you earned across the three negotiation games, **up to $10 USD.**',
    'There are two important features to remember about the bonus:',
    '  * The bonus will be equivalent to how much money you earn through trading *beyond* what you start with.',
    '  * If you do not complete all games, you will not receive a bonus payment.',
  ];

  infoLines.push('## Bonus payment example calculation');

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
    '\n**Your total bonus will be averaged from your bonus payout across the three games.**',
    '\nThe exact values will depend on your random chip valuations and your final holdings, so your payment may differ from this example.',
    '\nThis payment is in addition to the base payment for participating.',
  );

  return createInfoStage({
    id: 'info_payment1',
    name: 'Payment information ',
    infoLines,
    progress: createStageProgressConfig({
      showParticipantProgress: false,
    }),
  });
}

const CHIP_INFO_PART2 = createInfoStage({
  id: 'info_part2',
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
    id: 'red',
    name: 'red',
    avatar: '🔴',
    canBuy: true,
    canSell: true,
    startingQuantity: N_INITIAL_RED_CHIPS,
    lowerValue: 0.1,
    upperValue: 1,
  };

  const blueChip = {
    id: 'blue',
    name: 'blue',
    avatar: '🔵',
    canBuy: true,
    canSell: true,
    startingQuantity: N_INITIAL_BLUE_CHIPS,
    lowerValue: 0.1,
    upperValue: 1,
  };

  const purpleChip = {
    id: 'purple',
    name: 'purple',
    avatar: '🟣',
    canBuy: true,
    canSell: true,
    startingQuantity: N_INITIAL_PURPLE_CHIPS,
    lowerValue: 0.1,
    upperValue: 1,
  };

  const greenChip = {
    id: 'green',
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

// ****************************************************************************
// Stage IDs for chip games
// ****************************************************************************
const CHIP_NEGOTIATION_COACH_ID = `chip_coach`;
const CHIP_NEGOTIATION_ADVISOR_ID = `chip_advisor_${SECONDARY_PROFILE_SET_ID}`;
const CHIP_NEGOTIATION_DELEGATE_ID = `chip_delegate_${TERTIARY_PROFILE_SET_ID}`;

// ****************************************************************************
// Chip negotiation games
// ****************************************************************************
function getChipNegotiationCoach(numChips: number) {
  return createChipStage({
    id: CHIP_NEGOTIATION_COACH_ID,
    name: 'Game (with AI coach)',
    progress: {
      minParticipants: 3,
      waitForAllParticipants: true,
      showParticipantProgress: true,
    },
    descriptions: createStageTextConfig({
      infoText: `As a reminder, there are three rounds in this game. You will have an opportunity to send an offer to the other participants, and response to their offers, in each round. The objective is to maximize your payout at the end of the game by trading chips to your advantage.\n\nFeel free to refer to the instructions in previous stages for more detail.`,
      helpText: `If you see the "It's your turn" panel, that means others are waiting on you to make an offer! As a reminder, you can **always** make a beneficial offer as long as you have one chip left. For example, if you have one 🔴 red chip remaining, you can offer to **give** it and get 10 🟢 green chips in return for a profit. However, it is unlikely that someone will take you up on this offer. Please consider the tradeoffs.
      `,
    }),
    chips: getChips(numChips),
    assistanceConfig: {
      offerModes: [ChipAssistanceMode.NONE, ChipAssistanceMode.COACH],
      responseModes: [ChipAssistanceMode.NONE, ChipAssistanceMode.COACH],
    },
  });
}

function getChipNegotiationAdvisor(numChips: number) {
  return createChipStage({
    id: CHIP_NEGOTIATION_ADVISOR_ID,
    name: 'Game (with AI advisor)',
    descriptions: createStageTextConfig({
      infoText: `As a reminder, there are three rounds in this game. You will have an opportunity to send an offer to the other participants, and response to their offers, in each round. The objective is to maximize your payout at the end of the game by trading chips to your advantage.\n\nFeel free to refer to the instructions in previous stages for more detail.`,
      helpText: `If you see the "It's your turn" panel, that means others are waiting on you to make an offer! As a reminder, you can **always** make a beneficial offer as long as you have one chip left. For example, if you have one 🔴 red chip remaining, you can offer to **give** it and get 10 🟢 green chips in return for a profit. However, it is unlikely that someone will take you up on this offer. Please consider the tradeoffs.
      `,
    }),
    chips: getChips(numChips),
    assistanceConfig: {
      offerModes: [ChipAssistanceMode.NONE, ChipAssistanceMode.ADVISOR],
      responseModes: [ChipAssistanceMode.NONE, ChipAssistanceMode.ADVISOR],
    },
    // WARNING: Do not use waiting/progress stages for stages with alternate
    // profiles (as waiting/progress will show the original profiles)
    progress: {
      minParticipants: 0, // Do not show waiting
      waitForAllParticipants: false, // Do not show waiting
      showParticipantProgress: false, // Do not show progress
    },
  });
}

function getChipNegotiationDelegate(numChips: number) {
  return createChipStage({
    id: CHIP_NEGOTIATION_DELEGATE_ID,
    name: 'Game (with AI delegate)',
    descriptions: createStageTextConfig({
      infoText: `As a reminder, there are three rounds in this game. You will have an opportunity to send an offer to the other participants, and response to their offers, in each round. The objective is to maximize your payout at the end of the game by trading chips to your advantage.\n\nFeel free to refer to the instructions in previous stages for more detail.`,
      helpText: `If you see the "It's your turn" panel, that means others are waiting on you to make an offer! As a reminder, you can **always** make a beneficial offer as long as you have one chip left. For example, if you have one 🔴 red chip remaining, you can offer to **give** it and get 10 🟢 green chips in return for a profit. However, it is unlikely that someone will take you up on this offer. Please consider the tradeoffs.
      `,
    }),
    chips: getChips(numChips),
    assistanceConfig: {
      offerModes: [ChipAssistanceMode.NONE, ChipAssistanceMode.DELEGATE],
      responseModes: [ChipAssistanceMode.NONE, ChipAssistanceMode.DELEGATE],
    },
    // WARNING: Do not use waiting/progress stages for stages with alternate
    // profiles (as waiting/progress will show the original profiles)
    progress: {
      minParticipants: 0, // Do not show waiting
      waitForAllParticipants: false, // Do not show waiting
      showParticipantProgress: false, // Do not show progress
    },
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
    name: 'Payout from game 1',
    stageId: CHIP_NEGOTIATION_COACH_ID,
    baseCurrencyAmount: 0,
  });

  const game2 = createChipPayoutItem({
    randomSelectionId: RANDOM_SELECTION_ID,
    name: 'Payout from game 2',
    stageId: CHIP_NEGOTIATION_ADVISOR_ID,
    baseCurrencyAmount: 0,
  });

  // Add the game 3
  const game3 = createChipPayoutItem({
    randomSelectionId: RANDOM_SELECTION_ID,
    name: 'Payout from game 3',
    stageId: CHIP_NEGOTIATION_DELEGATE_ID,
    baseCurrencyAmount: 0,
  });

  return [game1, game2, game3];
}

const CHIP_PAYOUT_STAGE = createPayoutStage({
  id: 'average_payout',
  payoutItems: createPayoutItems(),
  averageAllPayoutItems: true,
});

// ****************************************************************************
// Post-negotiation survey stage
// ****************************************************************************
const CHIP_SURVEY_STAGE = createSurveyStage({
  id: 'survey',
  name: 'Final survey',
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

const COACH_MODE_INSTRUCTION = createInfoStage({
  id: 'coach_instruction',
  name: 'Game instructions: AI coach',
  infoLines: [
    'In this game, an AI-based agent will act as your private coach. The agent sees everything you see.',
    '',
    '* **Your choice:** At each turn, you input your move. You can then either submit the move directly or ask the coach for feedback on your idea.',
    "* **How the coach works:** First, input the action you plan to take, then click the “Coach” button if you'd like feedback from the AI agent. The agent will provide a one-time analysis to help you strengthen your approach.",
    '* **Next step:** After receiving feedback, you can revise your action before sending.',
    '* **‼️ Important:** You need to make the final decision by clicking the "Submit offer" button.',
    '',
    'Here’s how the AI coach might help you with the proposal:',
    '![Example of receiving an offer](https://i.imgur.com/YTluFKf.png)',
    'Here’s how the AI coach might give feedback on the response:',
    '![Example of receiving an offer](https://i.imgur.com/h6E2hco.png)',
  ],
});

const ADVISOR_MODE_INSTRUCTION = createInfoStage({
  id: 'advisor_instruction',
  name: 'Game instructions: AI advisor',
  infoLines: [
    'In this game, an AI-based agent will act as your private advisor. If prompted, it will suggest a specific move for you to take and explain its reasoning. The agent sees everything you see.',
    '',
    '* **Your choice:** At each turn, you can either make your move directly or first ask the advisor for a recommendation.',
    '* **How the advisor works:** If you ask for advice, the advisor will suggest a move and provide the strategic rationale behind it.',
    "* **Next step:** After seeing the recommendation, you can either accept the agent's move or ignore it and enter your own action.",
    '* ** ‼️ Important:** You need to make the final decision by clicking the "Submit offer" button.',
    '',
    'Here’s how the AI advisor might give suggestions on the proposal:',
    '![Example of receiving an offer](https://i.imgur.com/HyluDin.png)',
    'Here’s how the AI advisor might give suggestions on the response:',
    '![Example of receiving an offer](https://i.imgur.com/Q4tHXz2.png)',
  ],
});

const DELEGATE_MODE_INSTRUCTION = createInfoStage({
  id: 'delegate_instruction',
  name: 'Game instructions: AI delegate',
  infoLines: [
    'In this game, you have the option of delegating game moves to an AI-based delegate. The agent will full control and negotiate on your behalf for a given turn. The agent sees everything you see.',
    '',
    '**• Your choice:** At each turn, you can either make the move yourself or delegate the entire turn to the agent.',
    '**• How the delegate works:** If you choose to delegate, the agent will decide and execute a move for you, and provide you with a reason.',
    'Remember that the delegate is built upon the same underlying AI model as the advisor and the coach, but you will only be shown its final decision and the reasoning only for the OFFER not the reject/accept decision.',

    'Here’s how you can delegate the proposal to the AI:',
    '![Example of the AI delegate making an decision when proposing](https://i.imgur.com/Qbpwm1Z.png)',
    '![Example of the reasonings](https://i.imgur.com/rhRKCuT.png)',
    'Here’s how you can delegate the response to the AI:',
    '![Example of the AI delegate making an decision when responding to an offer](https://i.imgur.com/1Yev7H7.png)',
  ],
});

// ****************************************************************************
// Pre-negotiation survey stage
// ****************************************************************************
const CHIP_PRE_SURVEY_STAGE1 = createSurveyStage({
  id: 'pre_survey_1',
  name: 'Pre-game survey 1',
  descriptions: createStageTextConfig({
    primaryText:
      'Before you play the bargaining games, please complete this short survey so we can better understand your background and perspectives. \
      Completion of this survey is required to receive bonus payouts. \n \
      This section asks about your expectations about the different AI tools available to you in the game.\n \
      As a reminder, you’ll have access to three types of AI tools (a coach, delegate, and advisor) over three games, all powered by Google Gemini 2.5 (a large language model) and built on the same underlying capabilities.\n \
      Please indicate how much you agree or disagree with the following statements based on your expectations. ',
  }),
  questions: [
    // Relevant skills section
    createScaleSurveyQuestion({
      questionTitle:
        'Based on the instructions you just read, how confident do you feel in your ability to play this game well?',
      lowerText: 'Not at all confident',
      lowerValue: 1,
      upperText: 'Very confident',
      upperValue: 5,
    }),
    // Relevant experience section
    createScaleSurveyQuestion({
      questionTitle:
        'How much prior experience do you have with games or tasks similar to this one?',
      lowerText: 'No experience',
      lowerValue: 1,
      upperText: 'Extensive experience',
      upperValue: 5,
    }),
    createTextSurveyQuestion({
      questionTitle:
        'Please describe any background, skills, or experiences that might help you in this game (e.g., negotiation, bargaining, math, logic, strategic thinking—even informal or everyday situations).',
    }),

    // Perspectives on AI tooling
    createScaleSurveyQuestion({
      questionTitle:
        'I believe that having access to the AI tools will improve my performance in this game.',
      lowerText: 'Strongly disagree',
      lowerValue: 1,
      upperText: 'Strongly agree',
      upperValue: 5,
    }),
    createScaleSurveyQuestion({
      questionTitle:
        'I believe that the AI tools will provide information I can trust.',
      lowerText: 'Strongly disagree',
      lowerValue: 1,
      upperText: 'Strongly agree',
      upperValue: 5,
    }),
    createScaleSurveyQuestion({
      questionTitle:
        'I believe that the AI tools will help me see options or strategies I might otherwise miss.',
      lowerText: 'Strongly disagree',
      lowerValue: 1,
      upperText: 'Strongly agree',
      upperValue: 5,
    }),
    createScaleSurveyQuestion({
      questionTitle:
        'I believe that the AI tools will help lighten the mental workload of playing this game.',
      lowerText: 'Strongly disagree',
      lowerValue: 1,
      upperText: 'Strongly agree',
      upperValue: 5,
    }),
  ],
});

// ****************************************************************************
// Post-negotiation survey stage
// ****************************************************************************

const CHIP_POST_SURVEY_STAGE = createSurveyStage({
  id: 'post_survey',
  name: 'Post-game survey',
  descriptions: createStageTextConfig({
    primaryText:
      'Thank you for completing the games. Please complete this short survey so we can learn more about your experience today.',
  }),
  questions: [
    // General gameplay
    createTextSurveyQuestion({
      questionTitle:
        'Please describe your strategy in the games in a few sentences.',
    }),
    createScaleSurveyQuestion({
      questionTitle: 'How satisfied are you with your final trading outcomes?',
      lowerText: 'Not at all satisfied',
      lowerValue: 1,
      upperText: 'Very satisfied',
      upperValue: 5,
    }),
    createScaleSurveyQuestion({
      questionTitle:
        'Thinking about both the difficulty of the games and your own effort, how mentally intensive was today’s experience overall?',
      lowerText: 'Not at all intensive',
      lowerValue: 1,
      upperText: 'Very intensive',
      upperValue: 5,
    }),

    createMultipleChoiceSurveyQuestion({
      questionTitle:
        'If you were to play again, which AI assistance mode would you prefer to use—and why?',
      options: [
        createMultipleChoiceItem({
          text: 'Coach mode: the AI gave feedback on your decisions after you made them.',
        }),
        createMultipleChoiceItem({
          text: 'Advisor mode: the AI offered suggestions before you made your decisions.',
        }),
        createMultipleChoiceItem({
          text: 'Delegate mode: the AI made decisions on your behalf.',
        }),
        createMultipleChoiceItem({text: 'None of the above'}),
      ],
    }),

    // Additional context
    createTextSurveyQuestion({
      questionTitle:
        'Provide additional context on your answer above: If you had a preference, why did you prefer that mode? What influenced your choice — ease of use, effectiveness, alignment with your goals, or something else? If you didn’t prefer any of the modes, why not?',
    }),

    // Feedback
    createTextSurveyQuestion({
      questionTitle:
        'Please help us improve the experiment. How was your experience today? Were there any parts of the instructions, interface, or gameplay that felt confusing or unclear?',
    }),
  ],
});

// ****************************************************************************
// Coach mode survey stage
// ****************************************************************************

const CHIP_COACH_FEEDBACK_STAGE = createSurveyStage({
  id: 'coach_feedback',
  name: 'Coach feedback survey',
  descriptions: createStageTextConfig({
    primaryText:
      'Please fill out this brief survey about the previous game, where you had access to an AI-powered coach. Completion of this survey is required to receive bonus payouts. Indicate how much you agree or disagree with the following statements, where 1 = Strongly disagree, 2 = Disagree, 3 = Neutral, 4 = Agree, 5 = Strongly agree.',
  }),
  questions: [
    createScaleSurveyQuestion({
      questionTitle:
        'Having access to the coach improved my performance in the game.',
      lowerText: 'Strongly disagree',
      lowerValue: 1,
      upperText: 'Strongly agree',
      upperValue: 5,
    }),
    createScaleSurveyQuestion({
      questionTitle:
        'Having access to the coach helped lighten the mental load of the game.',
      lowerText: 'Strongly disagree',
      lowerValue: 1,
      upperText: 'Strongly agree',
      upperValue: 5,
    }),
    createScaleSurveyQuestion({
      questionTitle:
        'The coach provided insights I wouldn’t have thought of on my own.',
      lowerText: 'Strongly disagree',
      lowerValue: 1,
      upperText: 'Strongly agree',
      upperValue: 5,
    }),
    createScaleSurveyQuestion({
      questionTitle: "The coach's feedback was clear and easy to understand.",
      lowerText: 'Strongly disagree',
      lowerValue: 1,
      upperText: 'Strongly agree',
      upperValue: 5,
    }),
    createScaleSurveyQuestion({
      questionTitle: "I trusted the coach's feedback.",
      lowerText: 'Strongly disagree',
      lowerValue: 1,
      upperText: 'Strongly agree',
      upperValue: 5,
    }),
    createScaleSurveyQuestion({
      questionTitle: "I am satisfied with the coach's feedback.",
      lowerText: 'Strongly disagree',
      lowerValue: 1,
      upperText: 'Strongly agree',
      upperValue: 5,
    }),
    createTextSurveyQuestion({
      questionTitle:
        'Please share any additional context on your answers. How did you decide to use (or not use) the coach? What did you think of the quality or usefulness of its suggestions?',
    }),
  ],
});

// ****************************************************************************
// Advisor mode survey stage
// ****************************************************************************

const CHIP_ADVISOR_FEEDBACK_STAGE = createSurveyStage({
  id: 'advisor_feedback',
  name: 'Advisor feedback survey',
  descriptions: createStageTextConfig({
    primaryText:
      'Please fill out this brief survey about the previous game, where you had access to an AI-powered advisor. Completion of this survey is required to receive bonus payouts. Indicate how much you agree or disagree with the following statements, where 1 = Strongly disagree, 2 = Disagree, 3 = Neutral, 4 = Agree, 5 = Strongly agree.',
  }),
  questions: [
    createScaleSurveyQuestion({
      questionTitle:
        'Having access to the advisor helped me perform better in the game.',
      lowerText: 'Strongly disagree',
      lowerValue: 1,
      upperText: 'Strongly agree',
      upperValue: 5,
    }),
    createScaleSurveyQuestion({
      questionTitle:
        'Having access to the advisor helped lighten the mental load of the game.',
      lowerText: 'Strongly disagree',
      lowerValue: 1,
      upperText: 'Strongly agree',
      upperValue: 5,
    }),
    createScaleSurveyQuestion({
      questionTitle:
        "The advisor provided recommendations I wouldn't have thought of on my own.",
      lowerText: 'Strongly disagree',
      lowerValue: 1,
      upperText: 'Strongly agree',
      upperValue: 5,
    }),
    createScaleSurveyQuestion({
      questionTitle:
        "The advisor's suggestions were clear and easy to understand.",
      lowerText: 'Strongly disagree',
      lowerValue: 1,
      upperText: 'Strongly agree',
      upperValue: 5,
    }),
    createScaleSurveyQuestion({
      questionTitle: "I trusted the advisor's recommendations.",
      lowerText: 'Strongly disagree',
      lowerValue: 1,
      upperText: 'Strongly agree',
      upperValue: 5,
    }),
    createScaleSurveyQuestion({
      questionTitle: "I am satisfied with the advisor's recommendations.",
      lowerText: 'Strongly disagree',
      lowerValue: 1,
      upperText: 'Strongly agree',
      upperValue: 5,
    }),
    createTextSurveyQuestion({
      questionTitle:
        'Please share any additional context on your answers. How did you decide to use (or not use) the advisor? What did you think of the quality or usefulness of its suggestions?',
    }),
  ],
});

// ****************************************************************************
// Delegate mode survey stage
// ****************************************************************************
const CHIP_DELEGATE_FEEDBACK_STAGE = createSurveyStage({
  id: 'delegate_feedback',
  name: 'Delegation feedback survey',
  descriptions: createStageTextConfig({
    primaryText:
      'Please fill out this brief survey about the previous game, where you had access to an AI-powered delegate. Completion of this survey is required to receive bonus payouts. Indicate how much you agree or disagree with the following statements, where 1 = Strongly disagree, 2 = Disagree, 3 = Neutral, 4 = Agree, 5 = Strongly agree.',
  }),
  questions: [
    createScaleSurveyQuestion({
      questionTitle:
        'Having access to the delegate helped me perform better in the game.',
      lowerText: 'Strongly disagree',
      lowerValue: 1,
      upperText: 'Strongly agree',
      upperValue: 5,
    }),
    createScaleSurveyQuestion({
      questionTitle:
        'Having access to the delegate helped lighten the mental load of the game.',
      lowerText: 'Strongly disagree',
      lowerValue: 1,
      upperText: 'Strongly agree',
      upperValue: 5,
    }),
    createScaleSurveyQuestion({
      questionTitle:
        "The delegate took actions I wouldn't have thought of on my own.",
      lowerText: 'Strongly disagree',
      lowerValue: 1,
      upperText: 'Strongly agree',
      upperValue: 5,
    }),
    createScaleSurveyQuestion({
      questionTitle:
        "The delegate's actions and reasoning were clear and easy to understand.",
      lowerText: 'Strongly disagree',
      lowerValue: 1,
      upperText: 'Strongly agree',
      upperValue: 5,
    }),
    createScaleSurveyQuestion({
      questionTitle: "I trusted the delegate's decisions.",
      lowerText: 'Strongly disagree',
      lowerValue: 1,
      upperText: 'Strongly agree',
      upperValue: 5,
    }),
    createScaleSurveyQuestion({
      questionTitle: "I am satisfied with the delegate's decisions.",
      lowerText: 'Strongly disagree',
      lowerValue: 1,
      upperText: 'Strongly agree',
      upperValue: 5,
    }),
    createTextSurveyQuestion({
      questionTitle:
        'Please share any additional context on your answers. How did you decide to use (or not use) the DELEGATE? What did you think of the quality or usefulness of its suggestions?',
    }),
  ],
});
