import { Type, type Static } from '@sinclair/typebox';
import { UnifiedTimestampSchema } from '../shared.validation';
import { StageKind } from './stage';
import {
  StageGameSchema,
  StageTextConfigSchema,
  StageProgressConfigSchema,
} from './stage.validation';

/** Shorthand for strict TypeBox object validation */
const strict = { additionalProperties: false } as const;

/** Chip item data. */
export const ChipItemData = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    canBuy: Type.Boolean(),
    canSell: Type.Boolean(),
    quantity: Type.Number(),
  },
  strict
);

/** Chip stage config data. */
export const ChipStageConfigData = Type.Object(
  {
    id: Type.String(),
    kind: Type.Literal(StageKind.CHIP),
    game: StageGameSchema,
    name: Type.String(),
    descriptions: StageTextConfigSchema,
    progress: StageProgressConfigSchema,
    isPrivateOffers: Type.Boolean(),
    chips: Type.Array(ChipItemData),
  },
  strict
);