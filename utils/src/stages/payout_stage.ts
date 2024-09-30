import { generateId } from '../shared';
import {
  ParticipantProfile
} from '../participant';
import {
  BaseStageConfig,
  StageConfig,
  StageGame,
  StageKind,
  StagePublicData,
  createStageTextConfig,
  createStageProgressConfig,
} from './stage';
import {
  MultipleChoiceSurveyQuestion,
  SurveyAnswer,
  SurveyQuestionKind,
} from './survey_stage';

/** Payout stage types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

export interface PayoutStageConfig extends BaseStageConfig {
  kind: StageKind.PAYOUT;
  currency: PayoutCurrency;
  payoutItems: PayoutItem[];
}

export enum PayoutCurrency {
  EUR = "EUR", // Euro
  GBP = "GBP", // British pound
  USD = "USD", // US dollar
}

export type PayoutItem = DefaultPayoutItem | SurveyPayoutItem;

export interface BasePayoutItem {
  id: string;
  type: PayoutItemType;
  name: string;
  description: string,
  // Only include this item in total payout if true
  isActive: boolean;
  // ID of stage associated with payout
  // (e.g., stage must be completed to earn this payout)
  stageId: string;
  // Fixed payout added if stage is completed
  baseCurrencyAmount: number;
}

export enum PayoutItemType {
  DEFAULT = "DEFAULT",
  SURVEY = "SURVEY",
}

export interface DefaultPayoutItem extends BasePayoutItem {
  type: PayoutItemType.DEFAULT;
}

export interface SurveyPayoutItem extends BasePayoutItem {
  type: PayoutItemType.SURVEY;
  // ID of ranking stage if using ranking winner's survey answers for scoring
  // (else, leave null to use current participant survey answers for scoring)
  rankingStageId: string|null;
  // Map of question ID to payout amount if correct (or null if no payout)
  questionMap: Record<string, number|null>;
}

/** Payout result config (containing payout information for each item).
  * This contains all the results needed to appropriately display payout.
  */
export interface PayoutResultConfig {
  id: string; // stage ID of the original payout config
  currency: PayoutCurrency;
  results: PayoutItemResult[];
}

export type PayoutItemResult = DefaultPayoutItemResult | SurveyPayoutItemResult;

export interface BasePayoutItemResult {
  id: string;
  type: PayoutItemType;
  name: string;
  description: string;
  stageName: string;
  completedStage: boolean;
  baseAmountEarned: number;
}

export interface DefaultPayoutItemResult extends BasePayoutItemResult {
  type: PayoutItemType.DEFAULT;
}

export interface SurveyPayoutItemResult extends BasePayoutItemResult {
  type: PayoutItemType.SURVEY;
  // public participant ID if ranking winner, null if self
  rankingWinner: string|null;
  questionResults: SurveyPayoutQuestionResult[];
}

export interface SurveyPayoutQuestionResult {
  question: MultipleChoiceSurveyQuestion;
  answerId: string;
  amountEarned: number;
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create payout stage. */
export function createPayoutStage(
  config: Partial<PayoutStageConfig> = {}
): PayoutStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.PAYOUT,
    game: config.game ?? StageGame.NONE,
    name: config.name ?? 'Payout',
    descriptions: config.descriptions ?? createStageTextConfig(),
    progress: config.progress ?? createStageProgressConfig(),
    currency: config.currency ?? PayoutCurrency.USD,
    payoutItems: config.payoutItems ?? [],
  };
}

/** Create default payout item. */
export function createDefaultPayoutItem(
  config: Partial<DefaultPayoutItem> = {},
): DefaultPayoutItem {
  return {
    id: config.id ?? generateId(),
    type: PayoutItemType.DEFAULT,
    name: config.name ?? '',
    description: config.description ?? '',
    isActive: config.isActive ?? true,
    stageId: config.stageId ?? '',
    baseCurrencyAmount: config.baseCurrencyAmount ?? 0
  };
}

/** Create survey payout item. */
export function createSurveyPayoutItem(
  config: Partial<SurveyPayoutItem> = {},
): SurveyPayoutItem {
  return {
    id: config.id ?? generateId(),
    type: PayoutItemType.SURVEY,
    name: config.name ?? '',
    description: config.description ?? '',
    isActive: config.isActive ?? true,
    stageId: config.stageId ?? '',
    baseCurrencyAmount: config.baseCurrencyAmount ?? 0,
    rankingStageId: config.rankingStageId ?? null,
    questionMap: config.questionMap ?? {},
  };
}

