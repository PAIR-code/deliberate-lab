import {
  StageConfig,
  SurveyStageConfig,
  createSurveyStage,
  createScaleSurveyQuestion,
  createTextSurveyQuestion,
  createCheckSurveyQuestion,
  createMultipleChoiceSurveyQuestion,
  ConditionOperator,
  ComparisonOperator,
  createConditionGroup,
  createComparisonCondition,
  createMetadataConfig,
  createInfoStage,
} from '@deliberation-lab/utils';

export const CONDITIONAL_SURVEY_TEMPLATE_METADATA = createMetadataConfig({
  name: 'Conditional Survey Demo',
  publicName: 'Advanced Survey with Conditional Logic',
  description:
    'A comprehensive demonstration of survey questions with complex conditional logic, including AND/OR operators, nested conditions, and various comparison types',
});

/**
 * Comprehensive survey template demonstrating all types of conditions
 * and how they can be chained together.
 */
export function getConditionalSurveyTemplate(): StageConfig[] {
  const surveyStage = createSurveyStage({
    id: 'survey_stage_1',
    name: 'Fun Preferences Survey - Part 1',
  }) as SurveyStageConfig;

  // Question 1: Pet preference (always shown)
  const q1Pets = createMultipleChoiceSurveyQuestion({
    id: 'pet_preference',
    questionTitle: 'What type of pet do you prefer?',
    options: [
      {id: 'dog', text: '🐕 Dog', imageId: ''},
      {id: 'cat', text: '🐈 Cat', imageId: ''},
      {id: 'bird', text: '🦜 Bird', imageId: ''},
      {id: 'fish', text: '🐠 Fish', imageId: ''},
      {id: 'no_pets', text: '🚫 No pets', imageId: ''},
    ],
  });

  // Question 2: Activity level (always shown)
  const q2Activity = createScaleSurveyQuestion({
    id: 'activity_level',
    questionTitle: 'How many hours per week do you spend on hobbies?',
    lowerText: '0 hours',
    upperText: '20+ hours',
    lowerValue: 0,
    upperValue: 20,
    useSlider: true,
  });

  // Question 3: Dog activities (only shown if dog is selected)
  const q3DogActivities = createMultipleChoiceSurveyQuestion({
    id: 'dog_activity',
    questionTitle: 'What would be your favorite dog activity?',
    options: [
      {id: 'walk', text: '🚶 Walking in the park', imageId: ''},
      {id: 'fetch', text: '🎾 Playing fetch', imageId: ''},
      {id: 'tricks', text: '🎪 Teaching tricks', imageId: ''},
      {id: 'cuddle', text: '🤗 Cuddling on couch', imageId: ''},
    ],
  });
  // Condition: Show only if pet_preference = dog
  q3DogActivities.condition = createConditionGroup(ConditionOperator.AND, [
    createComparisonCondition(
      {stageId: surveyStage.id, questionId: 'pet_preference'},
      ComparisonOperator.EQUALS,
      'dog',
    ),
  ]);

  // Question 4: Pet care hours (for pet owners with moderate activity)
  const q4PetCare = createScaleSurveyQuestion({
    id: 'pet_care_hours',
    questionTitle:
      'How many hours per week do you spend caring for/playing with pets?',
    lowerValue: 0,
    upperValue: 20,
    lowerText: '0 hours',
    upperText: '20+ hours',
    useSlider: true,
  });
  // Condition: (cat OR dog OR bird selected) AND activity_level > 5
  const hasPetCondition = createConditionGroup(ConditionOperator.OR, [
    createComparisonCondition(
      {stageId: surveyStage.id, questionId: 'pet_preference'},
      ComparisonOperator.EQUALS,
      'cat',
    ),
    createComparisonCondition(
      {stageId: surveyStage.id, questionId: 'pet_preference'},
      ComparisonOperator.EQUALS,
      'dog',
    ),
    createComparisonCondition(
      {stageId: surveyStage.id, questionId: 'pet_preference'},
      ComparisonOperator.EQUALS,
      'bird',
    ),
  ]);

  q4PetCare.condition = createConditionGroup(ConditionOperator.AND, [
    hasPetCondition,
    createComparisonCondition(
      {stageId: surveyStage.id, questionId: 'activity_level'},
      ComparisonOperator.GREATER_THAN,
      5,
    ),
  ]);

  // Question 5: Favorite season (always shown)
  const q5Season = createMultipleChoiceSurveyQuestion({
    id: 'favorite_season',
    questionTitle: 'What is your favorite season?',
    options: [
      {id: 'spring', text: '🌸 Spring', imageId: ''},
      {id: 'summer', text: '☀️ Summer', imageId: ''},
      {id: 'fall', text: '🍂 Fall', imageId: ''},
      {id: 'winter', text: '❄️ Winter', imageId: ''},
    ],
  });

  // Question 6: Summer activity (shown if summer selected)
  const q6SummerActivity = createTextSurveyQuestion({
    id: 'summer_activity',
    questionTitle: 'What is your favorite summer activity?',
  });
  // Condition: favorite_season = summer
  q6SummerActivity.condition = createConditionGroup(ConditionOperator.AND, [
    createComparisonCondition(
      {stageId: surveyStage.id, questionId: 'favorite_season'},
      ComparisonOperator.EQUALS,
      'summer',
    ),
  ]);

  // Question 7: Indoor preference (shown if winter OR fall selected)
  const q7IndoorPreference = createCheckSurveyQuestion({
    id: 'prefers_indoor',
    questionTitle: 'Do you prefer indoor activities?',
  });
  // Condition: favorite_season = winter OR fall
  q7IndoorPreference.condition = createConditionGroup(ConditionOperator.OR, [
    createComparisonCondition(
      {stageId: surveyStage.id, questionId: 'favorite_season'},
      ComparisonOperator.EQUALS,
      'winter',
    ),
    createComparisonCondition(
      {stageId: surveyStage.id, questionId: 'favorite_season'},
      ComparisonOperator.EQUALS,
      'fall',
    ),
  ]);

  // Question 8: Entertainment preferences (for indoor people or tech-oriented)
  const q8Entertainment = createMultipleChoiceSurveyQuestion({
    id: 'entertainment_type',
    questionTitle: 'What is your favorite type of indoor entertainment?',
    options: [
      {id: 'games', text: '🎮 Video games', imageId: ''},
      {id: 'movies', text: '🎬 Movies/TV shows', imageId: ''},
      {id: 'reading', text: '📚 Reading', imageId: ''},
      {id: 'music', text: '🎵 Music/Podcasts', imageId: ''},
      {id: 'crafts', text: '🎨 Arts & Crafts', imageId: ''},
    ],
  });
  // Show if: (prefers_indoor = true) OR (summer_activity contains "indoor" OR "read" OR "movie")
  const indoorKeywordsGroup = createConditionGroup(ConditionOperator.OR, [
    createComparisonCondition(
      {stageId: surveyStage.id, questionId: 'summer_activity'},
      ComparisonOperator.CONTAINS,
      'indoor',
    ),
    createComparisonCondition(
      {stageId: surveyStage.id, questionId: 'summer_activity'},
      ComparisonOperator.CONTAINS,
      'read',
    ),
    createComparisonCondition(
      {stageId: surveyStage.id, questionId: 'summer_activity'},
      ComparisonOperator.CONTAINS,
      'movie',
    ),
  ]);

  q8Entertainment.condition = createConditionGroup(ConditionOperator.OR, [
    createComparisonCondition(
      {stageId: surveyStage.id, questionId: 'prefers_indoor'},
      ComparisonOperator.EQUALS,
      true,
    ),
    indoorKeywordsGroup,
  ]);

  // Question 9: Gaming hours (for those who chose games as entertainment)
  const q9Gaming = createScaleSurveyQuestion({
    id: 'gaming_hours',
    questionTitle: 'How many hours per week do you play video games?',
    lowerValue: 0,
    upperValue: 40,
    lowerText: 'Never',
    upperText: '40+ hours',
    useSlider: true,
  });
  // Show if: (entertainment_type = games) AND (prefers_indoor = true OR activity_level < 10)
  const indoorOrLowActivity = createConditionGroup(ConditionOperator.OR, [
    createComparisonCondition(
      {stageId: surveyStage.id, questionId: 'prefers_indoor'},
      ComparisonOperator.EQUALS,
      true,
    ),
    createComparisonCondition(
      {stageId: surveyStage.id, questionId: 'activity_level'},
      ComparisonOperator.LESS_THAN,
      10,
    ),
  ]);

  q9Gaming.condition = createConditionGroup(ConditionOperator.AND, [
    createComparisonCondition(
      {stageId: surveyStage.id, questionId: 'entertainment_type'},
      ComparisonOperator.EQUALS,
      'games',
    ),
    indoorOrLowActivity,
  ]);

  // Question 10: Social food preference (complex nested conditions)
  const q10SocialFood = createMultipleChoiceSurveyQuestion({
    id: 'social_food',
    questionTitle: 'What food do you prefer for social gatherings?',
    options: [
      {id: 'pizza', text: '🍕 Pizza', imageId: ''},
      {id: 'bbq', text: '🍖 BBQ/Grill', imageId: ''},
      {id: 'tacos', text: '🌮 Tacos', imageId: ''},
      {id: 'sushi', text: '🍱 Sushi', imageId: ''},
      {id: 'potluck', text: '🥘 Potluck variety', imageId: ''},
    ],
  });
  // Show if: (no_pets AND activity > 10) OR (dog AND (walk OR fetch selected))
  const activeWalkOrFetch = createConditionGroup(ConditionOperator.OR, [
    createComparisonCondition(
      {stageId: surveyStage.id, questionId: 'dog_activity'},
      ComparisonOperator.EQUALS,
      'walk',
    ),
    createComparisonCondition(
      {stageId: surveyStage.id, questionId: 'dog_activity'},
      ComparisonOperator.EQUALS,
      'fetch',
    ),
  ]);

  const dogActivityGroup = createConditionGroup(ConditionOperator.AND, [
    createComparisonCondition(
      {stageId: surveyStage.id, questionId: 'pet_preference'},
      ComparisonOperator.EQUALS,
      'dog',
    ),
    activeWalkOrFetch,
  ]);

  const noPetsActive = createConditionGroup(ConditionOperator.AND, [
    createComparisonCondition(
      {stageId: surveyStage.id, questionId: 'pet_preference'},
      ComparisonOperator.EQUALS,
      'no_pets',
    ),
    createComparisonCondition(
      {stageId: surveyStage.id, questionId: 'activity_level'},
      ComparisonOperator.GREATER_THAN,
      10,
    ),
  ]);

  q10SocialFood.condition = createConditionGroup(ConditionOperator.OR, [
    noPetsActive,
    dogActivityGroup,
  ]);

  // Question 11: Fun fact (shows if activity level is between 5 and 15)
  const q11FunFact = createTextSurveyQuestion({
    id: 'fun_fact',
    questionTitle: 'Share a fun fact about your hobbies!',
  });
  // Show if activity level is between 5 and 15 hours
  q11FunFact.condition = createConditionGroup(ConditionOperator.AND, [
    createComparisonCondition(
      {stageId: surveyStage.id, questionId: 'activity_level'},
      ComparisonOperator.GREATER_THAN_OR_EQUAL,
      5,
    ),
    createComparisonCondition(
      {stageId: surveyStage.id, questionId: 'activity_level'},
      ComparisonOperator.LESS_THAN_OR_EQUAL,
      15,
    ),
  ]);

  // Add all questions to the survey
  surveyStage.questions = [
    q1Pets,
    q2Activity,
    q3DogActivities,
    q4PetCare,
    q5Season,
    q6SummerActivity,
    q7IndoorPreference,
    q8Entertainment,
    q9Gaming,
    q10SocialFood,
    q11FunFact,
  ];

  // Create intro and conclusion stages
  const introStage = createInfoStage({
    name: 'Introduction',
    infoLines: [
      'Welcome to the Fun Preferences Survey! 🎉',
      '',
      'This TWO-PART survey demonstrates advanced conditional logic:',
      '• Part 1: Questions about pets, hobbies, and games',
      '• Part 2: Questions about vacations and entertainment',
      '• Some questions in Part 2 depend on answers from Part 1',
      '• Complex cross-stage conditions determine what you see',
      '',
      'Have fun exploring different paths through both survey stages!',
    ],
  });

  const conclusionStage = createInfoStage({
    name: 'Thank You',
    infoLines: [
      'Thanks for completing both parts of the survey! 🎆',
      '',
      'This survey demonstrated complex conditional logic:',
      '• Different paths based on your preferences',
      '• Questions that combine conditions across survey stages',
      '• Cross-stage dependencies between Part 1 and Part 2',
      '• Nested AND/OR logic for complex rules',
      '',
      'The questions you saw were uniquely determined by your choices across both stages!',
    ],
  });

  // Create second survey stage
  const surveyStage2 = createSurveyStage({
    id: 'survey_stage_2',
    name: 'Fun Preferences Survey - Part 2',
  }) as SurveyStageConfig;

  // Question S2-1: Outdoor adventure preference (always shown)
  const s2q1Adventure = createMultipleChoiceSurveyQuestion({
    id: 'adventure_type',
    questionTitle: 'What type of outdoor adventure appeals most to you?',
    options: [
      {id: 'hiking', text: '🥾 Hiking trails', imageId: ''},
      {id: 'swimming', text: '🏊 Swimming/Beach', imageId: ''},
      {id: 'camping', text: '⛺ Camping', imageId: ''},
      {id: 'urban', text: '🏙️ Urban exploration', imageId: ''},
      {id: 'no_adventure', text: '🏠 Indoor activities only', imageId: ''},
    ],
  });

  // Question S2-2: Pet adventure (depends on pet care hours from stage 1 AND adventure from stage 2)
  const s2q2PetAdventure = createTextSurveyQuestion({
    id: 'pet_adventure',
    questionTitle: 'What outdoor activity would you do with your pet?',
  });
  // Show if: (pet_care_hours >= 5) AND (adventure != no_adventure)
  s2q2PetAdventure.condition = createConditionGroup(ConditionOperator.AND, [
    createComparisonCondition(
      {stageId: 'survey_stage_1', questionId: 'pet_care_hours'},
      ComparisonOperator.GREATER_THAN_OR_EQUAL,
      5,
    ),
    createComparisonCondition(
      {stageId: 'survey_stage_2', questionId: 'adventure_type'},
      ComparisonOperator.NOT_EQUALS,
      'no_adventure',
    ),
  ]);

  // Question S2-3: Gaming preferences (depends on gaming_hours from stage 1 OR entertainment from stage 1)
  const s2q3GamingPrefs = createMultipleChoiceSurveyQuestion({
    id: 'gaming_preference',
    questionTitle: 'What type of games do you prefer?',
    options: [
      {id: 'action', text: '🎮 Action/Adventure', imageId: ''},
      {id: 'puzzle', text: '🧩 Puzzle/Strategy', imageId: ''},
      {id: 'social', text: '👥 Social/Party', imageId: ''},
      {id: 'mobile', text: '📱 Mobile/Casual', imageId: ''},
      {id: 'sports', text: '⚽ Sports/Racing', imageId: ''},
    ],
  });
  // Show if: gaming_hours >= 5 (stage 1) OR (entertainment = games AND adventure = no_adventure)
  const gamesAndIndoorCondition = createConditionGroup(ConditionOperator.AND, [
    createComparisonCondition(
      {stageId: 'survey_stage_1', questionId: 'entertainment_type'},
      ComparisonOperator.EQUALS,
      'games',
    ),
    createComparisonCondition(
      {stageId: 'survey_stage_2', questionId: 'adventure_type'},
      ComparisonOperator.EQUALS,
      'no_adventure',
    ),
  ]);

  s2q3GamingPrefs.condition = createConditionGroup(ConditionOperator.OR, [
    createComparisonCondition(
      {stageId: 'survey_stage_1', questionId: 'gaming_hours'},
      ComparisonOperator.GREATER_THAN_OR_EQUAL,
      5,
    ),
    gamesAndIndoorCondition,
  ]);

  // Question S2-4: Snack preference (always shown)
  const s2q4Snack = createMultipleChoiceSurveyQuestion({
    id: 'snack_preference',
    questionTitle: "What's your go-to snack for a relaxing evening?",
    options: [
      {id: 'chips', text: '🥔 Chips', imageId: ''},
      {id: 'popcorn', text: '🍿 Popcorn', imageId: ''},
      {id: 'chocolate', text: '🍫 Chocolate', imageId: ''},
      {id: 'fruit', text: '🍎 Fresh fruit', imageId: ''},
      {id: 'cheese', text: '🧀 Cheese & crackers', imageId: ''},
    ],
  });

  // Question S2-5: Winter activity (depends on favorite_season from stage 1 AND adventure from stage 2)
  const s2q5WinterActivity = createTextSurveyQuestion({
    id: 'winter_activity',
    questionTitle: 'What would be your ideal winter weekend activity?',
  });
  // Show if: (favorite_season = winter OR fall) AND (adventure_type != swimming)
  const winterFallGroup = createConditionGroup(ConditionOperator.OR, [
    createComparisonCondition(
      {stageId: 'survey_stage_1', questionId: 'favorite_season'},
      ComparisonOperator.EQUALS,
      'winter',
    ),
    createComparisonCondition(
      {stageId: 'survey_stage_1', questionId: 'favorite_season'},
      ComparisonOperator.EQUALS,
      'fall',
    ),
  ]);

  s2q5WinterActivity.condition = createConditionGroup(ConditionOperator.AND, [
    winterFallGroup,
    createComparisonCondition(
      {stageId: 'survey_stage_2', questionId: 'adventure_type'},
      ComparisonOperator.NOT_EQUALS,
      'swimming',
    ),
  ]);

  // Question S2-6: Movie night (depends on social_food from stage 1 AND snack from stage 2)
  const s2q6MovieNight = createScaleSurveyQuestion({
    id: 'movie_duration',
    questionTitle:
      'How many hours can you binge-watch movies with your favorite snacks?',
    lowerValue: 1,
    upperValue: 12,
    lowerText: '1 movie',
    upperText: 'All night!',
    useSlider: true,
  });
  // Show if: (social_food = pizza OR entertainment = movies) AND (snack = popcorn OR chips)
  const movieCompatibleFood = createConditionGroup(ConditionOperator.OR, [
    createComparisonCondition(
      {stageId: 'survey_stage_1', questionId: 'social_food'},
      ComparisonOperator.EQUALS,
      'pizza',
    ),
    createComparisonCondition(
      {stageId: 'survey_stage_1', questionId: 'entertainment_type'},
      ComparisonOperator.EQUALS,
      'movies',
    ),
  ]);

  const movieSnackCondition = createConditionGroup(ConditionOperator.OR, [
    createComparisonCondition(
      {stageId: 'survey_stage_2', questionId: 'snack_preference'},
      ComparisonOperator.EQUALS,
      'popcorn',
    ),
    createComparisonCondition(
      {stageId: 'survey_stage_2', questionId: 'snack_preference'},
      ComparisonOperator.EQUALS,
      'chips',
    ),
  ]);

  s2q6MovieNight.condition = createConditionGroup(ConditionOperator.AND, [
    movieCompatibleFood,
    movieSnackCondition,
  ]);

  // Question S2-7: Perfect day combo (depends on multiple factors from both stages)
  const s2q7PerfectDay = createMultipleChoiceSurveyQuestion({
    id: 'perfect_day',
    questionTitle: 'What would make your perfect day?',
    options: [
      {id: 'active_social', text: '🏃 Active + Friends', imageId: ''},
      {id: 'quiet_solo', text: '📚 Quiet + Alone', imageId: ''},
      {id: 'creative_project', text: '🎨 Creative Project', imageId: ''},
      {id: 'food_family', text: '🍽️ Food + Family', imageId: ''},
      {id: 'adventure_explore', text: '🗺️ New Adventure', imageId: ''},
    ],
  });
  // Show if: (activity_level between 5-15 AND gaming_hours >= 5) OR (adventure != no_adventure AND gaming_preference = mobile)

  // Path 1: Moderate activity gamers
  const activityRangeCondition = createConditionGroup(ConditionOperator.AND, [
    createComparisonCondition(
      {stageId: 'survey_stage_1', questionId: 'activity_level'},
      ComparisonOperator.GREATER_THAN_OR_EQUAL,
      5,
    ),
    createComparisonCondition(
      {stageId: 'survey_stage_1', questionId: 'activity_level'},
      ComparisonOperator.LESS_THAN_OR_EQUAL,
      15,
    ),
  ]);

  // Moderate activity gamers (simplified)
  const moderateGamerCondition = createConditionGroup(ConditionOperator.AND, [
    activityRangeCondition,
    createComparisonCondition(
      {stageId: 'survey_stage_1', questionId: 'gaming_hours'},
      ComparisonOperator.GREATER_THAN_OR_EQUAL,
      5,
    ),
  ]);

  // Path 2: Active mobile gamers
  const activeMobileCondition = createConditionGroup(ConditionOperator.AND, [
    createComparisonCondition(
      {stageId: 'survey_stage_2', questionId: 'adventure_type'},
      ComparisonOperator.NOT_EQUALS,
      'no_adventure',
    ),
    createComparisonCondition(
      {stageId: 'survey_stage_2', questionId: 'gaming_preference'},
      ComparisonOperator.EQUALS,
      'mobile',
    ),
  ]);

  s2q7PerfectDay.condition = createConditionGroup(ConditionOperator.OR, [
    moderateGamerCondition,
    activeMobileCondition,
  ]);

  // Add all questions to the second survey
  surveyStage2.questions = [
    s2q1Adventure,
    s2q2PetAdventure,
    s2q3GamingPrefs,
    s2q4Snack,
    s2q5WinterActivity,
    s2q6MovieNight,
    s2q7PerfectDay,
  ];

  return [introStage, surveyStage, surveyStage2, conclusionStage];
}

