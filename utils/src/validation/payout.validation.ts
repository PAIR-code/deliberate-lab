import { Type } from '@sinclair/typebox';
import {
  PayoutBundleStrategy,
  PayoutItemKind,
  PayoutItemStrategy
} from '../types/payout.types';

/** Shorthand for strict TypeBox object validation */
const strict =  { additionalProperties: false } as const;

/** Rating survey payout item */
export const RatingSurveyPayoutItemData = Type.Object(
  {
    kind: Type.Literal(PayoutItemKind.RatingSurvey),
    strategy: Type.Union([
      Type.Literal(PayoutItemStrategy.AddAll),
      Type.Literal(PayoutItemStrategy.ChooseOne)
    ]),
    fixedCurrencyAmount: Type.Number(),
    surveyStageId: Type.String({ minLength: 1 }),
    currencyAmountPerQuestion: Type.Number(),
    leaderStageId: Type.Optional(Type.String()),
  },
  strict,
);

/** Payout bundle */
export const PayoutBundleData = Type.Object(
  {
    name: Type.String(),
    strategy: Type.Union([
      Type.Literal(PayoutBundleStrategy.AddPayoutItems),
      Type.Literal(PayoutBundleStrategy.ChoosePayoutItem),
    ]),
    payoutItems: Type.Array(
      Type.Union([
        RatingSurveyPayoutItemData,
      ]),
    ),
  },
  strict
);

/** Scoring question */
export const ScoringQuestionData = Type.Object(
  {
    id: Type.Number(),
    questionText: Type.String(),
    questionOptions: Type.Array(Type.String()),
    answer: Type.String(),
  },
  strict
);

/** Scoring item */
export const ScoringItemData = Type.Object(
  {
    fixedCurrencyAmount: Type.Number(),
    surveyStageId: Type.String({ minLength: 1 }),
    currencyAmountPerQuestion: Type.Number(),
    leaderStageId: Type.Optional(Type.String()),
    questions: Type.Array(ScoringQuestionData),
  },
  strict
);

/** Scoring bundle */
export const ScoringBundleData = Type.Object(
  {
    name: Type.String(),
    scoringItems: Type.Array(ScoringItemData),
  },
  strict
);
