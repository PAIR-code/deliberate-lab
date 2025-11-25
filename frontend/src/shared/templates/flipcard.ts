import {
  createExperimentConfig,
  createExperimentTemplate,
  createFlipCardStage,
  createFlipCard,
  createInfoStage,
  createMetadataConfig,
  createProfileStage,
  createStageTextConfig,
  createTOSStage,
  ExperimentTemplate,
  ProfileType,
  StageConfig,
} from '@deliberation-lab/utils';

export function getFlipCardExperimentTemplate(): ExperimentTemplate {
  const stageConfigs = getFlipCardTemplateStageConfigs();
  return createExperimentTemplate({
    experiment: createExperimentConfig(stageConfigs, {
      metadata: FLIPCARD_TEMPLATE_METADATA,
    }),
    stageConfigs,
  });
}

export const FLIPCARD_TEMPLATE_METADATA = createMetadataConfig({
  name: '🔄 FlipCard Demo',
  publicName: 'Card Selection Game',
  description: 'An example experiment using the FlipCard stage functionality',
});

function getFlipCardTemplateStageConfigs(): StageConfig[] {
  const stages: StageConfig[] = [];

  stages.push(FLIPCARD_TOS_STAGE);
  stages.push(FLIPCARD_PROFILE_STAGE);
  stages.push(FLIPCARD_INTRO_STAGE);
  stages.push(FLIPCARD_MAIN_STAGE);

  return stages;
}

const FLIPCARD_CONSENT =
  'You must agree to participate in this FlipCard demonstration.';

const FLIPCARD_TOS_STAGE = createTOSStage({
  id: 'flipcard_tos',
  name: 'Consent',
  tosLines: [FLIPCARD_CONSENT],
});

const FLIPCARD_PROFILE_STAGE = createProfileStage({
  id: 'flipcard_profile',
  name: 'Your identity',
  descriptions: createStageTextConfig({
    primaryText:
      "This is how you'll be identified during the card selection game. Click 'Next stage' below to continue.",
  }),
  profileType: ProfileType.ANONYMOUS_ANIMAL,
});

const FLIPCARD_INTRO_TEXT = `
Welcome to the FlipCard demonstration!

In the next stage, you'll see a collection of cards representing different options. Each card has:
- A title and brief description on the front
- Additional detailed information on the back (click "Learn More" to flip)
- A "Select" button to choose that option

Take your time to explore the cards by flipping them over to read more details. Once you've found the option that interests you most, select it and confirm your choice to continue.
`;

const FLIPCARD_INTRO_STAGE = createInfoStage({
  id: 'flipcard_intro',
  name: 'FlipCard Instructions',
  infoLines: [FLIPCARD_INTRO_TEXT],
});

const FLIPCARD_MAIN_STAGE = createFlipCardStage({
  id: 'flipcard_main',
  name: 'Choose Your Adventure',
  descriptions: createStageTextConfig({
    primaryText:
      'Browse the adventure options below and select the one that interests you most.',
    infoText:
      'Click "Learn More" to flip a card and see additional details. Click "Select" to choose an option, then "Confirm Selection" to proceed.',
    helpText:
      'Use the "Learn More" button to view the back of cards with detailed information. Select the adventure that appeals to you and confirm your choice.',
  }),
  cards: [
    createFlipCard({
      title: 'Mountain Expedition',
      frontContent:
        'Join a thrilling mountain climbing adventure with experienced guides.',
      backContent:
        'This 5-day expedition includes professional climbing instruction, all necessary equipment, camping under the stars, and breathtaking summit views. Perfect for those seeking physical challenge and natural beauty. Difficulty level: Intermediate to Advanced.',
    }),
    createFlipCard({
      title: 'Ocean Discovery',
      frontContent:
        'Explore the mysteries of the deep sea through scuba diving and marine research.',
      backContent:
        "Spend 7 days learning about marine ecosystems while diving in pristine coral reefs. You'll assist marine biologists with research, learn underwater photography, and discover rare sea creatures. All diving certification and equipment provided. Difficulty level: Beginner to Intermediate.",
    }),
    createFlipCard({
      title: 'Cultural Immersion',
      frontContent:
        'Experience authentic local culture through traditional crafts, cuisine, and customs.',
      backContent:
        'Live with local families for 10 days while learning traditional cooking, handicrafts, and participating in cultural ceremonies. This experience focuses on meaningful connections, language learning, and understanding different ways of life. Perfect for culturally curious travelers. Difficulty level: Easy.',
    }),
    createFlipCard({
      title: 'Space Simulation',
      frontContent:
        'Participate in a realistic space mission simulation at a cutting-edge facility.',
      backContent:
        "Experience life as an astronaut during this 3-day intensive program. You'll train on simulators, learn about space exploration, work with real NASA equipment, and complete mission scenarios. Includes zero-gravity simulation and space suit fitting. Difficulty level: Intermediate.",
    }),
    createFlipCard({
      title: 'Wildlife Conservation',
      frontContent:
        'Contribute to wildlife protection efforts while observing animals in their natural habitat.',
      backContent:
        "Work alongside conservationists for 14 days protecting endangered species. Activities include animal tracking, habitat restoration, data collection, and wildlife photography. You'll learn about conservation science while making a real impact. Accommodation in research stations. Difficulty level: Easy to Intermediate.",
    }),
    createFlipCard({
      title: 'Ancient Archaeology',
      frontContent:
        'Uncover historical treasures by participating in an active archaeological dig.',
      backContent:
        "Join professional archaeologists for 8 days excavating an ancient site. Learn proper excavation techniques, artifact identification, and historical analysis. You'll participate in actual discoveries that contribute to our understanding of past civilizations. Includes lectures on archaeological methods. Difficulty level: Easy to Intermediate.",
    }),
  ],
  allowMultipleSelections: false,
  requireConfirmation: true,
});
