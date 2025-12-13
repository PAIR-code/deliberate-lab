import {generateId} from '../shared';
import {parseStockData} from './stockinfo_stage.utils';
import {
  BaseStageConfig,
  BaseStageParticipantAnswer,
  StageKind,
  createStageTextConfig,
  createStageProgressConfig,
} from './stage';

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

/** Stock data point. */
export interface StockDataPoint {
  date: string;
  close: number;
}

/** Information card configuration. */
export interface StockInfoCard {
  id: string;
  title: string;
  value: string;
  subtext: string;
  enabled: boolean;
}

/** Stock configuration. */
export interface Stock {
  id: string;
  name: string;
  description: string;
  csvData: string; // CSV string with Date,Close columns
  parsedData: StockDataPoint[]; // Parsed data for calculations
  customCards: StockInfoCard[];
}

/** StockInfo stage config. */
export interface StockInfoStageConfig extends BaseStageConfig {
  kind: StageKind.STOCKINFO;
  stocks: Stock[];
  showBestYearCard: boolean;
  showWorstYearCard: boolean;
  requireViewAllStocks: boolean;
  useQuarterlyMarkers: boolean;
  showInvestmentGrowth: boolean;
}

/** StockInfo stage participant answer. */
export interface StockInfoStageParticipantAnswer extends BaseStageParticipantAnswer {
  kind: StageKind.STOCKINFO;
  viewedStockIds: string[];
  currentStockIndex: number;
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

export {parseStockData} from './stockinfo_stage.utils';

/** Create StockInfo stage participant answer. */
export function createStockInfoStageParticipantAnswer(
  stageId: string,
  config: Partial<StockInfoStageParticipantAnswer> = {},
): StockInfoStageParticipantAnswer {
  return {
    id: config.id ?? stageId,
    kind: StageKind.STOCKINFO,
    viewedStockIds: config.viewedStockIds ?? [],
    currentStockIndex: config.currentStockIndex ?? 0,
  };
}

/** Create stock info card. */
export function createStockInfoCard(
  config: Partial<StockInfoCard> = {},
): StockInfoCard {
  return {
    id: config.id ?? generateId(),
    title: config.title ?? '',
    value: config.value ?? '',
    subtext: config.subtext ?? '',
    enabled: config.enabled ?? true,
  };
}

/** Create stock. */
export function createStock(config: Partial<Stock> = {}): Stock {
  const csvData = config.csvData ?? '';
  const parsedData = csvData ? parseStockData(csvData) : [];

  return {
    id: config.id ?? generateId(),
    name: config.name ?? '',
    description: config.description ?? '',
    csvData,
    parsedData,
    customCards: config.customCards ?? [],
  };
}

/** Create StockInfo stage. */
export function createStockInfoStage(
  config: Partial<StockInfoStageConfig> = {},
): StockInfoStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.STOCKINFO,
    name: config.name ?? 'StockInfo',
    descriptions:
      config.descriptions ??
      createStageTextConfig({
        infoText:
          'Examine the stock data including performance metrics and price charts.',
        helpText:
          'Use the navigation buttons to switch between different stocks if multiple are available.',
      }),
    progress:
      config.progress ??
      createStageProgressConfig({
        minParticipants: 1,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      }),
    stocks: config.stocks ?? [createStock()],
    showBestYearCard: config.showBestYearCard ?? true,
    showWorstYearCard: config.showWorstYearCard ?? true,
    requireViewAllStocks: config.requireViewAllStocks ?? true,
    useQuarterlyMarkers: config.useQuarterlyMarkers ?? false,
    showInvestmentGrowth: config.showInvestmentGrowth ?? false,
  };
}
