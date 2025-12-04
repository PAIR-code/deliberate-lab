import {generateId} from '../shared';
import {ParticipantProfile} from '../participant';
import {
  BaseStageConfig,
  BaseStageParticipantAnswer,
  StageConfig,
  StageKind,
  StagePublicData,
  createStageTextConfig,
  createStageProgressConfig,
} from './stage';
import {ChipItem} from './chip_stage';
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
  averageAllPayoutItems: boolean;
}

export enum PayoutCurrency {
  EUR = 'EUR', // Euro
  GBP = 'GBP', // British pound
  USD = 'USD', // US dollar
}

export type PayoutItem = DefaultPayoutItem | ChipPayoutItem | SurveyPayoutItem;

export interface BasePayoutItem {
  id: string;
  type: PayoutItemType;
  name: string;
  description: string;
  // Only include this item in total payout if true
  isActive: boolean;
  // ID of stage associated with payout
  // (e.g., stage must be completed to earn this payout)
  stageId: string;
  // Fixed payout added if stage is completed
  baseCurrencyAmount: number;
  // Only select one payout item for each (non-empty) random selection ID
  // e.g., if two payout items have random selection ID 'survival-task',
  // one of them will be randomly selected (on participant creation).
  // Leave empty if item should always be selected.
  randomSelectionId: string;
}

export enum PayoutItemType {
  DEFAULT = 'DEFAULT',
  CHIP = 'CHIP',
  SURVEY = 'SURVEY',
}

export interface DefaultPayoutItem extends BasePayoutItem {
  type: PayoutItemType.DEFAULT;
}

export interface ChipPayoutItem extends BasePayoutItem {
  type: PayoutItemType.CHIP;
}

export interface SurveyPayoutItem extends BasePayoutItem {
  type: PayoutItemType.SURVEY;
  // ID of ranking stage if using ranking winner's survey answers for scoring
  // (else, leave null to use current participant survey answers for scoring)
  rankingStageId: string | null;
  // Map of question ID to payout amount if correct (or null if no payout)
  questionMap: Record<string, number | null>;
}

/** Participant settings for payout stage (e.g., random selection). */
export interface PayoutStageParticipantAnswer extends BaseStageParticipantAnswer {
  kind: StageKind.PAYOUT;
  // maps from random selection ID to ID of randomly selected payout item
  randomSelectionMap: Record<string, string>;
}

/** Payout result config (containing payout information for each item).
 * This contains all the results needed to appropriately display payout.
 */
export interface PayoutResultConfig {
  id: string; // stage ID of the original payout config
  currency: PayoutCurrency;
  results: PayoutItemResult[];
  averageAllPayoutItems: boolean;
}

export type PayoutItemResult =
  | DefaultPayoutItemResult
  | ChipPayoutItemResult
  | SurveyPayoutItemResult;

export interface BasePayoutItemResult {
  id: string;
  type: PayoutItemType;
  name: string;
  description: string;
  stageName: string;
  completedStage: boolean;
  baseCurrencyAmount: number;
  baseAmountEarned: number;
}

export interface DefaultPayoutItemResult extends BasePayoutItemResult {
  type: PayoutItemType.DEFAULT;
}

export interface ChipPayoutItemResult extends BasePayoutItemResult {
  type: PayoutItemType.CHIP;
  chipResults: ChipPayoutValueItem[];
  // TODO: Add field for whether to calculate based on
  // total chips at end vs. delta from starting chips?
}

export interface ChipPayoutValueItem {
  chip: ChipItem; // original chip
  quantity: number; // final quantity
  value: number; // value per chip
}

export interface SurveyPayoutItemResult extends BasePayoutItemResult {
  type: PayoutItemType.SURVEY;
  // public participant ID if ranking winner, null if self
  rankingWinner: string | null;
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
  config: Partial<PayoutStageConfig> = {},
): PayoutStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.PAYOUT,
    name: config.name ?? 'Payout',
    descriptions: config.descriptions ?? createStageTextConfig(),
    progress: config.progress ?? createStageProgressConfig(),
    currency: config.currency ?? PayoutCurrency.USD,
    payoutItems: config.payoutItems ?? [],
    averageAllPayoutItems: config.averageAllPayoutItems ?? false,
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
    baseCurrencyAmount: config.baseCurrencyAmount ?? 0,
    randomSelectionId: config.randomSelectionId ?? '',
  };
}

