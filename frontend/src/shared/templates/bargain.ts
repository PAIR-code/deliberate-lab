import {
  ProfileType,
  StageConfig,
  createBargainStage,
  createComprehensionStage,
  createInfoStage,
  createMetadataConfig,
  createMultipleChoiceComprehensionQuestion,
  createMultipleChoiceItem,
  createPayoutStage,
  createProfileStage,
  createStageProgressConfig,
  createStageTextConfig,
  createSurveyStage,
  createTextSurveyQuestion,
  createScaleSurveyQuestion,
  createTOSStage,
  createTransferStage,
} from '@deliberation-lab/utils';

// ****************************************************************************
// Experiment config
// ****************************************************************************
export function getBargainMetadata() {
  return createMetadataConfig({
    name: '☕ Bilateral Bargaining Game',
    publicName: 'Bargaining Game',
    description:
      'A bilateral bargaining game where a buyer and seller negotiate the price of a mug.',
  });
}

export function getBargainStageConfigs(): StageConfig[] {
  // Note: Most game parameters (maxTurns, chat, opponent info visibility)
  // are randomly assigned per game instance in the backend. These config values
  // are defaults that will be overridden by randomization during initialization.

  const stages: StageConfig[] = [];

  // Informed consent
  stages.push(BARGAIN_TOS_STAGE);

  // Show anonymized profile
  stages.push(BARGAIN_PROFILE_STAGE);

  // Overview stages (introduce bargaining game)
  stages.push(BARGAIN_INFO_STAGE_OVERVIEW);
  stages.push(createBargainInfoStageRoles());
  stages.push(createBargainInfoStageValuations());

  // Comprehension check
  stages.push(BARGAIN_COMPREHENSION_CHECK);

  // Gameplay instructions (note: chat may or may not be enabled, randomized per game)
  stages.push(createBargainInfoStageGameplay(true)); // Generic instructions
  stages.push(BARGAIN_INFO_STAGE_PAYOUT);

  // Pre-game survey
  stages.push(BARGAIN_PRE_SURVEY_STAGE);

  // Transfer (2 players required)
  stages.push(BARGAIN_TRANSFER_STAGE);

  // Main bargain stage (values will be randomized during initialization)
  stages.push(createBargainGameStage());

  // Payout
  stages.push(BARGAIN_PAYOUT_STAGE);

  // Post-game survey
  stages.push(BARGAIN_POST_SURVEY_STAGE);

  return stages;
}

