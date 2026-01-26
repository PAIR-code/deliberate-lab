/**
 * Book Club Template
 *
 * A simple template that routes participants to book discussion groups
 * based on their favorite genre. Features an agent mediator with
 * conditional prompts that adapt to each genre.
 *
 * Flow:
 * 1. Profile setup
 * 2. Survey: "What's your favorite book genre?"
 * 3. Auto-transfer to the matching genre cohort
 * 4. Genre-specific book discussion with AI facilitator
 */

import {
  AgentMediatorTemplate,
  ApiKeyType,
  ComparisonOperator,
  CohortDefinition,
  ExperimentTemplate,
  MediatorPromptConfig,
  StageConfig,
  StageKind,
  SurveyStageConfig,
  TransferStageConfig,
  VariableScope,
  createAgentMediatorPersonaConfig,
  createAgentModelSettings,
  createChatPromptConfig,
  createChatStage,
  createDefaultStageContextPromptItem,
  createCohortDefinition,
  createCohortParticipantConfig,
  createComparisonCondition,
  createConditionAutoTransferConfig,
  createExperimentConfig,
  createExperimentTemplate,
  createGroupComposition,
  createInfoStage,
  createMetadataConfig,
  createMultipleChoiceSurveyQuestion,
  createParticipantProfileBase,
  createProfileStage,
  createStaticVariableConfig,
  createSurveyStage,
  createTextPromptItem,
  createTransferGroup,
  createTransferStage,
  ProfileType,
  VariableType,
} from '@deliberation-lab/utils';

// ****************************************************************************
// Template Configuration
// ****************************************************************************
export interface BookClubConfig {
  routeImmediately: boolean; // true = route immediately (1 participant), false = wait for group (2-4)
}

export function createBookClubConfig(
  config: Partial<BookClubConfig> = {},
): BookClubConfig {
  return {
    routeImmediately: config.routeImmediately ?? true,
  };
}

// ****************************************************************************
// Stage IDs
// ****************************************************************************
const SURVEY_STAGE_ID = 'genre-survey';
const TRANSFER_STAGE_ID = 'book-club-transfer';
const CHAT_STAGE_ID = 'book-discussion';

// ****************************************************************************
// Genre Configuration
// ****************************************************************************
interface GenreConfig {
  id: string;
  cohortAlias: string;
  cohortName: string;
  optionText: string;
  bookRecommendation: string;
  discussionPrompt: string;
  mediatorGuidance: string;
}

const BOOK_GENRES: GenreConfig[] = [
  {
    id: 'mystery',
    cohortAlias: 'mystery-cohort',
    cohortName: 'Mystery & Thriller Club',
    optionText: 'Mystery & Thriller',
    bookRecommendation: '"The Silent Patient" by Alex Michaelides',
    discussionPrompt:
      'What makes a great mystery? Discuss your favorite plot twists, detectives, and the art of suspense.',
    mediatorGuidance:
      'Guide discussion toward plot twists, red herrings, and favorite detective characters. Remind folks: no spoilers without warning!',
  },
  {
    id: 'scifi_fantasy',
    cohortAlias: 'scifi-fantasy-cohort',
    cohortName: 'Sci-Fi & Fantasy Club',
    optionText: 'Science Fiction & Fantasy',
    bookRecommendation: '"Project Hail Mary" by Andy Weir',
    discussionPrompt:
      'How do authors build believable worlds? Discuss world-building, magic systems, and your favorite speculative fiction.',
    mediatorGuidance:
      'Guide discussion toward world-building, magic systems, and how authors balance escapism with deeper themes.',
  },
  {
    id: 'literary',
    cohortAlias: 'literary-cohort',
    cohortName: 'Literary Fiction Club',
    optionText: 'Literary Fiction',
    bookRecommendation: '"A Little Life" by Hanya Yanagihara',
    discussionPrompt:
      'What draws you to literary fiction? Discuss character depth, prose style, and books that moved you.',
    mediatorGuidance:
      'Guide discussion toward character development, memorable prose passages, and the emotional impact of stories.',
  },
  {
    id: 'romance',
    cohortAlias: 'romance-cohort',
    cohortName: 'Romance Readers Club',
    optionText: 'Romance',
    bookRecommendation: '"Beach Read" by Emily Henry',
    discussionPrompt:
      'What makes a great love story? Discuss your favorite tropes, couples, and what keeps you turning pages.',
    mediatorGuidance:
      'Guide discussion toward favorite tropes (enemies-to-lovers, second chance, etc.), memorable couples, and what makes romance satisfying.',
  },
];

// ****************************************************************************
// Cohort Definitions
// ****************************************************************************
const LOBBY_COHORT_ALIAS = 'lobby';

