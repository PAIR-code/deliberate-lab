import {
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
  createSurveyStage,
  createTransferStage,
  createTOSStage,
  createStageTextConfig,
  createScaleSurveyQuestion,
  createTextSurveyQuestion,
} from '@deliberation-lab/utils';

// ****************************************************************************
// Game parameters
// ****************************************************************************
export const N_INITIAL_GREEN_CHIPS = 10;
export const N_INITIAL_BLUE_CHIPS = 10;
export const N_INITIAL_RED_CHIPS = 10;

// ****************************************************************************
// Experiment config
// ****************************************************************************
export const CHIP_GAME_METADATA = createMetadataConfig({
  name: 'Chip Negotiation',
  publicName: 'Chip Negotiation',
  description: 'A trading scenario that showcases a custom negotiation module.',
});

export function getChipNegotiationStageConfigs(): StageConfig[] {
  const stages: StageConfig[] = [];

  // Informed consent
  stages.push(CHIP_TOS_STAGE);

  // Anonymized profiles
  stages.push(CHIP_PROFILE_STAGE);

  // Overview stages
  stages.push(CHIP_INFO_STAGE_OVERVIEW);
  stages.push(CHIP_INFO_STAGE_OVERVIEW2);

  // Comprehension check
  stages.push(CHIP_COMPREHENSION_CHECK);

  // Gameplay stages
  stages.push(CHIP_INFO_STAGE_GAMEPLAY);
  stages.push(CHIP_INFO_STAGE_GAMEPLAY2);
  stages.push(CHIP_INFO_STAGE_GAMEPLAY3);
  stages.push(CHIP_INFO_STAGE_GAMEPLAY4);
  stages.push(CHIP_INFO_STAGE_GAMEPLAY5);

  // Comprehension check
  stages.push(CHIP_COMPREHENSION_CHECK2);

  stages.push(CHIP_INFO_STAGE_PAYOUT);

  // First transfer
  stages.push(CHIP_INITIAL_TRANSFER_STAGE);

  // Round 1
  stages.push(CHIP_NEGOTIATION_STAGE);
  stages.push(CHIP_PAYOUT_STAGE);

  stages.push(TRANSFER_STAGE);
  stages.push(CHIP_INFO_TRANSFER_STAGE);

  // Round 2
  stages.push(CHIP_NEGOTIATION_STAGE2);
  stages.push(CHIP_PAYOUT_STAGE2);

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
    'Thank you for your interest in this research. If you choose to participate, you will be asked to play negotiation games with other participants. In total, this will take no more than 60 minutes.',
    '\n**Compensation**',
    'You will be paid $8 for playing the games and completing the survey. You may receive an additional bonus on your performance in the games.',
    '\n**IRB**',
    'The results of this study will be used solely for research purposes. Our team will keep all your information from this study strictly confidential, as required by law. The IRB at the Massachusetts Institute of Technology is responsible for protecting the rights and welfare of research volunteers like you.',
    '\n**Voluntary participation**',
    'Your participation is voluntary, which means you can choose whether or not to participate. You may choose not to participate by exiting the survey at any point. There are no known costs to you for participating in this research study except for your time.',
    '\n**Contact**',
    'Please feel free to contact us through Prolific or your game administrator if you have any questions, concerns, or complaints about this study.',
    '\nBy checking the box below and proceeding, you are acknowledging that you are over the age of 18 and that you consent to participate. Clicking the arrow will bring you to the beginning of the task.',
  ],
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
});

// ****************************************************************************
// Info stage for chip negotiation
// ****************************************************************************

const CHIP_INFO_STAGE_OVERVIEW = createInfoStage({
  id: 'info_overview',
  game: StageGame.CHP,
  name: 'Overview (1/2)',
  infoLines: [
    'In this experiment, you will be playing a trading game with other participants. All of you will be given the same initial amount of 🔴 red chips, 🟢 green chips, and 🔵 blue chips, but you may value the different colors of chips differently.',
    'By making and accepting offers, you will try to exchange chips with the other players to increase the total value of chips that you end up holding at the end of the game.',
    'You may receive a bonus payment depending on the final value of your chips.',
  ],
});

