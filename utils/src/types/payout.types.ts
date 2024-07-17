/** Payout types */

export interface PayoutBundle {
  name: string;
  strategy: PayoutBundleStrategy;
  payoutItems: PayoutItem[];
}

export enum PayoutBundleStrategy {
  AddPayoutItems = 'AddPayoutItems', // add all payout items
  ChoosePayoutItem = 'ChoosePayoutItem', // choose one payout item
}

// Add other PayoutItem types later
export type PayoutItem = RatingSurveyPayoutItem;

export enum PayoutCurrency {
  USD = 'USD', // US dollar
  EUR = 'EUR', // Euro
}

export enum PayoutItemKind {
  RatingSurvey = 'RatingSurvey',
}

export interface BasePayoutItem {
  kind: PayoutItemKind;
  fixedCurrencyAmount: number; // fixed payout added to this item
}

// NOTE: Add general survey payout that allows experimenters to set
// different payout amounts per question answers (e.g., for a multiple
// choice survey question)?

export interface RatingSurveyPayoutItem extends BasePayoutItem {
  kind: PayoutItemKind.RatingSurvey;
  surveyStageId: string; // stage ID of survey with ranting questions
  surveyQuestionIds: number[]; // IDs of survey ranting questions to use
  currencyAmountPerQuestion: number; // e.g., 2 for $2 per survey question
  leaderStageId?: string; // stage ID for leader if using leader answers
}