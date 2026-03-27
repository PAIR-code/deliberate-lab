import {Type} from '@sinclair/typebox';
import {StageKind} from './stage';
import {BaseStageConfigSchema} from './stage.schemas';

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
export const StockInfoStageConfigData = Type.Composite(
  [
    BaseStageConfigSchema,
    Type.Object(
      {
        kind: Type.Literal(StageKind.STOCKINFO),
        stocks: Type.Array(StockData),
        visibleStockIds: Type.Optional(Type.Array(Type.String())),
        showBestYearCard: Type.Boolean(),
        showWorstYearCard: Type.Boolean(),
        requireViewAllStocks: Type.Boolean(),
        useQuarterlyMarkers: Type.Boolean(),
        showInvestmentGrowth: Type.Boolean(),
        useSharedYAxis: Type.Boolean(),
        initialInvestment: Type.Number({minimum: 1, default: 1000}),
        currency: Type.String({default: 'USD'}),
        introText: Type.Optional(Type.String()),
      },
      strict,
    ),
  ],
  {$id: 'StockInfoStageConfig', ...strict},
);
