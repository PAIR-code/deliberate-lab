import {Type, type Static} from '@sinclair/typebox';
import {UnifiedTimestampSchema} from '../shared.validation';
import {StageKind} from './stage';
import {BaseStageConfigSchema} from './stage.schemas';
import {StockData} from './stockinfo_stage.validation';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ************************************************************************* //
// AssetAllocation stage validation                                          //
// ************************************************************************* //

/** Stock allocation validation. */
export const StockAllocationData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    name: Type.String({minLength: 1}),
    percentage: Type.Number({minimum: 0, maximum: 100}),
  },
  {$id: 'StockAllocation', ...strict},
);

/** Asset allocation validation. */
export const AssetAllocationData = Type.Object(
  {
    stockA: StockAllocationData,
    stockB: StockAllocationData,
  },
  strict,
);

/** AssetAllocation stock config validation. */
export const AssetAllocationStockInfoConfigData = Type.Object(
  {
    stockInfoStageId: Type.Optional(Type.String({minLength: 1})),
    stockAId: Type.Optional(Type.String()),
    stockBId: Type.Optional(Type.String()),
    stockA: Type.Optional(StockData),
    stockB: Type.Optional(StockData),
  },
  strict,
);

/** AssetAllocation stage config validation. */
export const AssetAllocationStageConfigData = Type.Composite(
  [
    BaseStageConfigSchema,
    Type.Object(
      {
        kind: Type.Literal(StageKind.ASSET_ALLOCATION),
        stockConfig: AssetAllocationStockInfoConfigData,
      },
      strict,
    ),
  ],
  {$id: 'AssetAllocationStageConfig', ...strict},
);

/** AssetAllocation stage participant answer validation. */
export const AssetAllocationStageParticipantAnswerData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(StageKind.ASSET_ALLOCATION),
    allocation: AssetAllocationData,
    confirmed: Type.Boolean(),
    timestamp: UnifiedTimestampSchema,
  },
  strict,
);

/** AssetAllocation stage public data validation. */
export const AssetAllocationStagePublicDataData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(StageKind.ASSET_ALLOCATION),
    participantAllocations: Type.Record(Type.String(), AssetAllocationData),
  },
  strict,
);

/** MultiAssetAllocation validation. */
export const MultiAssetAllocationStageConfigData = Type.Composite(
  [
    BaseStageConfigSchema,
    Type.Object(
      {
        kind: Type.Literal(StageKind.MULTI_ASSET_ALLOCATION),
        stockOptions: Type.Array(StockData),
        stockInfoStageId: Type.String(),
      },
      strict,
    ),
  ],
  {$id: 'MultiAssetAllocationStageConfig', ...strict},
);

/** MultiAssetAllocation stage participant answer validation. */
export const MultiAssetAllocationStageParticipantAnswerData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(StageKind.MULTI_ASSET_ALLOCATION),
    allocationMap: Type.Record(Type.String(), StockAllocationData),
    isConfirmed: Type.Boolean(),
    confirmedTimestamp: Type.Union([UnifiedTimestampSchema, Type.Null()]),
  },
  strict,
);

// ************************************************************************* //
// API endpoint validation                                                   //
// ************************************************************************* //

export const UpdateAssetAllocationStageParticipantAnswerData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    participantPrivateId: Type.String({minLength: 1}),
    stageId: Type.String({minLength: 1}),
    allocation: AssetAllocationData,
    confirmed: Type.Boolean(),
  },
  strict,
);

export type UpdateAssetAllocationStageParticipantAnswerData = Static<
  typeof UpdateAssetAllocationStageParticipantAnswerData
>;

export const UpdateMultiAssetAllocationStageParticipantAnswerData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    participantPrivateId: Type.String({minLength: 1}),
    stageId: Type.String({minLength: 1}),
    answer: MultiAssetAllocationStageParticipantAnswerData,
  },
  strict,
);

export type UpdateMultiAssetAllocationStageParticipantAnswerData = Static<
  typeof UpdateMultiAssetAllocationStageParticipantAnswerData
>;