// ****************************************************************************
// Informed consent stage
// ****************************************************************************
const BARGAIN_TOS_STAGE = createTOSStage({
  id: 'tos',
  name: 'Terms of service',
  tosLines: [
    'Thank you for your interest in this research. If you choose to participate, you will be asked to play a bargaining game with another participant. This will take approximately 30 minutes.',
    '\n**Compensation**',
    'You will be paid a base amount for playing the game and completing the survey. You may receive an additional bonus based on your performance in the game, up to $6 USD.',
    '\n**IRB**',
    'The results of this study will be used solely for research purposes. Our team will keep all your information from this study strictly confidential, as required by law.',
    '\n**Voluntary participation**',
    'Your participation is voluntary, which means you can choose whether or not to participate. You may choose not to participate by exiting at any point.',
    '\n**Contact**',
    'Please feel free to contact us through Prolific or your game administrator if you have any questions, concerns, or complaints about this study.',
    '\nBy checking the box below and proceeding, you are acknowledging that you are over the age of 18 and that you consent to participate.',
  ],
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

// ****************************************************************************
// Profile stage
// ****************************************************************************
const BARGAIN_PROFILE_STAGE = createProfileStage({
  id: 'profile',
  name: 'View randomly generated profile',
  descriptions: createStageTextConfig({
    primaryText:
      'This identity is how the other participant will see you during the experiment.',
  }),
  profileType: ProfileType.ANONYMOUS_ANIMAL,
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

// ****************************************************************************
// Info stages
// ****************************************************************************
const BARGAIN_INFO_STAGE_OVERVIEW = createInfoStage({
  id: 'info_overview',
  name: 'Instructions: Overview',
  infoLines: [
    '# Welcome to the Bargaining Game!',
    'In this experiment, you will participate in a negotiation with one other participant.',
    '\n## What you will do:',
    '* You will be randomly assigned to be either a **buyer** or a **seller**.',
    '* The item being negotiated is a **mug**.',
    '* You and the other participant will take turns making price offers.',
    '* You can either **accept** an offer (ending the negotiation) or **reject** it and make a counter-offer.',
    '\n## Your goal:',
    'Maximize your earnings by reaching a deal that benefits you, or avoid a bad deal by walking away when the maximum number of turns is reached.',
  ],
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

function createBargainInfoStageRoles() {
  return createInfoStage({
    id: 'info_roles',
    name: 'Instructions: Roles',
    infoLines: [
      '## Roles in the game',
      'You will be randomly assigned one of two roles:',
      '\n**Buyer:** You want to buy the mug at the lowest possible price.',
      '**Seller:** You want to sell the mug at the highest possible price.',
      '\nOne of you will be randomly chosen to make the first offer. After that, you will take turns making offers until either:',
      '* Someone accepts an offer (deal reached), or',
      '* The maximum number of turns is reached (no deal).',
    ],
    progress: createStageProgressConfig({
      showParticipantProgress: false,
    }),
  });
}

function createBargainInfoStageValuations() {
  return createInfoStage({
    id: 'info_valuations',
    name: 'Instructions: Valuations',
    infoLines: [
      '## How valuations work',
      'Each participant has a **private valuation** for the mug, randomly assigned at the start of the game.',
      '\n**Valuations are integers between $6 and $12.**',
      '\n**For the buyer:**',
      '* Your valuation represents the maximum you are willing to pay.',
      '* If you buy the mug for less than your valuation, you earn the difference as profit.',
      '* Example: If your valuation is $10 and you buy for $7, you earn $3.',
      '\n**For the seller:**',
      '* Your valuation represents the minimum you are willing to accept.',
      '* If you sell the mug for more than your valuation, you earn the difference as profit.',
      '* Example: If your valuation is $8 and you sell for $10, you earn $2.',
      '\n**Important:** The buyer valuation is always greater than or equal to the seller valuation, which means mutually beneficial deals are always possible.',
      '\n**Information:** Depending on the experiment settings, you may or may not know information about the other participant valuation.',
    ],
    progress: createStageProgressConfig({
      showParticipantProgress: false,
    }),
  });
}

function createBargainInfoStageGameplay(enableChat: boolean) {
  const infoLines = [
    '## How the game works',
    'During the game, you will see three panels on the left side of your screen:',
    '\n**Panel 1: Info about You**',
    '* Shows your role (buyer or seller)',
    '* Shows your private valuation',
    '* Reminds you how your profit is calculated',
    '\n**Panel 2: Info about the Other Participant**',
    '* Shows what information you have about the other participant (if any)',
    '\n**Panel 3: Your turn or Review offer**',
    '* When it is your turn to make an offer: Enter a price (in whole dollars)',
    '* When reviewing an offer: Choose to accept or reject',
  ];

  if (enableChat) {
    infoLines.push(
      '\n**Chat functionality:** During each turn, you can send ONE message to the other participant. Use this to explain your reasoning, negotiate, or persuade.',
    );
  }

  infoLines.push(
    '\n**Main Dialogue Panel (right side):**',
    '* Shows the complete history of the negotiation',
    '* Displays all offers, responses, and messages',
  );

  return createInfoStage({
    id: 'info_gameplay',
    name: 'Instructions: Gameplay',
    infoLines,
    progress: createStageProgressConfig({
      showParticipantProgress: false,
    }),
  });
}

const BARGAIN_INFO_STAGE_PAYOUT = createInfoStage({
  id: 'info_payout',
  name: 'Instructions: Payouts',
  infoLines: [
    '## How payouts are calculated',
    'Your bonus payout depends on whether you reach a deal:',
    '\n**If a deal is reached at price P:**',
    '* **Buyer payout:** (Your valuation - P)',
    '* **Seller payout:** (P - Your valuation)',
    '\n**If no deal is reached:**',
    '* Both participants receive $0',
    '\n## Example 1: Deal reached',
    'Suppose the buyer valuation is $10 and the seller valuation is $7.',
    'They agree on a price of $9.',
    '* Buyer earns: $10 - $9 = **$1**',
    '* Seller earns: $9 - $7 = **$2**',
    '\n## Example 2: No deal',
    'If they cannot agree before the maximum number of turns:',
    '* Buyer earns: **$0**',
    '* Seller earns: **$0**',
    '\n**Strategy tip:** It is usually better to reach some deal than no deal at all!',
  ],
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

// ****************************************************************************
// Comprehension check
// ****************************************************************************
const BARGAIN_COMPREHENSION_CHECK = createComprehensionStage({
  id: 'comprehension_check',
  name: 'Comprehension check',
  descriptions: createStageTextConfig({
    primaryText:
      'Please answer the following questions to verify your understanding. You may click on previous stages to refresh your memory. You may proceed once you have answered correctly.',
  }),
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
  questions: [
    createMultipleChoiceComprehensionQuestion(
      {
        questionTitle: 'What item are you negotiating over?',
        options: [
          createMultipleChoiceItem({id: 'a', text: 'A book'}),
          createMultipleChoiceItem({id: 'b', text: 'A mug'}),
          createMultipleChoiceItem({id: 'c', text: 'A phone'}),
          createMultipleChoiceItem({id: 'd', text: 'A chair'}),
        ],
      },
      'b', // correct answer
    ),
    createMultipleChoiceComprehensionQuestion(
      {
        questionTitle:
          'True or false: The buyer wants to buy at the lowest price, and the seller wants to sell at the highest price.',
        options: [
          createMultipleChoiceItem({id: 'a', text: 'True'}),
          createMultipleChoiceItem({id: 'b', text: 'False'}),
        ],
      },
      'a', // correct answer
    ),
    createMultipleChoiceComprehensionQuestion(
      {
        questionTitle:
          'If the buyer valuation is $11 and they buy the mug for $9, how much do they earn?',
        options: [
          createMultipleChoiceItem({id: 'a', text: '$0'}),
          createMultipleChoiceItem({id: 'b', text: '$2'}),
          createMultipleChoiceItem({id: 'c', text: '$9'}),
          createMultipleChoiceItem({id: 'd', text: '$11'}),
        ],
      },
      'b', // correct answer: $11 - $9 = $2
    ),
    createMultipleChoiceComprehensionQuestion(
      {
        questionTitle:
          'If no deal is reached by the maximum number of turns, what happens?',
        options: [
          createMultipleChoiceItem({
            id: 'a',
            text: 'Both participants earn $0',
          }),
          createMultipleChoiceItem({
            id: 'b',
            text: 'The last offer is automatically accepted',
          }),
          createMultipleChoiceItem({
            id: 'c',
            text: 'They get one more chance to negotiate',
          }),
          createMultipleChoiceItem({
            id: 'd',
            text: 'The experimenter decides the price',
          }),
        ],
      },
      'a', // correct answer
    ),
  ],
});

// ****************************************************************************
// Transfer stage
// ****************************************************************************
const BARGAIN_TRANSFER_STAGE = createTransferStage({
  id: 'transfer',
  name: 'Transfer stage',
  descriptions: createStageTextConfig({
    primaryText:
      'Please wait on this page for up to 10 minutes as you are matched with another participant. Thank you for your patience.',
  }),
  enableTimeout: true,
  timeoutSeconds: 600, // 10 minutes
  progress: createStageProgressConfig({
    showParticipantProgress: false,
  }),
});

// ****************************************************************************
// Main bargain stage
// ****************************************************************************
const BARGAIN_GAME_STAGE_ID = 'bargain_game';

function createBargainGameStage() {
  // Note: maxTurns, enableChat, and opponent info are randomized during game initialization.
  // These config values are defaults that will be overridden by backend randomization.
  return createBargainStage({
    id: BARGAIN_GAME_STAGE_ID,
    name: 'Bargaining Game',
    descriptions: createStageTextConfig({
      primaryText:
        'Negotiate with the other participant to reach the best deal you can!',
      infoText: 'Take turns making offers until someone accepts or the turn limit is reached.',
      helpText:
        'Remember: Your goal is to maximize your profit. A deal is usually better than no deal!',
    }),
    progress: createStageProgressConfig({
      minParticipants: 2,
      waitForAllParticipants: true,
      showParticipantProgress: true,
    }),
    itemName: 'mug',
    buyerValuationMin: 6,
    buyerValuationMax: 12,
    sellerValuationMin: 6,
    sellerValuationMax: 12,
    maxTurns: 8, // Default value, will be randomized from [6, 8, 10, 12]
    enableChat: false, // Default value, will be randomized
    buyerInfoAboutSeller: 'You have no idea.', // Default value, will be randomized
    sellerInfoAboutBuyer: 'You have no idea.', // Default value, will be randomized
  });
}

// ****************************************************************************
// Payout stage
// ****************************************************************************
const BARGAIN_PAYOUT_STAGE = createPayoutStage({
  id: 'payout',
  name: 'Your payout',
  payoutItems: [],
  // Payout calculation will be handled by the backend based on the bargain stage results
});

// ****************************************************************************
// Pre-game survey
// ****************************************************************************
const BARGAIN_PRE_SURVEY_STAGE = createSurveyStage({
  id: 'pre_survey',
  name: 'Pre-game survey',
  descriptions: createStageTextConfig({
    primaryText:
      'Before you play the game, please complete this short survey to help us understand your background and expectations.',
  }),
  questions: [
    createScaleSurveyQuestion({
      questionTitle:
        'Based on the instructions you just read, how confident do you feel in your ability to play this game well?',
      lowerText: 'Not at all confident',
      lowerValue: 1,
      upperText: 'Very confident',
      upperValue: 5,
    }),
    createScaleSurveyQuestion({
      questionTitle:
        'How much prior experience do you have with negotiation or bargaining (in real life or games)?',
      lowerText: 'No experience',
      lowerValue: 1,
      upperText: 'Extensive experience',
      upperValue: 5,
    }),
    createTextSurveyQuestion({
      questionTitle:
        'Please describe any background, skills, or experiences that might help you in this bargaining game.',
    }),
  ],
});

// ****************************************************************************
// Post-game survey
// ****************************************************************************
const BARGAIN_POST_SURVEY_STAGE = createSurveyStage({
  id: 'post_survey',
  name: 'Post-game survey',
  descriptions: createStageTextConfig({
    primaryText:
      'Thank you for completing the game! Please answer these questions about your experience.',
  }),
  questions: [
    createTextSurveyQuestion({
      questionTitle:
        'Please describe your strategy in the game in a few sentences.',
    }),
    createScaleSurveyQuestion({
      questionTitle: 'How satisfied are you with the outcome of the game?',
      lowerText: 'Not at all satisfied',
      lowerValue: 1,
      upperText: 'Very satisfied',
      upperValue: 5,
    }),
    createScaleSurveyQuestion({
      questionTitle:
        'How fair do you think the final outcome was (or would have been if a deal was reached)?',
      lowerText: 'Very unfair to me',
      lowerValue: 1,
      upperText: 'Very fair',
      upperValue: 5,
    }),
    createScaleSurveyQuestion({
      questionTitle:
        'How would you rate your negotiation style in this game?',
      lowerText: 'Very competitive (focused on my own gains)',
      lowerValue: 1,
      upperText: 'Very collaborative (focused on mutual benefit)',
      upperValue: 5,
    }),
    createScaleSurveyQuestion({
      questionTitle: 'How mentally demanding was this task?',
      lowerText: 'Not at all demanding',
      lowerValue: 1,
      upperText: 'Very demanding',
      upperValue: 5,
    }),
    createTextSurveyQuestion({
      questionTitle:
        'Please provide any additional feedback about your experience. Were there any parts of the instructions or gameplay that were confusing?',
    }),
  ],
});

// ****************************************************************************
// Default template export
// ****************************************************************************
export function createBargainTemplate() {
  // Note: Game parameters like maxTurns, chat, and opponent info are randomized
  // during game initialization in the backend, not configured in the template.
  return {
    metadata: getBargainMetadata(),
    stageConfigs: getBargainStageConfigs(),
  };
}
