import {Type} from '@sinclair/typebox';
import {StageKind} from './stage';
import {
  StageProgressConfigSchema,
  StageTextConfigSchema,
} from './stage.validation';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ************************************************************************* //
// StockInfo stage validation                                               //
// ************************************************************************* //

/** Stock data point validation. */
export const StockDataPointData = Type.Object(
  {
    date: Type.String({minLength: 1}),
    close: Type.Number(),
  },
  strict,
);

/** Stock info card validation. */
export const StockInfoCardData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    title: Type.String(),
    value: Type.String(),
    subtext: Type.String(),
    enabled: Type.Boolean(),
  },
  strict,
);

/** Stock validation. */
export const StockData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    name: Type.String({minLength: 1}),
    description: Type.String(),
    csvData: Type.String(),
    parsedData: Type.Array(StockDataPointData),
    customCards: Type.Array(StockInfoCardData),
  },
  {$id: 'Stock', ...strict},
);

/** StockInfo stage config validation. */
export const StockInfoStageConfigData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(StageKind.STOCKINFO),
    name: Type.String({minLength: 1}),
    descriptions: Type.Ref(StageTextConfigSchema),
    progress: Type.Ref(StageProgressConfigSchema),
    stocks: Type.Array(StockData),
    showBestYearCard: Type.Boolean(),
    showWorstYearCard: Type.Boolean(),
    introText: Type.Optional(Type.String()),
  },
  strict,
);