/** Calculate payout results. */
export function calculatePayoutResult(
  payoutConfig: PayoutStageConfig,
  stageConfigMap: Record<string, StageConfig>, // stage ID to config
  publicDataMap: Record<string, StagePublicData>, // stage ID to public data
  profile: ParticipantProfile, // current participant profile
): PayoutResultConfig {
  let results: PayoutItemResult[] = [];

  // For each payout item, add result to list if item is active
  payoutConfig.payoutItems.forEach(item => {
    if (item.isActive) {
      const result = calculatePayoutItemResult(item, stageConfigMap, publicDataMap, profile);
      if (result) {
        results.push(result);
      }
    }
  });

  const resultConfig: PayoutResultConfig = {
    id: payoutConfig.id,
    currency: payoutConfig.currency,
    results
  };
  return resultConfig;
}

/** Calculate payout results for a single item (or null if can't calculate). */
export function calculatePayoutItemResult(
  item: PayoutItem,
  stageConfigMap: Record<string, StageConfig>,
  publicDataMap: Record<string, StagePublicData>,
  profile: ParticipantProfile, // current participant profile
): PayoutItemResult|null {
  if (!item.isActive) return null;

  switch (item.type) {
    case PayoutItemType.DEFAULT:
      return calculateDefaultPayoutItemResult(item, stageConfigMap, publicDataMap, profile);
    case PayoutItemType.SURVEY:
      return calculateSurveyPayoutItemResult(item, stageConfigMap, publicDataMap, profile);
    default:
      return null;
  }
}

/** Calculate default payout results for a single item (or null if can't calculate). */
export function calculateDefaultPayoutItemResult(
  item: DefaultPayoutItem,
  stageConfigMap: Record<string, StageConfig>,
  publicDataMap: Record<string, StagePublicData>,
  profile: ParticipantProfile, // current participant profile
): DefaultPayoutItemResult|null {
  if (!item.isActive) return null;

  const stage = stageConfigMap[item.stageId];
  if (!stage) return null;

  const stageTimestamp = profile.timestamps.completedStages[item.stageId];
  const completedStage = stageTimestamp !== null && stageTimestamp !== undefined;

  return {
    id: item.id,
    type: PayoutItemType.DEFAULT,
    name: item.name,
    description: item.description,
    stageName: stage.name,
    completedStage,
    baseAmountEarned: completedStage ? item.baseCurrencyAmount : 0
  };
}

/** Calculate survey payout results for a single item (or null if can't calculate). */
export function calculateSurveyPayoutItemResult(
  item: SurveyPayoutItem,
  stageConfigMap: Record<string, StageConfig>,
  publicDataMap: Record<string, StagePublicData>,
  profile: ParticipantProfile, // current participant profile
): SurveyPayoutItemResult|null {
  if (!item.isActive) return null;

  // Get survey stage config
  const stage = stageConfigMap[item.stageId];
  if (!stage || stage.kind !== StageKind.SURVEY) return null;

  const stageTimestamp = profile.timestamps.completedStages[item.stageId];
  const completedStage = stageTimestamp !== null && stageTimestamp !== undefined;

  // Get participant ID
  // If ranking stage ID is set, use ranking stage winner as participant
  const participantId = profile.publicId;
  let rankingWinner: string|null = null;
  if (item.rankingStageId) {
    const rankingStageData = publicDataMap[item.rankingStageId];
    if (rankingStageData && rankingStageData.kind === StageKind.RANKING) {
      rankingWinner = rankingStageData.currentWinner;
    } else {
      return null; // can't calculate payout with missing ranking stage
    }
  }

  // Get survey stage answer data
  const surveyStageData = publicDataMap[item.stageId];
  let answerMap: Record<string, SurveyAnswer> = {};
  if (surveyStageData?.kind === StageKind.SURVEY) {
    // Get answers from either ranking stage winner or current participant
    if (item.rankingStageId) {
      answerMap = surveyStageData.participantAnswerMap[rankingWinner ?? ''] ?? {};
    } else {
      answerMap = surveyStageData.participantAnswerMap[participantId] ?? {};
    }
  }

  // Calculate survey question results (for multiple choice questions)
  const questionResults: SurveyPayoutQuestionResult[] = [];
  stage.questions.forEach((question) => {
    if (question.kind !== SurveyQuestionKind.MULTIPLE_CHOICE) return;

    const questionAmount = item.questionMap[question.id];
    if (questionAmount && question.correctAnswerId) {
      const answer = answerMap[question.id];
      const answerId = answer && answer.kind === SurveyQuestionKind.MULTIPLE_CHOICE ? answer.choiceId : '';
      const amountEarned = (answerId === question.correctAnswerId) ? questionAmount : 0;
      const result: SurveyPayoutQuestionResult = {
        question,
        answerId,
        amountEarned
      };
      questionResults.push(result);
    }
  });

  return {
    id: item.id,
    type: PayoutItemType.SURVEY,
    name: item.name,
    description: item.description,
    stageName: stage.name,
    completedStage,
    baseAmountEarned: completedStage ? item.baseCurrencyAmount : 0,
    rankingWinner,
    questionResults
  };
}