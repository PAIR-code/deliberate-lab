/** Payout types */

export interface PayoutBundle {
  name: string;
  strategy: PayoutBundleStrategy;
  payoutItems: PayoutItem[];
}

export enum PayoutBundleStrategy {
  AddPayoutItems = 'AddPayoutItems', // add all payout items
  ChoosePayoutItem = 'ChoosePayoutItem', // randomly choose one payout item
}

// Add other PayoutItem types later
export type PayoutItem = LostAtSeaSurveyPayoutItem;

export enum PayoutCurrency {
  USD = 'USD', // US dollar
  EUR = 'EUR', // Euro
}

export enum PayoutItemKind {
  LostAtSeaSurvey = 'LostAtSeaSurvey',
}

export interface BasePayoutItem {
  kind: PayoutItemKind;
  fixedCurrencyAmount: number; // fixed payout added to this item
}

// NOTE: Add general survey payout that allows experimenters to set
// different payout amounts per question answers (e.g., for a multiple
// choice survey question)?

export enum PayoutItemStrategy {
  AddAll = 'AddAll', // use all questions for scoring
  ChooseOne = 'ChooseOne', // randomly choose one question to score
}

export interface LostAtSeaSurveyPayoutItem extends BasePayoutItem {
  kind: PayoutItemKind.LostAtSeaSurvey;
  strategy: PayoutItemStrategy;
  surveyStageId: string; // stage ID of Lost at Sea survey
  currencyAmountPerQuestion: number; // e.g., 2 for $2 per survey question
  leaderStageId?: string; // stage ID for leader if using leader answers
}

export interface ScoringBundle {
  name: string;
  scoringItems: ScoringItem[];
}

export interface ScoringItem {
  fixedCurrencyAmount: number; // fixed payout added to this item
  currencyAmountPerQuestion: number;
  questions: ScoringQuestion[];
  surveyStageId: string; // stage ID of survey with ranting questions
  leaderStageId?: string; // stage ID for leader if using leader answers
}

export interface ScoringQuestion {
  id: number;
  questionText: string;
  questionOptions: string[];
  answer: string;
}