/**
 * This two-stage survey demonstrates:
 *
 * STAGE 1 - Basic Conditional Logic:
 * 1. Simple conditions (single comparisons)
 *    - Q3: Shows only if pet_preference = dog
 *    - Q6: Shows only if favorite_season = summer
 *
 * 2. AND conditions (all must be true)
 *    - Q4: Shows if (has pet) AND activity_level > 5
 *    - Q9: Shows if entertainment = games AND (prefers_indoor OR activity < 10)
 *    - Q11: Shows if activity_level >= 5 AND activity_level <= 15
 *
 * 3. OR conditions (any must be true)
 *    - Q7: Shows if season = winter OR fall
 *    - Q8: Shows if prefers_indoor OR summer activity mentions indoor activities
 *
 * 4. Complex nested conditions
 *    - Q10: (no pets AND active) OR (dog AND (walk OR fetch activity))
 *    - Q9: Gaming hours shown only for gamers with specific conditions
 *
 * STAGE 2 - Cross-Stage Conditional Logic:
 * 1. Dependencies on both stages
 *    - S2Q2: Shows if pet_care_hours >= 5 (Stage 1) AND adventure != none (Stage 2)
 *    - S2Q3: Shows if gaming_hours >= 5 OR (entertainment = games AND indoor preference)
 *
 * 2. Logical connections between stages
 *    - S2Q5: Winter activity for winter/fall lovers who don't prefer swimming
 *    - S2Q6: Movie night for those who like pizza/movies with appropriate snacks
 *
 * 3. Complex cross-stage conditions
 *    - S2Q7: Perfect day for moderate activity gamers OR active mobile gamers
 *         - Combines activity level and gaming hours from Stage 1
 *         - Integrates with adventure type and gaming preferences from Stage 2
 *
 * 4. Different comparison operators used
 *    - EQUALS: preferences and selections
 *    - NOT_EQUALS: vacation != staycation
 *    - GREATER_THAN: gaming_hours > 10, activity_level > 5
 *    - GREATER_THAN_OR_EQUAL: gaming_hours >= 5
 *    - LESS_THAN/LESS_THAN_OR_EQUAL: activity thresholds
 *    - CONTAINS: text field keywords
 *
 * 5. Cross-stage question references
 *    - Stage 2 questions can reference any Stage 1 question
 *    - Stage 2 questions can also reference earlier Stage 2 questions
 *    - Demonstrates full cross-stage conditional capabilities
 */