const CHIP_INFO_STAGE_OVERVIEW2 = createInfoStage({
  id: 'info_overview2',
  game: StageGame.CHP,
  name: 'Overview (2/2)',
  infoLines: [
    'You will play this trading game two times, against different groups of participants. In each game, you and the other participants will start with:',
    `* 🔴 ${N_INITIAL_RED_CHIPS} **red** chips`,
    `* 🟢 ${N_INITIAL_GREEN_CHIPS} **green** chips`,
    `* 🔵 ${N_INITIAL_BLUE_CHIPS} **blue** chips`,
    '**Valuations:**',
    'Each 🟢 green chip is worth $0.05 to each participant. However, you will all have different valuations for the red and blue chips, randomly chosen between $0.01 and $0.10. For example, Cat might value 🔴 red chips at $0.03 each and 🔵 blue chips at $0.07 each, while Mouse might value 🔴 red chips at $0.08 each and 🔵 blue chips at $0.03 each.',
    "You know your own chip valuation and that everyone values 🟢 green chips the same, at $0.05 per chip. However, you do not know the other players' valuations for red and blue chips.",
    '![Example of chip count table](https://i.imgur.com/ImUM14D.png)',
    'The table above is shown to you during the game, and provides the number of chips everyone has as well as a reminder of your own valuation.',
    '\n**What this means:**',
    'Because each participant values the chips differently, there may be good reasons to trade. For instance, if you don’t care much about 🔴 red chips but someone else does, you might offer your red chips to them in exchange for 🔵 blue chips, which you like more. In this way, both you and the other participant can end up with chips that you find more valuable. This is what creates the opportunity to gain from trading.',
  ],
});

// ****************************************************************************
// Comprehension checks 1
// ****************************************************************************
export const CHIP_COMPREHENSION_CHECK = createComprehensionStage({
  game: StageGame.CHP,
  name: 'Comprehension check',
  descriptions: createStageTextConfig({
    primaryText:
      'Please answer the following questions to verify your understanding of the instructions. You may proceed once you have answered the questions correctly.',
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
      'b' // correct answer ID
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
      'd' // correct answer ID
    ),
  ],
});

// ****************************************************************************
// Gameplay instructions
// ****************************************************************************

const CHIP_INFO_STAGE_GAMEPLAY = createInfoStage({
  id: 'info_gameplay',
  game: StageGame.CHP,
  name: 'Gameplay (1/5)',
  infoLines: [
    `## How the game works`,
    `The game consists of **3 rounds** of trading. During each round, each player will have a turn to propose **1 trade**. These turns are pre-determined in a random order.`,
  ],
});

const CHIP_INFO_STAGE_GAMEPLAY2 = createInfoStage({
  id: 'info_gameplay2',
  game: StageGame.CHP,
  name: 'Gameplay (2/5)',
  infoLines: [
    `## How the game works`,
    `The game consists of **3 rounds** of trading. During each round, each player will have a turn to propose **1 trade**. These turns are pre-determined in a random order.`,
    `\n\n## Trade proposals`,
    `To propose a trade, a player must:`,
    `1. Request a certain quantity of chips of a single color from any other player to **get**`,
    `2. Specify a certain quantity of chips of a different color to **give** in return`,
  ],
});

