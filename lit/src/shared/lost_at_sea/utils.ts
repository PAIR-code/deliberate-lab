/**
 * Utils functions for Lost at Sea game.
 */

import {
  ITEM_NAMES,
  ITEMS,
  ItemName,
  PayoutBundleStrategy,
  PayoutItemKind,
  PayoutItemStrategy,
  QuestionConfig,
  RatingQuestionConfig,
  RevealStageConfig,
  StageConfig,
  StageKind,
  SurveyQuestionKind,
  choices,
  pairs,
  seed
} from '@llm-mediation-experiments/utils';
import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";
import { v4 as uuidv4 } from "uuid";

import { LAS_ID, LAS_FINAL_SURVEY, LAS_FINAL_SURVEY_DESCRIPTION, LAS_GROUP_CHAT_DESCRIPTION, LAS_INITIAL_TASK_INTRO_INFO_LINES, LAS_INTRO_DESCRIPTION, LAS_INTRO_INFO_LINES, LAS_LEADER_ELECTION_DESCRIPTION, LAS_LEADER_REVEAL_DESCRIPTION, LAS_LEADER_TASK_DESCRIPTION, LAS_REDO_TASK_DESCRIPTION, LAS_SCENARIO_REMINDER, LAS_WTL_DESCRIPTION, LAS_WTL_SURVEY } from './constants';
import { createSurveyStage, createChatStage, createVoteForLeaderStage, createPayoutStage, createRevealStage, createInfoStage } from "../utils";

/**
 * Create Lost at Sea game module stages.
 *
 * This includes:
 *   2 individual tasks with the same randomly-generated item pairs
 *   1 chat discussion based around those item pairs
 *   1 leader task with different randomly-generated item pairs
 */

export function createLostAtSeaGameStages(numPairs = 5): StageConfig[] {
  const stages: StageConfig[] = [];

  // Add introduction
  stages.push(createInfoStage({
    name: "Welcome to the experiment",
    description: LAS_INTRO_DESCRIPTION,
    infoLines: LAS_INTRO_INFO_LINES}));
  
  stages.push(createInfoStage({
    name: "Individual survival task instructions",
    description: "",
    infoLines: LAS_INITIAL_TASK_INTRO_INFO_LINES}));

  // Shuffle the items.
  seed(6272023);
  const middleIndex = Math.ceil(ITEM_NAMES.length / 2);

  // Take random items from the first half for the individual tasks.
  const INDIVIDUAL_ITEM_NAMES = ITEM_NAMES.slice(0, middleIndex);
  const INDIVIDUAL_ITEM_PAIRS = choices(pairs(INDIVIDUAL_ITEM_NAMES), numPairs);

  // Take random items from the second half for the leader tasks.
  const LEADER_ITEM_NAMES = ITEM_NAMES.slice(middleIndex);
  const LEADER_ITEM_PAIRS = choices(pairs(LEADER_ITEM_NAMES), numPairs);

  // Add individual surveys
  const INDIVIDUAL_QUESTIONS: RatingQuestionConfig[] = INDIVIDUAL_ITEM_PAIRS.map(
    (pair, index) => getRatingQuestionFromPair(pair, index)
  );

  const initialTask = createSurveyStage({
    name: "Initial survival task", 
    questions: INDIVIDUAL_QUESTIONS,
    popupText: LAS_SCENARIO_REMINDER,
  });
  stages.push(initialTask);

  stages.push(createSurveyStage({
    name: "Willingness to lead survey",
    description: LAS_WTL_DESCRIPTION,
    questions: LAS_WTL_SURVEY
  }));

  // Add chat with individual item pairs as discussion
  stages.push(
    createChatStage(
      "Group discussion",
      LAS_GROUP_CHAT_DESCRIPTION,
      INDIVIDUAL_ITEM_PAIRS.map(([i1, i2]) => ({ item1: i1, item2: i2 }))
    )
  );

  const redoTask = createSurveyStage({
    name: "Updated individual task",
    description: LAS_REDO_TASK_DESCRIPTION,
    popupText: LAS_SCENARIO_REMINDER,
    questions: INDIVIDUAL_QUESTIONS
  });
  stages.push(redoTask);

  const leaderElection = createVoteForLeaderStage({
    name: "Representative election",
    description: LAS_LEADER_ELECTION_DESCRIPTION
  });
  stages.push(leaderElection);

  // Add leader task
  const LEADER_QUESTIONS: RatingQuestionConfig[] = LEADER_ITEM_PAIRS.map(
    (pair, index) => getRatingQuestionFromPair(pair, index)
  );

  const leaderTask = createSurveyStage({
    name: "Representative task",
    description: LAS_LEADER_TASK_DESCRIPTION,
    popupText: LAS_SCENARIO_REMINDER,
    questions: LEADER_QUESTIONS
  });
  stages.push(leaderTask);

  stages.push(createRevealStage({
    name: "Representative reveal",
    description: LAS_LEADER_REVEAL_DESCRIPTION,
    stagesToReveal: [leaderElection.id, leaderTask.id],
  }))

  // Add payout
  stages.push(createPayoutStage({
    name: "Final payoff",
    payouts: [
      {
        name: "Part 1 payoff",
        strategy: PayoutBundleStrategy.AddPayoutItems,
        payoutItems: [{
          kind: PayoutItemKind.RatingSurvey,
          strategy: PayoutItemStrategy.ChooseOne,
          surveyStageId: initialTask.id,
          currencyAmountPerQuestion: 0,
          fixedCurrencyAmount: 0,
        }]
      },
      {
        name: "Parts 2 and 3 payoff",
        strategy: PayoutBundleStrategy.ChoosePayoutItem,
        payoutItems: [
          {
            kind: PayoutItemKind.RatingSurvey,
            strategy: PayoutItemStrategy.ChooseOne,
            surveyStageId: redoTask.id,
            currencyAmountPerQuestion: 0,
            fixedCurrencyAmount: 0,
          },
          {
            kind: PayoutItemKind.RatingSurvey,
            strategy: PayoutItemStrategy.ChooseOne,
            surveyStageId: leaderTask.id,
            leaderStageId: leaderElection.id,
            currencyAmountPerQuestion: 0,
            fixedCurrencyAmount: 0,
          }
        ]
      },
    ],
  }));

  // Final survey
  stages.push(createSurveyStage({
    name: "Final survey",
    description: LAS_FINAL_SURVEY_DESCRIPTION,
    questions: LAS_FINAL_SURVEY
  }));

  stages.forEach(stage => { stage.game = LAS_ID; });
  return stages;
}

/**
 * Uses item pair to create survey RatingQuestion.
 */
export function getRatingQuestionFromPair(
  pair: [string, string],
  id: number,
  questionText = "Choose the item that would be more helpful to your survival",
): RatingQuestionConfig {

  const [one, two] = pair;
  const item1: ItemName = (one as ItemName);
  const item2: ItemName = (two as ItemName);

  return {
    id,
    kind: SurveyQuestionKind.Rating,
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
 * Check if stage is a LostAtSea survey
 */
export function isLostAtSeaSurveyStage(stage: StageConfig) {
  if (stage.kind !== StageKind.TakeSurvey) {
     return false;
  }
  for (const question of stage.questions) {
    if (question.kind === SurveyQuestionKind.Rating) {
      return true;
    }
  }
  return false;
}

/**
 * Return LostAtSea survey stages from given list of stages.
 */
export function getLostAtSeaSurveyStages(stages: StageConfig[]) {
  return stages.filter(stage => isLostAtSeaSurveyStage(stage));
}