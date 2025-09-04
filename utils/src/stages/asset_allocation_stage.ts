import {Timestamp} from 'firebase/firestore';
import {generateId, UnifiedTimestamp} from '../shared';
import {
  BaseStageConfig,
  BaseStageParticipantAnswer,
  BaseStagePublicData,
  StageKind,
  createStageTextConfig,
  createStageProgressConfig,
} from './stage';
import {Stock, createStock} from './stockinfo_stage';

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

/** Stock allocation details. */
export interface StockAllocation {
  id: string;
  name: string;
  percentage: number; // 0-100
}

/** Asset allocation configuration. */
export interface AssetAllocation {
  stockA: StockAllocation;
  stockB: StockAllocation;
  additionalAllocations?: StockAllocation[];
}

/** Stock configuration for asset allocation. */
export interface AssetAllocationStockInfoConfig {
  stockInfoStageId?: string; // Optional reference to StockInfo stage
  stockA: Stock;
  stockB: Stock;
  additionalStocks?: Stock[];
}

/** AssetAllocation stage config. */
export interface AssetAllocationStageConfig extends BaseStageConfig {
  kind: StageKind.ASSET_ALLOCATION;
  stockConfig: AssetAllocationStockInfoConfig;
}

/** AssetAllocation stage participant answer. */
export interface AssetAllocationStageParticipantAnswer
  extends BaseStageParticipantAnswer {
  kind: StageKind.ASSET_ALLOCATION;
  allocation: AssetAllocation;
  confirmed: boolean;
  timestamp: UnifiedTimestamp;
}

/** AssetAllocation stage public data. */
export interface AssetAllocationStagePublicData extends BaseStagePublicData {
  kind: StageKind.ASSET_ALLOCATION;
  participantAllocations: Record<string, AssetAllocation>; // participantId -> allocation
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create stock config for asset allocation. */
export function createAssetAllocationStockInfoConfig(
  config: Partial<AssetAllocationStockInfoConfig> = {},
): AssetAllocationStockInfoConfig {
  return {
    stockInfoStageId: config.stockInfoStageId,
    stockA: config.stockA ?? createStock({name: 'Stock A'}),
    stockB: config.stockB ?? createStock({name: 'Stock B'}),
    additionalStocks: config.additionalStocks,
  };
}

/** Create asset allocation from a list of stocks and percentages. */
export function createAssetAllocation(
  stocks: Stock[],
  percentages: number[],
): AssetAllocation {
  // Ensure we have at least 2 stocks
  if (stocks.length < 2) {
    throw new Error('Asset allocation requires at least two stocks.');
  }

  const allAllocations = stocks.map((stock, index) => ({
    id: stock.id,
    name: stock.name,
    percentage: percentages[index] ?? 0,
  }));

  const total = allAllocations.reduce((sum, p) => sum + p.percentage, 0);

  // If percentages don't sum to 100, create an equal distribution as a fallback
  if (total !== 100 || stocks.length !== percentages.length) {
    const equalPercentage = 100 / stocks.length;
    const equalAllocations = stocks.map((stock) => ({
      id: stock.id,
      name: stock.name,
      percentage: equalPercentage,
    }));
    return {
      stockA: equalAllocations[0],
      stockB: equalAllocations[1],
      additionalAllocations: equalAllocations.slice(2),
    };
  }

  return {
    stockA: allAllocations[0],
    stockB: allAllocations[1],
    additionalAllocations: allAllocations.slice(2),
  };
}

/** Create AssetAllocation stage. */
export function createAssetAllocationStage(
  config: Partial<AssetAllocationStageConfig> = {},
): AssetAllocationStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.ASSET_ALLOCATION,
    name: config.name ?? 'Asset Allocation',
    descriptions:
      config.descriptions ??
      createStageTextConfig({
        infoText:
          'Allocate your investment between the options using the sliders.',
        helpText:
          'Adjust the sliders to set your desired allocation. The percentages must add up to 100%. Review the information on the right before confirming your allocation.',
      }),
    progress:
      config.progress ??
      createStageProgressConfig({
        minParticipants: 1,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      }),
    stockConfig: config.stockConfig ?? createAssetAllocationStockInfoConfig(),
  };
}

/** Create AssetAllocation participant answer. */
export function createAssetAllocationStageParticipantAnswer(
  config: Partial<AssetAllocationStageParticipantAnswer> & {
    allocation: AssetAllocation;
  },
): AssetAllocationStageParticipantAnswer {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.ASSET_ALLOCATION,
    allocation: config.allocation,
    confirmed: config.confirmed ?? false,
    timestamp: config.timestamp ?? Timestamp.now(),
  };
}

/** Create AssetAllocation public data. */
export function createAssetAllocationStagePublicData(
  config: Partial<AssetAllocationStagePublicData> = {},
): AssetAllocationStagePublicData {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.ASSET_ALLOCATION,
    participantAllocations: config.participantAllocations ?? {},
  };
}