/** Create chip payout item. */
export function createChipPayoutItem(
  config: Partial<ChipPayoutItem> = {},
): ChipPayoutItem {
  return {
    id: config.id ?? generateId(),
    type: PayoutItemType.CHIP,
    name: config.name ?? '',
    description: config.description ?? '',
    isActive: config.isActive ?? true,
    stageId: config.stageId ?? '',
    baseCurrencyAmount: config.baseCurrencyAmount ?? 0,
    randomSelectionId: config.randomSelectionId ?? '',
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
    randomSelectionId: config.randomSelectionId ?? '',
    rankingStageId: config.rankingStageId ?? null,
    questionMap: config.questionMap ?? {},
  };
}

/** Create payout participant answer. */
export function createPayoutStageParticipantAnswer(
  stage: PayoutStageConfig,
): PayoutStageParticipantAnswer {
  return {
    id: stage.id,
    kind: StageKind.PAYOUT,
    randomSelectionMap: generatePayoutRandomSelectionMap(stage.payoutItems),
  };
}

/**
 * Return a map of random selection ID to the ID of a randomly selected payout
 * item (out of all the payout items with that random selection ID)
 */
export function generatePayoutRandomSelectionMap(
  payoutItems: PayoutItem[],
): Record<string, string> {
  const randomSelectionGroups: Record<string, string[]> = {};
  const payoutMap: Record<string, string> = {};

  // Group payout items by their random selection IDs (if applicable)
  payoutItems.forEach((item) => {
    const randomSelectionId = item.randomSelectionId;
    if (!randomSelectionId) return;

    if (!randomSelectionGroups[randomSelectionId]) {
      randomSelectionGroups[randomSelectionId] = [];
    }
    randomSelectionGroups[randomSelectionId].push(item.id);
  });

  // For each random selection ID, randomly select one payout item
  Object.keys(randomSelectionGroups).forEach((groupId) => {
    const items = randomSelectionGroups[groupId];
    const randomItem = items[Math.floor(Math.random() * items.length)];
    payoutMap[groupId] = randomItem;
  });

  return payoutMap;
}

/** Calculate payout results. */
export function calculatePayoutResult(
  payoutConfig: PayoutStageConfig,
  // Participant answer map contains random selection of relevant payout items
  payoutAnswer: PayoutStageParticipantAnswer,
  stageConfigMap: Record<string, StageConfig>, // stage ID to config
  publicDataMap: Record<string, StagePublicData>, // stage ID to public data
  profile: ParticipantProfile, // current participant profile
): PayoutResultConfig {
  const results: PayoutItemResult[] = [];

  // For each payout item, only add result to list if item is active;
  // if the payout item has a randomSelectionId,
  // only add the item if it was randomly selected for that participant
  payoutConfig.payoutItems.forEach((item) => {
    if (!item.isActive) {
      return;
    }
    if (
      item.randomSelectionId !== '' &&
      payoutAnswer.randomSelectionMap[item.randomSelectionId] !== item.id
    ) {
      return;
    }
    // Item is active and (if randomSelectionId) is selected
    const result = calculatePayoutItemResult(
      item,
      stageConfigMap,
      publicDataMap,
      profile,
    );
    if (result) {
      results.push(result);
    }
  });

  const resultConfig: PayoutResultConfig = {
    id: payoutConfig.id,
    currency: payoutConfig.currency,
    results,
    averageAllPayoutItems: payoutConfig.averageAllPayoutItems,
  };
  return resultConfig;
}

/** Calculate total payout from PayoutResultConfig. */
export function calculatePayoutTotal(resultConfig: PayoutResultConfig) {
  let total = 0;
  resultConfig.results.forEach((result) => {
    total += result.baseAmountEarned;
    if (result.type === PayoutItemType.SURVEY) {
      result.questionResults.forEach((question) => {
        total += question.amountEarned;
      });
    } else if (result.type === PayoutItemType.CHIP) {
      let chipTotal = 0;
      let initialChipTotal = 0;
      result.chipResults.forEach((result) => {
        chipTotal += Math.floor(result.quantity * result.value * 100) / 100;
        initialChipTotal +=
          Math.floor(result.chip.startingQuantity * result.value * 100) / 100;
      });
      total += Math.max(0, chipTotal - initialChipTotal);
    }
  });

  // If average all items, divide total by number of results
  if (resultConfig.averageAllPayoutItems) {
    return Math.ceil((total / resultConfig.results.length) * 100) / 100;
  }

  return Math.ceil(total * 100) / 100;
}

