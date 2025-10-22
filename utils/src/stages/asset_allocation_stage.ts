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

/** Asset allocation configuration (two stocks). */
export interface AssetAllocation {
  stockA: StockAllocation;
  stockB: StockAllocation;
}

/** Stock configuration for asset allocation (two stocks). */
export interface AssetAllocationStockInfoConfig {
  stockInfoStageId?: string; // Optional reference to StockInfo stage
  stockA: Stock;
  stockB: Stock;
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

/** 2+ asset allocation stage config. */
export interface MultiAssetAllocationStageConfig extends BaseStageConfig {
  kind: StageKind.MULTI_ASSET_ALLOCATION;
  // Ordered list of allocation options (used if stockInfoStageId is empty)
  stockOptions: Stock[];
  // If non-empty, the specified stock info stage will be used
  // to populate stock options (instead of the stockOptions field)
  stockInfoStageId: string;
  // TODO: Add additional options here, e.g., whether or not
  // sliders should automatically scale
}

/** 2+ asset allocation stage participant answer. */
export interface MultiAssetAllocationStageParticipantAnswer
  extends BaseStageParticipantAnswer {
  kind: StageKind.MULTI_ASSET_ALLOCATION;
  // Maps from stock ID to stock allocation
  allocationMap: Record<string, StockAllocation>;
  // Whether or not participant has locked in the allocation
  isConfirmed: boolean;
  confirmedTimestamp: UnifiedTimestamp | null;
}

export interface MultiAssetAllocationStagePublicData extends BaseStagePublicData {
  kind: StageKind.MULTI_ASSET_ALLOCATION;
  participantAnswerMap: Record<string, MultiAssetAllocationStageParticipantAnswer>;
}

export function createMultiAssetAllocationStagePublicData(
  config: Partial<MultiAssetAllocationStagePublicData> = {},
): MultiAssetAllocationStagePublicData {
  return {
    id: config.id ?? '',
    kind: StageKind.MULTI_ASSET_ALLOCATION,
    participantAnswerMap: config.participantAnswerMap ?? {},
  };
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
  };
}

/** Create asset allocation. */
export function createAssetAllocation(
  stockA: Stock,
  stockB: Stock,
  stockAPercentage: number = 50,
  stockBPercentage: number = 50,
): AssetAllocation {
  // Ensure percentages add up to 100
  const total = stockAPercentage + stockBPercentage;
  if (total !== 100) {
    return {
      stockA: {
        id: stockA.id,
        name: stockA.name,
        percentage: 50,
      },
      stockB: {
        id: stockB.id,
        name: stockB.name,
        percentage: 50,
      },
    };
  }

  return {
    stockA: {
      id: stockA.id,
      name: stockA.name,
      percentage: stockAPercentage,
    },
    stockB: {
      id: stockB.id,
      name: stockB.name,
      percentage: stockBPercentage,
    },
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

/** Create MultiAssetAllocation stage. */
export function createMultiAssetAllocationStage(
  config: Partial<MultiAssetAllocationStageConfig> = {},
): MultiAssetAllocationStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.MULTI_ASSET_ALLOCATION,
    name: config.name ?? 'Multi-Asset Allocation',
    descriptions:
      config.descriptions ??
      createStageTextConfig({
        infoText: 'Allocate your investment using the sliders.',
        helpText:
          'Adjust the sliders to set your desired allocation. The percentages must add up to 100%. Review the stock information on the right before confirming your allocation.',
      }),
    progress: config.progress ?? createStageProgressConfig(),
    stockInfoStageId: config.stockInfoStageId ?? '',
    stockOptions: config.stockOptions ?? [
      createStock({name: 'Stock A'}),
      createStock({name: 'Stock B'}),
    ],
  };
}
