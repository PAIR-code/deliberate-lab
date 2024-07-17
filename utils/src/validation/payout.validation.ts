import { Type } from '@sinclair/typebox';
import { PayoutBundleStrategy, PayoutItemKind } from '../types/payout.types';

/** Shorthand for strict TypeBox object validation */
const strict =  { additionalProperties: false } as const;

/** Rating survey payout item */
export const RatingSurveyPayoutItemData = Type.Object(
  {
    kind: Type.Literal(PayoutItemKind.RatingSurvey),
    fixedCurrencyAmount: Type.Number(),
    surveyStageId: Type.String({ minLength: 1 }),
    surveyQuestionIds: Type.Array(Type.Number()),
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
