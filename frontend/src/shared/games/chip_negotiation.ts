import {
  ProfileType,
  StageConfig,
  StageGame,
  createCheckSurveyQuestion,
  createChipStage,
  createDefaultPayoutItem,
  createInfoStage,
  createMetadataConfig,
  createPayoutStage,
  createProfileStage,
  createSurveyStage,
  createTOSStage,
} from '@deliberation-lab/utils';

// ****************************************************************************
// Experiment config
// ****************************************************************************
export const CHIP_GAME_METADATA = createMetadataConfig({
  name: 'Chip Negotiation',
  publicName: 'Chip Negotiation',
  description: 'A trading scenario involving chips of different values',
});

export function getChipNegotiationStageConfigs(): StageConfig[] {
  const stages: StageConfig[] = [];

  // Informed consent
  stages.push(CHIP_TOS_STAGE);

  // Anonymized profiles
  stages.push(CHIP_PROFILE_STAGE);

  // Info stage for chip negotiation
  stages.push(CHIP_INFO_STAGE);

  // Chip negotiation stage
  stages.push(CHIP_NEGOTIATION_STAGE);

  // Payout stage
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
  tosLines: ['Thank you for participating in this study.']
});

// ****************************************************************************
// Anonymized profiles stage
// ****************************************************************************
const CHIP_PROFILE_STAGE = createProfileStage({
  id: 'profile',
  game: StageGame.CHP,
  profileType: ProfileType.ANONYMOUS_ANIMAL,
});

// ****************************************************************************
// Info stage for chip negotiation
// ****************************************************************************
const CHIP_INFO_STAGE = createInfoStage({
  id: 'info',
  game: StageGame.CHP,
  name: 'Chip negotiation instructions',
  infoLines: ['You are participating in a resource allocation game. You will be given a set of chips to start and can submit offers to trade these chips.']
});

// ****************************************************************************
// Chip negotiation stage
// ****************************************************************************
const CHIP_NEGOTIATION_STAGE = createChipStage({
  id: 'negotiation',
  game: StageGame.CHP,
  chips: [
    {
      id: '0',
      name: 'red',
      canBuy: true,
      canSell: true,
      quantity: 100,
      lowerValue: 0.01,
      upperValue: 0.10,
    },
    {
      id: '1',
      name: 'blue',
      canBuy: true,
      canSell: true,
      quantity: 100,
      lowerValue: 0.01,
      upperValue: 0.10,
    },
    {
      id: '2',
      name: 'green',
      canBuy: true,
      canSell: true,
      quantity: 100,
      lowerValue: 0.05,
      upperValue: 0.05,
    }
  ]
});

// ****************************************************************************
// Payout stage
// ****************************************************************************
const CHIP_PAYOUT_STAGE = createPayoutStage({
  id: 'payout',
  game: StageGame.CHP,
  payoutItems: [
    createDefaultPayoutItem({
      name: 'Negotiation completion',
      description: 'You earn $5 for completing the chip negotiation',
      stageId: 'negotiation',
      baseCurrencyAmount: 5,
    })
  ]
});

// ****************************************************************************
// Post-negotiation survey stage
// ****************************************************************************
const CHIP_SURVEY_STAGE = createSurveyStage({
  id: 'survey',
  game: StageGame.CHP,
  questions: [
    createCheckSurveyQuestion({
      questionTitle: 'Check this if you enjoyed the negotiation'
    })
  ]
});