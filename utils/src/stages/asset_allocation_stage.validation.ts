import {Type, type Static} from '@sinclair/typebox';
import {UnifiedTimestampSchema} from '../shared.validation';
import {StageKind} from './stage';
import {
  StageProgressConfigSchema,
  StageTextConfigSchema,
} from './stage.validation';
import {StockData} from './stockinfo_stage.validation';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ************************************************************************* //
// AssetAllocation stage validation                                          //
// ************************************************************************* //

/** Asset allocation validation. */
export const AssetAllocationData = Type.Object(
  {
    stockAPercentage: Type.Number({minimum: 0, maximum: 100}),
    stockBPercentage: Type.Number({minimum: 0, maximum: 100}),
  },
  strict,
);

/** Simple stock config validation. */
export const SimpleStockConfigData = Type.Object(
  {
    stockA: StockData,
    stockB: StockData,
  },
  strict,
);

/** AssetAllocation StockInfo config validation. */
export const AssetAllocationStockInfoConfigData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    stockAId: Type.String({minLength: 1}),
    stockBId: Type.String({minLength: 1}),
  },
  strict,
);

/** AssetAllocation stage config validation. */
export const AssetAllocationStageConfigData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    kind: Type.Literal(StageKind.ASSET_ALLOCATION),
    name: Type.String({minLength: 1}),
    descriptions: StageTextConfigSchema,
    progress: StageProgressConfigSchema,
    stockInfoStageConfig: Type.Union([
      AssetAllocationStockInfoConfigData,
      Type.Null(),
    ]),
    simpleStockConfig: Type.Union([SimpleStockConfigData, Type.Null()]),
  },
  strict,
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