const CHIP_INFO_STAGE_GAMEPLAY3 = createInfoStage({
  id: 'info_gameplay3',
  game: StageGame.CHP,
  name: 'Gameplay (3/5)',
  infoLines: [
    `## How the game works`,
    `The game consists of **3 rounds** of trading. During each round, each player will have a turn to propose **1 trade**. These turns are pre-determined in a random order.`,
    `\n\n## Trade proposals`,
    `To propose a trade, a player must:`,
    `1. Request a certain quantity of chips of a single color from any other player to **get**`,
    `2. Specify a certain quantity of chips of a different color to **give** in return`,
    `## How the game works`,
    `The game consists of **3 rounds** of trading. During each round, each player will have a turn to propose **1 trade**. These turns are pre-determined in a random order.`,
    `\n\n## Trade rules`,
    `* Players can trade quantities of chips. For example, a player can trade 5 🔴 red chips for 6 🟢 green chips.`,
    `* Players cannot offer more chips than they currently hold. For example, if you only have 5 🔴 red chips, you cannot offer 6 🔴 red chips.`,
    `* Players cannot trade chips of the same color. You cannot trade 🔴 red chips for 🔴 red chips, for example.`,
    '![Example of offering a trade](https://i.imgur.com/Jzah8Ot.png)',
  ],
});

const CHIP_INFO_STAGE_GAMEPLAY4 = createInfoStage({
  id: 'info_gameplay4',
  game: StageGame.CHP,
  name: 'Gameplay (4/5)',
  infoLines: [
    `## How the game works`,
    `The game consists of **3 rounds** of trading. During each round, each player will have a turn to propose **1 trade**. These turns are pre-determined in a random order.`,
    `\n\n## Trade proposals`,
    `To propose a trade, a player must:`,
    `1. Request a certain quantity of chips of a single color from any other player to **get**`,
    `2. Specify a certain quantity of chips of a different color to **give** in return`,
    `## How the game works`,
    `The game consists of **3 rounds** of trading. During each round, each player will have a turn to propose **1 trade**. These turns are pre-determined in a random order.`,
    `\n\n## Trade rules`,
    `* Players can trade quantities of chips. For example, a player can trade 5 🔴 red chips for 6 🟢 green chips.`,
    `* Players cannot offer more chips than they currently hold. For example, if you only have 5 🔴 red chips, you cannot offer 6 🔴 red chips.`,
    `* Players cannot trade chips of the same color. You cannot trade 🔴 red chips for 🔴 red chips, for example.`,
    '![Example of offering a trade](https://i.imgur.com/Jzah8Ot.png)',
    `\n\n## Trade completion`,
    `When an offer is presented, all other active participants get a chance to accept or decline. Note: Active participants are those not currently making the offer.`,
    '![Example of receiving an offer](https://i.imgur.com/NJL4AvQ.png)',
    `Participants make their decisions simultaneously and privately. Some possible outcomes:`,
    `* If no one accepts, the trade does not happen, and the turn ends.`,
    `* If one participant accepts, that participant trades their chips as stated in the offer with the offering participant.`,
    `* If multiple participants accept, one accepting participant is *chosen at random* to complete the trade with the offering participant. This means that participants cannot choose who they trade with.`,
  ],
});

const CHIP_INFO_STAGE_GAMEPLAY5 = createInfoStage({
  id: 'info_gameplay5',
  game: StageGame.CHP,
  name: 'Gameplay (5/5)',
  infoLines: [
    `## How the game works`,
    `The game consists of **3 rounds** of trading. During each round, each player will have a turn to propose **1 trade**. These turns are pre-determined in a random order.`,
    `\n\n## Trade proposals`,
    `To propose a trade, a player must:`,
    `1. Request a certain quantity of chips of a single color from any other player to **get**`,
    `2. Specify a certain quantity of chips of a different color to **give** in return`,
    `## How the game works`,
    `The game consists of **3 rounds** of trading. During each round, each player will have a turn to propose **1 trade**. These turns are pre-determined in a random order.`,
    `\n\n## Trade rules`,
    `* Players can trade quantities of chips. For example, a player can trade 5 🔴 red chips for 6 🟢 green chips.`,
    `* Players cannot offer more chips than they currently hold. For example, if you only have 5 🔴 red chips, you cannot offer 6 🔴 red chips.`,
    `* Players cannot trade chips of the same color. You cannot trade 🔴 red chips for 🔴 red chips, for example.`,
    '![Example of offering a trade](https://i.imgur.com/Jzah8Ot.png)',
    `\n\n## Trade completion`,
    `When an offer is presented, all other active participants get a chance to accept or decline. Note: Active participants are those not currently making the offer.`,
    '![Example of receiving an offer](https://i.imgur.com/NJL4AvQ.png)',
    `Participants make their decisions simultaneously and privately. Some possible outcomes:`,
    `* If no one accepts, the trade does not happen, and the turn ends.`,
    `* If one participant accepts, that participant trades their chips as stated in the offer with the offering participant.`,
    `* If multiple participants accept, one accepting participant is *chosen at random* to complete the trade with the offering participant. This means that participants cannot choose who they trade with.`,
    `\n\n## Key points to remember`,
    `* In each round, each player gets to propose one trade and respond to other player's trades`,
    `* You can only propose trades between different colored chips, and cannot offer to give a chip amount that you do not have`,
    `* When multiple players accept a trade, the trading partner is randomly selected`,
  ],
});

