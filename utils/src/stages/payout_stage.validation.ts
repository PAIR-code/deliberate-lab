import {Type, type Static} from '@sinclair/typebox';
import {StageKind} from './stage';
import {
  StageProgressConfigSchema,
  StageTextConfigSchema,
} from './stage.validation';
import {PayoutCurrency, PayoutItemType} from './payout_stage';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ************************************************************************* //
// writeExperiment, updateStageConfig endpoints                              //
// ************************************************************************* //

/** PayoutCurrency type validation. */
export const PayoutCurrencySchema = Type.Union([
  Type.Literal(PayoutCurrency.EUR),
  Type.Literal(PayoutCurrency.GBP),
  Type.Literal(PayoutCurrency.USD),
]);

/** DefaultPayoutItem input validation. */
export const DefaultPayoutItemData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    type: Type.Literal(PayoutItemType.DEFAULT),
    name: Type.String(),
    description: Type.String(),
    isActive: Type.Boolean(),
    stageId: Type.String(),
    baseCurrencyAmount: Type.Number(),
    randomSelectionId: Type.String(),
  },
  {...strict, $id: 'DefaultPayoutItem'},
);

/** ChipPayoutItem input validation. */
export const ChipPayoutItemData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    type: Type.Literal(PayoutItemType.CHIP),
    name: Type.String(),
    description: Type.String(),
    isActive: Type.Boolean(),
    stageId: Type.String(),
    baseCurrencyAmount: Type.Number(),
  },
  {...strict, $id: 'ChipPayoutItem'},
);

/** SurveyPayoutItem input validation. */
export const SurveyPayoutItemData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    type: Type.Literal(PayoutItemType.SURVEY),
    name: Type.String(),
    description: Type.String(),
    isActive: Type.Boolean(),
    stageId: Type.String(),
    baseCurrencyAmount: Type.Number(),
    rankingStageId: Type.Union([Type.Null(), Type.String()]),
    questionMap: Type.Record(
      Type.String(),
      Type.Union([Type.Number(), Type.Null()]),
    ),
  },
  {...strict, $id: 'SurveyPayoutItem'},
);

/** PayoutItem input validation. */
export const PayoutItemData = Type.Union([
  DefaultPayoutItemData,
  ChipPayoutItemData,
  SurveyPayoutItemData,
]);

/** PayoutStageConfig input validation. */
export const PayoutStageConfigData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(StageKind.PAYOUT),
    name: Type.String({minLength: 1}),
    descriptions: Type.Ref(StageTextConfigSchema),
    progress: Type.Ref(StageProgressConfigSchema),
    currency: PayoutCurrencySchema,
    payoutItems: Type.Array(PayoutItemData),
    averageAllPayoutItems: Type.Boolean(),
  },
  {...strict, $id: 'PayoutStageConfig'},
);