/** Calculate payout results for a single item (or null if can't calculate). */
export function calculatePayoutItemResult(
  item: PayoutItem,
  stageConfigMap: Record<string, StageConfig>,
  publicDataMap: Record<string, StagePublicData>,
  profile: ParticipantProfile, // current participant profile
): PayoutItemResult | null {
  if (!item.isActive) return null;

  switch (item.type) {
    case PayoutItemType.CHIP:
      return calculateChipPayoutItemResult(
        item,
        stageConfigMap,
        publicDataMap,
        profile,
      );
    case PayoutItemType.DEFAULT:
      return calculateDefaultPayoutItemResult(
        item,
        stageConfigMap,
        publicDataMap,
        profile,
      );
    case PayoutItemType.SURVEY:
      return calculateSurveyPayoutItemResult(
        item,
        stageConfigMap,
        publicDataMap,
        profile,
      );
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
): DefaultPayoutItemResult | null {
  if (!item.isActive) return null;

  const stage = stageConfigMap[item.stageId];
  if (!stage) return null;

  const stageTimestamp = profile.timestamps.completedStages[item.stageId];
  const completedStage =
    stageTimestamp !== null && stageTimestamp !== undefined;

  return {
    id: item.id,
    type: PayoutItemType.DEFAULT,
    name: item.name,
    description: item.description,
    stageName: stage.name,
    completedStage,
    baseCurrencyAmount: item.baseCurrencyAmount,
    baseAmountEarned: completedStage ? item.baseCurrencyAmount : 0,
  };
}

/** Calculate chip payout results for a single item (or null if can't calculate). */
export function calculateChipPayoutItemResult(
  item: ChipPayoutItem,
  stageConfigMap: Record<string, StageConfig>,
  publicDataMap: Record<string, StagePublicData>,
  profile: ParticipantProfile, // current participant profile
): ChipPayoutItemResult | null {
  if (!item.isActive) return null;

  // Get chip stage config
  const stage = stageConfigMap[item.stageId];
  if (!stage || stage.kind !== StageKind.CHIP) return null;
  if (!publicDataMap) return null;

  const stageTimestamp = profile.timestamps.completedStages[item.stageId];
  const completedStage =
    stageTimestamp !== null && stageTimestamp !== undefined;

  const publicChipData = publicDataMap[item.stageId];
  if (publicChipData?.kind !== StageKind.CHIP) return null;

  const chipResults: ChipPayoutValueItem[] = stage.chips.map((chip) => {
    if (!publicChipData.participantChipMap[profile.publicId]) {
      return {
        chip,
        quantity: 0,
        value: 0,
      };
    }
    const quantity = Number(
      publicChipData.participantChipMap[profile.publicId][chip.id] ?? 0,
    );
    const value = Number(
      publicChipData.participantChipValueMap[profile.publicId][chip.id] ?? 0,
    );
    return {
      chip,
      quantity,
      value,
    };
  });

  return {
    id: item.id,
    type: PayoutItemType.CHIP,
    name: item.name,
    description: item.description,
    stageName: stage.name,
    completedStage,
    baseCurrencyAmount: item.baseCurrencyAmount,
    baseAmountEarned: completedStage ? item.baseCurrencyAmount : 0,
    chipResults,
  };
}

/** Calculate survey payout results for a single item (or null if can't calculate). */
export function calculateSurveyPayoutItemResult(
  item: SurveyPayoutItem,
  stageConfigMap: Record<string, StageConfig>,
  publicDataMap: Record<string, StagePublicData>,
  profile: ParticipantProfile, // current participant profile
): SurveyPayoutItemResult | null {
  if (!item.isActive) return null;

  // Get survey stage config
  const stage = stageConfigMap[item.stageId];
  if (!stage || stage.kind !== StageKind.SURVEY) return null;

  const stageTimestamp = profile.timestamps.completedStages[item.stageId];
  const completedStage =
    stageTimestamp !== null && stageTimestamp !== undefined;

  // Get participant ID
  // If ranking stage ID is set, use ranking stage winner as participant
  const participantId = profile.publicId;
  let rankingWinner: string | null = null;
  if (item.rankingStageId) {
    const rankingStageData = publicDataMap[item.rankingStageId];
    if (rankingStageData && rankingStageData.kind === StageKind.RANKING) {
      rankingWinner = rankingStageData.winnerId;
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
      answerMap =
        surveyStageData.participantAnswerMap[rankingWinner ?? ''] ?? {};
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
      const answerId =
        answer && answer.kind === SurveyQuestionKind.MULTIPLE_CHOICE
          ? answer.choiceId
          : '';
      const amountEarned =
        answerId === question.correctAnswerId ? questionAmount : 0;
      const result: SurveyPayoutQuestionResult = {
        question,
        answerId,
        amountEarned,
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
    baseCurrencyAmount: item.baseCurrencyAmount,
    baseAmountEarned: completedStage ? item.baseCurrencyAmount : 0,
    rankingWinner,
    questionResults,
  };
}