// ****************************************************************************
// Comprehension stage 2
// ****************************************************************************/
export const CHIP_COMPREHENSION_CHECK2 = createComprehensionStage({
  game: StageGame.CHP,
  name: 'Comprehension check 2',
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
      'b' // correct answer ID
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
      'c' // correct answer ID
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
      'b' // correct answer ID
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
      'a' // correct answer ID
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
      'a' // correct answer ID
    ),
  ],
});

// ****************************************************************************
// Payment information
// ****************************************************************************/

const CHIP_INFO_STAGE_PAYOUT = createInfoStage({
  id: 'info_payment',
  game: StageGame.CHP,
  name: 'Payment information',
  infoLines: [
    'At the end of the study, we will calculate your earnings based on the final chip holdings from **one** of the two negotiation games you participate in. Here’s how it works:',
    '* Out of the two negotiation games you played, we will **randomly select one** for payment.',
    '* We will pay you a bonus of how much you made over the initial endowment.',
    '\n**Example:**',
    ' Suppose that the second game is chosen for your payout. You initially started with 10 chips in each color, worth (10 * 0.03 + 10 * 0.05 + 10 * 0.07) = **$1.50**.',
    'At the end of that game, you have:',
    '  * 🔴 8 red chips valued at $0.03 each',
    '  * 🟢 7 green chips valued at $0.05 each',
    '  * 🔵 21 blue chips valued at $0.07 each',
    'This adds up to **$2.06**. You would receive $2.06 - $1.50 = **$0.56** as a bonus. If you did not increase the value of your chips, you will not receive a bonus.',
    '\nThe exact values will depend on your random chip valuations and your final holdings, so your payment may differ from this example.',
    '\nThis payment is in addition to the $8 base payment for participating.',
  ],
});

const CHIP_INFO_TRANSFER_STAGE = createInfoStage({
  id: 'info_transfer',
  game: StageGame.CHP,
  name: 'Instructions for part 2',
  infoLines: [
    '# Congratulations!',
    'You’ve successfully completed your first game! Now, it’s time to play again with all the **same rules**. However, for this second round, please note the following changes:',
    '* **New players**: You may be playing with different players.',
    '* **New chip values:** You will receive a different valuation for your chips this time, with the **exception of the Green chip**, which remains the same for everyone.',
    'All players participating in this round are also playing for their second time. **Enjoy the game!**',
  ],
});
// ****************************************************************************
// Transfer stages
// ****************************************************************************/
export const CHIP_INITIAL_TRANSFER_STAGE = createTransferStage({
  game: StageGame.CHP,
  name: 'Initial transfer stage',
  descriptions: createStageTextConfig({
    primaryText:
      'Please wait on this page as we re-route you to your first game with other participants.',
  }),
  enableTimeout: true,
  timeoutSeconds: 600, // 10 minutes
});

