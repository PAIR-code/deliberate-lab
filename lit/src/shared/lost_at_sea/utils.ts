/**
 * Utils functions for Lost at Sea game.
 */

import {
  ItemName,
  LostAtSeaQuestion,
  LostAtSeaSurveyStageConfig,
  PayoutBundleStrategy,
  PayoutItemKind,
  PayoutItemStrategy,
  StageConfig,
  StageKind,
} from '@llm-mediation-experiments/utils';

import {
  createChatStage,
  createInfoStage,
  createPayoutStage,
  createProfileStage,
  createRevealStage,
  createSurveyStage,
  createTOSStage,
  createVoteForLeaderStage,
  generateId,
} from '../utils';
import {
  ITEMS_SET_1,
  ITEMS_SET_2,
  ITEMS_SET_3,
  LAS_FINAL_SURVEY,
  LAS_FINAL_SURVEY_DESCRIPTION,
  LAS_GROUP_CHAT_DESCRIPTION,
  LAS_GROUP_DISCUSSION_INSTRUCTIONS,
  LAS_ID,
  LAS_INITIAL_TASK_INTRO_INFO_LINES,
  LAS_INTRO_DESCRIPTION,
  LAS_INTRO_INFO_LINES,
  LAS_LEADER_ELECTION_DESCRIPTION,
  LAS_LEADER_ELECTION_INSTRUCTIONS,
  LAS_LEADER_REMINDER,
  LAS_LEADER_REVEAL_DESCRIPTION,
  LAS_PART_3_INSTRUCTIONS,
  LAS_PE2_SURVEY,
  LAS_PE_DESCRIPTION,
  LAS_PE_SURVEY,
  LAS_SCENARIO_REMINDER,
  LAS_SECOND_PART_INTRO_INFO_LINES,
  LAS_UPDATE_INSTRUCTIONS,
  LAS_WAIT_INFO_LINES,
  LAS_WTL_2_DESCRIPTION,
  LAS_WTL_2_SURVEY,
  LAS_WTL_DESCRIPTION,
  LAS_WTL_SURVEY,
} from './constants';

// Define shared variables at the top level
let initialTaskId: string;
let redoTaskId: string;
let leaderElectionId: string;
let leaderTaskId: string;

function getIntroStages(): StageConfig[] {
  const stages: StageConfig[] = [];

  // Add introduction
  stages.push(
    createInfoStage({
      name: 'Welcome to the experiment',
      description: LAS_INTRO_DESCRIPTION,
      infoLines: LAS_INTRO_INFO_LINES,
    })
  );
  stages.push(createTOSStage());
  stages.push(createProfileStage());

  return stages;
}

function getPart1Stages(): StageConfig[] {
  const stages: StageConfig[] = [];

  // Part 1 instructions.
  stages.push(
    createInfoStage({
      name: 'Part 1 instructions',
      description: '',
      infoLines: LAS_INITIAL_TASK_INTRO_INFO_LINES,
    })
  );

  // Individual task.
  const INDIVIDUAL_QUESTIONS: LostAtSeaQuestion[] = ITEMS_SET_1.map(
    (pair, index) => getQuestionFromPair(pair, index)
  );

  const initialTask = createLostAtSeaSurveyStage({
    name: 'Initial survival task',
    questions: INDIVIDUAL_QUESTIONS,
    popupText: LAS_SCENARIO_REMINDER,
  });
  stages.push(initialTask);
  initialTaskId = initialTask.id;

  // Hypothetical willingness to lead.
  stages.push(
    createSurveyStage({
      name: 'Willingness to lead survey',
      description: LAS_WTL_DESCRIPTION,
      questions: LAS_WTL_SURVEY,
    })
  );

  // Wait stage.
  stages.push(
    createInfoStage({
      name: 'Lobby',
      description: 'Wait to be redirected.',
      infoLines: LAS_WAIT_INFO_LINES,
    })
  );

  return stages;
}

function getPart2PreElectionStages(): StageConfig[] {
  const stages: StageConfig[] = [];

  stages.push(
    createInfoStage({
      name: 'Part 2 instructions',
      infoLines: LAS_SECOND_PART_INTRO_INFO_LINES,
    })
  );

  // Performance estimation multiple choice
  stages.push(
    createSurveyStage({
      name: 'Performance estimation',
      description: LAS_PE_DESCRIPTION,
      questions: LAS_PE_SURVEY,
    })
  );

  stages.push(
    createInfoStage({
      name: 'Group discussion instructions',
      infoLines: LAS_GROUP_DISCUSSION_INSTRUCTIONS,
    })
  );

  // Add chat with individual item pairs as discussion
  stages.push(
    createChatStage(
      'Group discussion',
      LAS_GROUP_CHAT_DESCRIPTION,
      ITEMS_SET_2.map(([i1, i2]) => ({item1: i1, item2: i2}))
    )
  );

  stages.push(
    createInfoStage({
      name: 'Update instructions',
      infoLines: LAS_UPDATE_INSTRUCTIONS,
    })
  );

  // Individual task.
  const INDIVIDUAL_QUESTIONS: LostAtSeaQuestion[] = ITEMS_SET_3.map(
    (pair, index) => getQuestionFromPair(pair, index)
  );
  const redoTask = createLostAtSeaSurveyStage({
    name: 'Updated survival task',
    questions: INDIVIDUAL_QUESTIONS,
    popupText: LAS_SCENARIO_REMINDER,
  });
  stages.push(redoTask);
  redoTaskId = redoTask.id;

  stages.push(
    createSurveyStage({
      name: 'Update performance estimation',
      description: '',
      questions: LAS_PE2_SURVEY,
    })
  );

  return stages;
}

