import {
  ProfileType,
  StageConfig,
  StageGame,
  createCheckSurveyQuestion,
  createChipPayoutItem,
  createChipStage,
  createInfoStage,
  createMetadataConfig,
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
export const N_INITIAL_GREEN_CHIPS = 100;
export const N_INITIAL_BLUE_CHIPS = 100;
export const N_INITIAL_RED_CHIPS = 100;

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

  stages.push(CHIP_INITIAL_TRANSFER_STAGE);

  // Info stage for chip negotiation
  stages.push(CHIP_INFO_STAGE_INSTRUCTIONS);
  stages.push(CHIP_INFO_STAGE_INSTRUCTIONS2);
  stages.push(CHIP_INFO_STAGE_PAYOUT);

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
    'Thank you for your interest in this research. If you choose to participate, you will be asked to play a negotiation game with other Prolific Workers. In total, this will take about YY minutes.',
    '\n**Compensation**',
    'You will be paid $ZZ for playing the games and completing the survey. You will have a chance to win up to $AA in additional compensation based on your performance in the games.',
    '\n**IRB**',
    'The results of this study will be used solely for research purposes. Our team will keep all your information from this study strictly confidential, as required by law. The IRB at the Massachusetts Institute of Technology is responsible for protecting the rights and welfare of research volunteers like you.',
    '\n**Voluntary participation**',
    'Your participation is voluntary, which means you can choose whether or not to participate. You may choose not to participate by exiting the survey at any point. There are no known costs to you for participating in this research study except for your time.',
    '\n**Contact**',
    'Please feel free to contact us if you have any questions, concerns, or complaints about this study. You may contact a member of the research team at BB@XYZ.com.',
    '\nBy checking the box below and proceeding, you are acknowledging that you are over the age of 18 and that you consent to participate. Clicking the arrow will bring you to the beginning of the task.',
  ],
});

// ****************************************************************************
// Anonymized profiles stage
// ****************************************************************************
const CHIP_PROFILE_STAGE = createProfileStage({
  id: 'profile',
  name: 'View randomly generated profile',
  game: StageGame.CHP,
  profileType: ProfileType.ANONYMOUS_ANIMAL,
});

// ****************************************************************************
// Info stage for chip negotiation
// ****************************************************************************
const CHIP_INFO_STAGE_INSTRUCTIONS = createInfoStage({
  id: 'info_instructions',
  game: StageGame.CHP,
  name: 'Overview and gameplay (1/2)',
  infoLines: [
    'Today, you will be playing two rounds of a trading game with other participants. In each game, you and the other participants will start with:',
    `* 🔴 ${N_INITIAL_RED_CHIPS} **red** chips`,
    `* 🟢 ${N_INITIAL_GREEN_CHIPS} **green** chips`,
    `* 🔵 ${N_INITIAL_BLUE_CHIPS} **blue** chips`,
    '**Valuations:**',
    'Each 🟢 green chip is worth $0.05 to each participant. However, you will all have different valuations for the red and blue chips, randomly chosen between $0.01 and $0.10. For example, Cat might value 🔴 red chips at $0.03 each and 🔵 blue chips at $0.07 each, while Mouse might value 🔴 red chips at $0.08 each and 🔵 blue chips at $0.03 each.',
    "You know your own chip valuation and that everyone values 🟢 green chips the same, at $0.05 per chip. However, you do not know the other players' valuations for red and blue chips.",
    '![Example of chip count table](https://i.imgur.com/fMPRf2X.png)',
    'The table above is shown to you during the game, and provides the number of chips everyone has as well as a reminder of your own valuation.',
    '\n**What this means:**',
    'Because each participant values the chips differently, there may be good reasons to trade. For instance, if you don’t care much about 🔴 red chips but someone else does, you might offer your red chips to them in exchange for 🔵 blue chips, which you like more. In this way, both you and the other participant can end up with chips that you find more valuable. This is what creates the opportunity to gain from trading.',
  ],
});