export const TRANSFER_STAGE = createTransferStage({
  game: StageGame.CHP,
  name: 'Transfer stage',
  descriptions: createStageTextConfig({
    primaryText:
      'Please wait on this page for up to 10 minutes as you are transferred to the next stage of this experiment. Thank you for your patience.',
  }),
  enableTimeout: true,
  timeoutSeconds: 600, // 10 minutes
});

// ****************************************************************************
// Chip negotiation stage
// ****************************************************************************
const CHIPS = [
  {
    id: 'RED',
    name: 'red',
    avatar: '🔴',
    canBuy: true,
    canSell: true,
    startingQuantity: N_INITIAL_RED_CHIPS,
    lowerValue: 0.01,
    upperValue: 0.1,
  },
  {
    id: 'BLUE',
    name: 'blue',
    avatar: '🔵',
    canBuy: true,
    canSell: true,
    startingQuantity: N_INITIAL_BLUE_CHIPS,
    lowerValue: 0.01,
    upperValue: 0.1,
  },
  {
    id: 'GREEN',
    name: 'green',
    avatar: '🟢',
    canBuy: true,
    canSell: true,
    startingQuantity: N_INITIAL_GREEN_CHIPS,
    lowerValue: 0.05,
    upperValue: 0.05,
  },
];

const CHIP_NEGOTIATION_STAGE = createChipStage({
  id: 'negotiation1',
  game: StageGame.CHP,
  name: 'First negotiation game',
  descriptions: createStageTextConfig({
    infoText: `As a reminder, there are three rounds in this game. You will have an opportunity to send an offer to the other participants, and response to their offers, in each round. The objective is to maximize your payout at the end of the game by trading chips to your advantage.\n\nFeel free to refer to the instructions in previous stages for more detail.`,
  }),
  chips: CHIPS,
});

const CHIP_NEGOTIATION_STAGE2 = createChipStage({
  id: 'negotiation2',
  game: StageGame.CHP,
  name: 'Second negotiation game',
  descriptions: createStageTextConfig({
    infoText: `As a reminder, there are three rounds in this game. You will have an opportunity to send an offer to the other participants, and response to their offers, in each round. The objective is to maximize your payout at the end of the game by trading chips to your advantage.\n\nFeel free to refer to the instructions in previous stages for more detail.`,
  }),
  chips: CHIPS,
});

// ****************************************************************************
// Payout stage
// ****************************************************************************
const CHIP_PAYOUT_STAGE = createPayoutStage({
  id: 'payout1',
  game: StageGame.CHP,
  payoutItems: [],
});

const CHIP_PAYOUT_STAGE2 = createPayoutStage({
  id: 'payout2',
  game: StageGame.CHP,
  payoutItems: [],
});

// ****************************************************************************
// Post-negotiation survey stage
// ****************************************************************************
const CHIP_SURVEY_STAGE = createSurveyStage({
  id: 'survey',
  name: 'Final survey',
  game: StageGame.CHP,
  questions: [
    createScaleSurveyQuestion({
      questionTitle:
        'How certain are you that you made the best possible trades during the experiment?',
      upperText: 'Very confident',
      lowerText: 'Not at all confident',
    }),
    createTextSurveyQuestion({
      questionTitle:
        'Please describe your strategy in the game in a few sentences.',
    }),
    createTextSurveyQuestion({
      questionTitle:
        'Please describe any experiences or background that may have influenced your performance in the game.',
    }),
    createScaleSurveyQuestion({
      questionTitle: 'On a scale from 1 to 10, how aggressive are you?',
      upperText: 'Very aggressive',
      lowerText: 'Not at all aggressive',
    }),
    createScaleSurveyQuestion({
      questionTitle: 'On a scale from 1 to 10, how cooperative are you?',
      upperText: 'Very cooperative',
      lowerText: 'Not at all cooperative',
    }),
    createScaleSurveyQuestion({
      questionTitle:
        'On a scale from 1 to 10, how satisfied are you with your final trading outcomes?',
      upperText: 'Very satisfied',
      lowerText: 'Not at all satisfied',
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