function getPart2PostElectionAndPart3Stages(): StageConfig[] {
  const stages: StageConfig[] = [];

  stages.push(
    createInfoStage({
      name: 'Election instructions',
      infoLines: LAS_LEADER_ELECTION_INSTRUCTIONS,
    })
  );

  // Hypothetical willingness to lead.
  stages.push(
    createSurveyStage({
      name: 'Willingness to lead update',
      description: LAS_WTL_2_DESCRIPTION,
      questions: LAS_WTL_2_SURVEY,
      popupText: LAS_LEADER_REMINDER,
    })
  );

  const leaderElection = createVoteForLeaderStage({
    name: 'Representative election',
    description: LAS_LEADER_ELECTION_DESCRIPTION,
  });
  stages.push(leaderElection);
  leaderElectionId = leaderElection.id;

  // PART 3
  stages.push(
    createInfoStage({
      name: 'Part 3 instructions',
      infoLines: LAS_PART_3_INSTRUCTIONS,
    })
  );

  // Individual task.
  const INDIVIDUAL_QUESTIONS: LostAtSeaQuestion[] = ITEMS_SET_2.map(
    (pair, index) => getQuestionFromPair(pair, index)
  );
  const leaderTask = createLostAtSeaSurveyStage({
    name: 'Leader task',
    questions: INDIVIDUAL_QUESTIONS,
    popupText: LAS_SCENARIO_REMINDER,
  });
  stages.push(leaderTask);
  leaderTaskId = leaderTask.id;

  stages.push(
    createRevealStage({
      name: 'Representative reveal',
      description: LAS_LEADER_REVEAL_DESCRIPTION,
      stagesToReveal: [leaderElectionId, leaderTaskId],
    })
  );

  return stages;
}

export function getFinalStages(): StageConfig[] {
  const stages: StageConfig[] = [];

  // Add payout
  stages.push(
    createPayoutStage({
      name: 'Final payoff',
      payouts: [
        {
          name: 'Part 1 payoff',
          strategy: PayoutBundleStrategy.AddPayoutItems,
          payoutItems: [
            {
              // Receive 1 dollar for each correct answer, and
              // 10 dollars for making it to part 2.
              kind: PayoutItemKind.LostAtSeaSurvey,
              strategy: PayoutItemStrategy.ChooseOne,
              surveyStageId: initialTaskId,
              currencyAmountPerQuestion: 1,
              fixedCurrencyAmount: 10,
            },
          ],
        },
        {
          name: 'Parts 2 and 3 payoff',
          strategy: PayoutBundleStrategy.ChoosePayoutItem,
          payoutItems: [
            {
              kind: PayoutItemKind.LostAtSeaSurvey,
              strategy: PayoutItemStrategy.ChooseOne,
              surveyStageId: redoTaskId,
              currencyAmountPerQuestion: 2,
              fixedCurrencyAmount: 0,
            },
            {
              kind: PayoutItemKind.LostAtSeaSurvey,
              strategy: PayoutItemStrategy.ChooseOne,
              surveyStageId: leaderTaskId,
              leaderStageId: leaderElectionId,
              currencyAmountPerQuestion: 2,
              fixedCurrencyAmount: 0,
            },
          ],
        },
      ],
    })
  );

  // Final survey
  stages.push(
    createSurveyStage({
      name: 'Final survey',
      description: LAS_FINAL_SURVEY_DESCRIPTION,
      questions: LAS_FINAL_SURVEY,
    })
  );

  return stages;
}

export function createLostAtSeaGameStages(numPairs = 5): StageConfig[] {
  const stages: StageConfig[] = [];
  stages.push(...getIntroStages());
  stages.push(...getPart1Stages());
  stages.push(...getPart2PreElectionStages());
  stages.push(...getPart2PostElectionAndPart3Stages());
  stages.push(...getFinalStages());

  stages.forEach((stage) => {
    stage.game = LAS_ID;
  });
  return stages;
}

/** Create Lost at Sea survey stage. */
export function createLostAtSeaSurveyStage(
  config: Partial<LostAtSeaSurveyStageConfig> = {}
): LostAtSeaSurveyStageConfig {
  return {
    id: generateId(),
    kind: StageKind.LostAtSeaSurvey,
    name: config.name ?? 'Survey',
    description: config.description ?? '',
    popupText: config.popupText ?? '',
    questions: config.questions ?? [],
  };
}

/**
 * Uses item pair to create Lost at Sea question.
 */
export function getQuestionFromPair(
  pair: [string, string],
  id: number,
  questionText = 'Choose the item that would be more helpful to your survival'
): LostAtSeaQuestion {
  const [one, two] = pair;
  const item1: ItemName = one as ItemName;
  const item2: ItemName = two as ItemName;

  return {
    id,
    questionText,
    item1,
    item2,
  };
}

/**
 * Check if stage is part of the LostAtSea game.
 */
export function isLostAtSeaGameStage(stage: StageConfig) {
  return stage.game === LAS_ID;
}

/**
 * Return LostAtSea survey stages from given list of stages.
 */
export function getLostAtSeaSurveyStages(stages: StageConfig[]) {
  return stages.filter((stage) => stage.kind === StageKind.LostAtSeaSurvey);
}
