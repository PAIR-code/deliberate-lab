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

/** Simple stock configuration for asset allocation. */
export interface SimpleStockConfig {
  stockA: Stock;
  stockB: Stock;
}

/** Asset allocation configuration. */
export interface AssetAllocation {
  stockAPercentage: number; // 0-100
  stockBPercentage: number; // 0-100
}

/** StockInfo stage reference for asset allocation. */
export interface AssetAllocationStockInfoConfig {
  id: string;
  stockAId: string;
  stockBId: string;
}

/** AssetAllocation stage config. */
export interface AssetAllocationStageConfig extends BaseStageConfig {
  kind: StageKind.ASSET_ALLOCATION;
  stockInfoStageConfig: AssetAllocationStockInfoConfig | null; // Reference to StockInfo stage with stock IDs
  simpleStockConfig: SimpleStockConfig | null; // Simple stock configuration when not using StockInfo stage
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

/** Create simple stock config with both stocks. */
export function createSimpleStockConfig(
  config: Partial<SimpleStockConfig> = {},
): SimpleStockConfig {
  return {
    stockA: config.stockA ?? createStock({name: 'Stock A'}),
    stockB: config.stockB ?? createStock({name: 'Stock B'}),
  };
}

/** Create asset allocation. */
export function createAssetAllocation(
  config: Partial<AssetAllocation> = {},
): AssetAllocation {
  const stockAPercentage = config.stockAPercentage ?? 50;
  const stockBPercentage = config.stockBPercentage ?? 50;

  // Ensure percentages add up to 100
  const total = stockAPercentage + stockBPercentage;
  if (total !== 100) {
    return {
      stockAPercentage: 50,
      stockBPercentage: 50,
    };
  }

  return {
    stockAPercentage,
    stockBPercentage,
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
          'Allocate your investment between two stocks using the sliders.',
        helpText:
          'Adjust the sliders to set your desired allocation. The percentages must add up to 100%. Review the stock information on the right before confirming your allocation.',
      }),
    progress:
      config.progress ??
      createStageProgressConfig({
        minParticipants: 1,
        waitForAllParticipants: false,
        showParticipantProgress: true,
      }),
    stockInfoStageConfig: config.stockInfoStageConfig ?? null,
    simpleStockConfig:
      config.simpleStockConfig ??
      (config.stockInfoStageConfig ? null : createSimpleStockConfig()),
  };
}

/** Create AssetAllocation participant answer. */
export function createAssetAllocationStageParticipantAnswer(
  config: Partial<AssetAllocationStageParticipantAnswer> = {},
): AssetAllocationStageParticipantAnswer {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.ASSET_ALLOCATION,
    allocation: config.allocation ?? createAssetAllocation(),
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