function getCohortDefinitions(): CohortDefinition[] {
  const lobbyCohort = createCohortDefinition({
    alias: LOBBY_COHORT_ALIAS,
    name: 'Lobby',
    description: 'Starting cohort for all participants before genre matching',
  });

  const genreCohorts = BOOK_GENRES.map((genre) =>
    createCohortDefinition({
      alias: genre.cohortAlias,
      name: genre.cohortName,
      description: `Book club for ${genre.optionText} fans`,
    }),
  );

  return [lobbyCohort, ...genreCohorts];
}

// ****************************************************************************
// Variable Configs
// ****************************************************************************
function getVariableConfigs() {
  const bookValues: Record<string, string> = {};
  const promptValues: Record<string, string> = {};

  BOOK_GENRES.forEach((genre) => {
    bookValues[genre.cohortAlias] = JSON.stringify(genre.bookRecommendation);
    promptValues[genre.cohortAlias] = JSON.stringify(genre.discussionPrompt);
  });

  return [
    createStaticVariableConfig({
      scope: VariableScope.COHORT,
      definition: {
        name: 'book_recommendation',
        description: 'Featured book for this genre',
        schema: VariableType.STRING,
      },
      value: JSON.stringify('A book of your choice'),
      cohortValues: bookValues,
    }),
    createStaticVariableConfig({
      scope: VariableScope.COHORT,
      definition: {
        name: 'discussion_prompt',
        description: 'Discussion prompt for this genre',
        schema: VariableType.STRING,
      },
      value: JSON.stringify('What makes a great book for you?'),
      cohortValues: promptValues,
    }),
  ];
}

// ****************************************************************************
// Stage Configs
// ****************************************************************************
function getStageConfigs(config: BookClubConfig): StageConfig[] {
  const stages: StageConfig[] = [];

  // 1. Profile stage
  stages.push(
    createProfileStage({
      name: 'Set Your Profile',
      profileType: ProfileType.ANONYMOUS_ANIMAL,
    }),
  );

  // 2. Welcome
  stages.push(
    createInfoStage({
      name: 'Welcome',
      infoLines: [
        'Welcome to the Book Club!',
        '',
        'In this study, you will:',
        '1. Tell us your favorite book genre',
        '2. Join a group of fellow readers',
        '3. Chat about books with your group',
        '',
        "Let's find your perfect book club!",
      ],
    }),
  );

  // 3. Genre selection survey
  const surveyStage = createSurveyStage({
    id: SURVEY_STAGE_ID,
    name: 'Pick Your Genre',
  }) as SurveyStageConfig;

  surveyStage.questions = [
    createMultipleChoiceSurveyQuestion({
      id: 'genre_choice',
      questionTitle: "What's your favorite book genre?",
      options: BOOK_GENRES.map((genre) => ({
        id: genre.id,
        text: genre.optionText,
        imageId: '',
      })),
    }),
  ];
  stages.push(surveyStage);

  // 4. Transfer stage - routes to genre-specific cohort
  const transferStage = createTransferStage({
    id: TRANSFER_STAGE_ID,
    name: 'Finding Your Book Club',
    enableTimeout: !config.routeImmediately, // No timeout needed for immediate routing
    timeoutSeconds: 300,
  }) as TransferStageConfig;

  // Routing configuration based on routeImmediately setting
  const minCount = config.routeImmediately ? 1 : 2;
  const maxCount = config.routeImmediately ? 1 : 4;
  const maxParticipantsPerCohort = config.routeImmediately ? null : 4;

  // Create transfer groups
  const transferGroups = BOOK_GENRES.map((genre) =>
    createTransferGroup({
      name: genre.cohortName,
      targetCohortAlias: genre.cohortAlias,
      composition: [
        createGroupComposition({
          condition: createComparisonCondition(
            {stageId: SURVEY_STAGE_ID, questionId: 'genre_choice'},
            ComparisonOperator.EQUALS,
            genre.id,
          ),
          minCount,
          maxCount,
        }),
      ],
    }),
  );

  transferStage.autoTransferConfig = createConditionAutoTransferConfig({
    autoCohortParticipantConfig: createCohortParticipantConfig({
      minParticipantsPerCohort: minCount,
      maxParticipantsPerCohort: maxParticipantsPerCohort,
    }),
    transferGroups,
  });
  stages.push(transferStage);

  // 5. Post-transfer info
  stages.push(
    createInfoStage({
      name: 'Your Book Club',
      infoLines: [
        'Welcome to your book club!',
        '',
        'Featured book: {{book_recommendation}}',
        '',
        '{{discussion_prompt}}',
        '',
        'Get ready to chat with your fellow readers!',
      ],
    }),
  );

  // 6. Group chat with mediator
  stages.push(
    createChatStage({
      id: CHAT_STAGE_ID,
      name: 'Book Discussion',
    }),
  );

  return stages;
}