const CHIP_INFO_STAGE_INSTRUCTIONS2 = createInfoStage({
  id: 'info_instructions2',
  game: StageGame.CHP,
  name: 'Overview and gameplay (2/2)',
  infoLines: [
    '**Number of rounds:**',
    'The game consists of **3 rounds** of trading. During each round, you will have an opportunity to propose a trade to the other participants, and to evaluate trades offerred by the other participants. Within each round, every participant will get exactly one turn to make an offer in a fixed, randomly assigned order.',
    '\n**Offers:**',
    '* On your turn, you may propose **one offer** to all other active participants.',
    '* An offer consists of 1) specifying a certain quantity of chips of a single color that the offering participant will give up, and requesting a certain quantity of chips of a different single color in return.',
    'For example, a participant might offer to give 🔵 100 blue chips for 🔴 10 red chips. This is shown below.',
    '![Example of sending an offer](https://i.imgur.com/WSw1Qu9.png)',
    '\n**Constraints on offers:**',
    '* You cannot offer more chips than you currently hold. For instance, if you only have 50 red chips, you cannot offer 60 red chips.',
    '* The color you request in return can be different from the one you’re offering, as is the point of the trade.',
    '\n**Accepting an offer**',
    'Once an offer is presented, **every other active participant** (i.e., those not currently making the offer) gets a chance to **accept or decline**. Participants make their decisions simultaneously and privately.',
    '* If **no one accepts**, the trade does not happen, and the turn ends.',
    '* If **one participant accepts**, that participant trades their chips as stated in the offer with the offering participant.',
    '* If **multiple participants accept**, **one of these accepting participants is chosen at random** to complete the trade with the offering participant. **This means that participants cannot choose who they trade with**.',
    '![Example of receiving an offer](https://i.imgur.com/X0vW8GP.png)',
    '\n**After an offer:**',
    'If a trade occurs, the involved participants adjust their chip holdings accordingly. If no trade occurs (because no one accepted), nothing changes. After the offer is concluded (regardless of outcome), the turn passes to the next participant.',
    '\n**End of round and game conclusion:**',
    'After all 3 participants have made an offer, the round ends. The game proceeds for a total of 3 rounds (each participant making an offer each round). Once all 3 rounds are completed, the game ends.',
  ],
});

const CHIP_INFO_STAGE_PAYOUT = createInfoStage({
  id: 'info_payment',
  game: StageGame.CHP,
  name: 'Payment information',
  infoLines: [
    'At the end of the study, we will calculate your earnings based on the final chip holdings from **one** of the two negotiation games you participate in. Here’s how it works:',
    '* Out of the two negotiation games you played, we will **randomly select one** for payment.',
    '* We will use the **valuations and final chip counts** from the chosen game. For each color of chip you hold at the end of that game, we will multiply the number of chips by your assigned valuation for that color. We will then add up these amounts across Red, Green, and Blue chips.',
    '\n**Example:**',
    ' Suppose that the second game is chosen for your payout. At the end of that game, you have:',
    '  * 🔴 80 red chips valued at $0.03 each',
    '  * 🟢 120 green chips valued at $0.05 each',
    '  * 🔵 90 blue chips valued at $0.07 each',
    '  Your bonus payment would **$14.70**: (80 x $0.03) + (120 x $0.05) + (90 x $0.07) = $2.40 + $6.00 + $6.30 = $14.70.',
    '\nThe exact values will depend on your random chip valuations and your final holdings, so your payment may differ from this example.',
    '\nThis payment is in addition to the $XX base payment for participating.',
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
      'Welcome to the experiment! Please wait as we add you to an experiment room with other participants.',
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
  chips: CHIPS
});

const CHIP_NEGOTIATION_STAGE2 = createChipStage({
  id: 'negotiation2',
  game: StageGame.CHP,
  name: 'Second negotiation game',
  descriptions: createStageTextConfig({
    infoText: `As a reminder, there are three rounds in this game. You will have an opportunity to send an offer to the other participants, and response to their offers, in each round. The objective is to maximize your payout at the end of the game by trading chips to your advantage.\n\nFeel free to refer to the instructions in previous stages for more detail.`,
  }),
  chips: CHIPS
});

// ****************************************************************************
// Payout stage
// ****************************************************************************
const CHIP_PAYOUT_STAGE = createPayoutStage({
  id: 'payout1',
  game: StageGame.CHP,
  payoutItems: [
    createChipPayoutItem({
      name: 'Negotiation completion',
      description: 'You earn $5 for completing the chip negotiation',
      stageId: 'negotiation1',
      baseCurrencyAmount: 5,
    }),
  ],
});

const CHIP_PAYOUT_STAGE2 = createPayoutStage({
  id: 'payout2',
  game: StageGame.CHP,
  payoutItems: [
    createChipPayoutItem({
      name: 'Negotiation completion',
      description: 'You earn $5 for completing the chip negotiation',
      stageId: 'negotiation2',
      baseCurrencyAmount: 5,
    }),
  ],
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
  ],
});
