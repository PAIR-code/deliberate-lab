/**
 * Utils functions for Lost at Sea game.
 */

import {
  ITEM_NAMES,
  ITEMS,
  ItemName,
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

import { LAS_ID, LAS_FINAL_SURVEY, LAS_FINAL_SURVEY_DESCRIPTION, LAS_GROUP_CHAT_DESCRIPTION, LAS_INITIAL_TASK_DESCRIPTION, LAS_INTRO_DESCRIPTION, LAS_INTRO_INFO_LINES, LAS_LEADER_ELECTION_DESCRIPTION, LAS_LEADER_REVEAL_DESCRIPTION, LAS_LEADER_TASK_DESCRIPTION, LAS_REDO_TASK_DESCRIPTION } from './constants';
import { createSurveyStage, createChatStage, createVoteForLeaderStage, createRevealStage, createInfoStage } from "../utils";

/**
 * Create Lost at Sea game stages.
 *
 * This includes:
 *   2 individual tasks with the same randomly-generated item pairs
 *   1 chat discussion based around those item pairs
 *   1 leader task with different randomly-generated item pairs
 */

export function createLostAtSeaGameStages(numPairs = 5): StageConfig[] {
  const stages: StageConfig[] = [];

  // Add introduction
  stages.push(createInfoStage("Welcome to the experiment", LAS_INTRO_DESCRIPTION, LAS_INTRO_INFO_LINES));
  
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

  stages.push(createSurveyStage("Initial survival task", LAS_INITIAL_TASK_DESCRIPTION, INDIVIDUAL_QUESTIONS));

  // Add chat with individual item pairs as discussion
  stages.push(
    createChatStage(
      "Group discussion",
      LAS_GROUP_CHAT_DESCRIPTION,
      INDIVIDUAL_ITEM_PAIRS.map(([i1, i2]) => ({ item1: i1, item2: i2 }))
    )
  );

  stages.push(createSurveyStage("Updated individual task", LAS_REDO_TASK_DESCRIPTION, INDIVIDUAL_QUESTIONS));
  stages.push(createVoteForLeaderStage("Representative election", LAS_LEADER_ELECTION_DESCRIPTION));

  // Add leader task
  const LEADER_QUESTIONS: RatingQuestionConfig[] = LEADER_ITEM_PAIRS.map(
    (pair, index) => getRatingQuestionFromPair(pair, index)
  );

  stages.push(createSurveyStage("Representative task", LAS_LEADER_TASK_DESCRIPTION, LEADER_QUESTIONS, true));

  stages.push(createRevealStage("Reveal", LAS_LEADER_REVEAL_DESCRIPTION))

  // Final survey
  stages.push(createSurveyStage("Final survey", LAS_FINAL_SURVEY_DESCRIPTION, LAS_FINAL_SURVEY));

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
 * Get Lost at Sea item item pair ranking answer.
 */
export function getLostAtSeaPairAnswer(item1: ItemName, item2: ItemName) {
  const ranking1 = getLostAtSeaItemRanking(item1);
  const ranking2 = getLostAtSeaItemRanking(item2);

  return (ranking1 < ranking2) ? item1 : item2;
}

/**
 * Get Lost at Sea item ranking.
 */
export function getLostAtSeaItemRanking(item: ItemName) {
  return ITEMS[item].ranking;
}

/**
 * Check if stage is part of the LostAtSea game.
 */
export function isLostAtSeaGameStage(stage: StageConfig) {
  return stage.game === LAS_ID;
}