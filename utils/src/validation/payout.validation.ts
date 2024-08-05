import { Type } from '@sinclair/typebox';
import {
  PayoutBundleStrategy,
  PayoutItemKind,
  PayoutItemStrategy
} from '../types/payout.types';

/** Shorthand for strict TypeBox object validation */
const strict =  { additionalProperties: false } as const;

/** Lost at Sea survey payout item */
export const LostAtSeaSurveyPayoutItemData = Type.Object(
  {
    name: Type.String(),
    description: Type.String(),
    kind: Type.Literal(PayoutItemKind.LostAtSeaSurvey),
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
    description: Type.String(),
    strategy: Type.Union([
      Type.Literal(PayoutBundleStrategy.AddPayoutItems),
      Type.Literal(PayoutBundleStrategy.ChoosePayoutItem),
    ]),
    payoutItems: Type.Array(
      Type.Union([
        LostAtSeaSurveyPayoutItemData,
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
    name: Type.String(),
    description: Type.String(),
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
    description: Type.String(),
    scoringItems: Type.Array(ScoringItemData),
  },
  strict
);