// ****************************************************************************
// Agent Mediator with Conditional Prompts
// ****************************************************************************
function createBookClubMediatorAgent(): AgentMediatorTemplate {
  const persona = createAgentMediatorPersonaConfig({
    name: 'Book Club Host',
    description: 'Facilitates book discussions with genre-appropriate guidance',
    isDefaultAddToCohort: true,
    defaultProfile: createParticipantProfileBase({
      name: 'Librarian',
      avatar: '📚',
    }),
    defaultModelSettings: createAgentModelSettings({
      apiType: ApiKeyType.GEMINI_API_KEY,
      modelName: 'gemini-3-flash-preview',
    }),
  });

  // Build conditional prompt items for each genre
  const genreGuidanceItems = BOOK_GENRES.map((genre) => ({
    ...createTextPromptItem(genre.mediatorGuidance),
    condition: createComparisonCondition(
      {stageId: SURVEY_STAGE_ID, questionId: 'genre_choice'},
      ComparisonOperator.EQUALS,
      genre.id,
    ),
  }));

  const promptMap: Record<string, MediatorPromptConfig> = {};
  promptMap[CHAT_STAGE_ID] = createChatPromptConfig(
    CHAT_STAGE_ID,
    StageKind.CHAT,
    {
      prompt: [
        createTextPromptItem(
          'You are a friendly book club host facilitating a discussion among readers.',
        ),
        createTextPromptItem('Discussion topic: {{discussion_prompt}}'),
        createTextPromptItem('Featured book: {{book_recommendation}}'),
        // Genre-specific guidance (only one will be included based on condition)
        ...genreGuidanceItems,
        // Stage context provides chat history
        createDefaultStageContextPromptItem(CHAT_STAGE_ID),
        createTextPromptItem(
          `Be warm and enthusiastic. Ask engaging questions. Encourage everyone to share. Use 1-2 sentences per turn.`,
        ),
      ],
    },
  );

  return {persona, promptMap};
}

// ****************************************************************************
// Main Template Export
// ****************************************************************************

export const TRANSFER_CONDITIONS_TEMPLATE_METADATA = createMetadataConfig({
  name: 'Book Club',
  publicName: 'Book Club',
  description:
    'Routes readers to genre-based discussion groups with AI-facilitated conversations.',
});

export function getTransferConditionsTemplate(
  config: BookClubConfig = createBookClubConfig(),
): ExperimentTemplate {
  const stageConfigs = getStageConfigs(config);
  const cohortDefinitions = getCohortDefinitions();
  const variableConfigs = getVariableConfigs();

  return createExperimentTemplate({
    experiment: createExperimentConfig(stageConfigs, {
      metadata: TRANSFER_CONDITIONS_TEMPLATE_METADATA,
      cohortDefinitions,
      variableConfigs,
    }),
    stageConfigs,
    agentMediators: [createBookClubMediatorAgent()],
    agentParticipants: [],
  });
}

/**
 * HOW IT WORKS:
 *
 * 1. LOBBY COHORT:
 *    Participants start in the "Lobby" cohort.
 *    Share the Lobby cohort link with participants.
 *
 * 2. GENRE SELECTION:
 *    Participants pick their favorite genre in a survey.
 *
 * 3. ROUTING (configurable via routeImmediately):
 *    - routeImmediately = true (default): Transfer each participant
 *      immediately to their genre cohort (no waiting)
 *    - routeImmediately = false: Wait for 2-4 participants with the
 *      same genre, then transfer them together
 *
 *    Genre cohorts:
 *    - "mystery" -> mystery-cohort
 *    - "scifi_fantasy" -> scifi-fantasy-cohort
 *    - "literary" -> literary-cohort
 *    - "romance" -> romance-cohort
 *
 * 4. COHORT-SPECIFIC CONTENT:
 *    Each cohort has its own variables:
 *    - book_recommendation: Featured book for the genre
 *    - discussion_prompt: Genre-appropriate discussion starter
 *
 * 5. CONDITIONAL MEDIATOR PROMPTS:
 *    The Librarian agent receives genre-specific guidance:
 *    - Mystery: Focus on plot twists, red herrings
 *    - Sci-Fi/Fantasy: Focus on world-building, magic systems
 *    - Literary: Focus on characters, prose style
 *    - Romance: Focus on tropes, favorite couples
 *
 * CUSTOMIZATION:
 *
 * To add/modify genres, edit the BOOK_GENRES array at the top.
 * Each genre needs: id, cohortAlias, cohortName, optionText,
 * bookRecommendation, discussionPrompt, mediatorGuidance.
 * The template automatically generates cohorts, routing, variables, and prompts.
 */
