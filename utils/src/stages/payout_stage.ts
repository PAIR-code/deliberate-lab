import { generateId } from '../shared';
import {
  BaseStageConfig,
  StageGame,
  StageKind,
  createStageTextConfig,
  createStageProgressConfig,
} from './stage';

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