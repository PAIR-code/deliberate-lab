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
    avatar: Type.String(),
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
    enableChat: Type.Boolean(),
    numRounds: Type.Number(),
    chips: Type.Array(ChipItemData),
  },
  strict
);

/** Chip offer data. */
export const ChipOfferData = Type.Object(
  {
    id: Type.String(),
    round: Type.Number(),
    senderId: Type.String({ minLength: 1 }),
    buy: Type.Record(Type.String(), Type.Number()),
    sell: Type.Record(Type.String(), Type.Number()),
    timestamp: UnifiedTimestampSchema,
  },
  strict
);

/** sendChipOffer endpoint data validation. */
export const SendChipOfferData = Type.Object(
  {
    experimentId: Type.String({ minLength: 1 }),
    participantPrivateId: Type.String({ minLength: 1 }),
    participantPublicId: Type.String({ minLength: 1 }),
    cohortId: Type.String({ minLength: 1 }),
    stageId: Type.String({ minLength: 1 }),
    chipOffer: ChipOfferData,
  },
  strict
);

export type SendChipOfferData = Static<typeof SendChipOfferData>;

/** sendChipResponse endpoint data validation. */
export const SendChipResponseData = Type.Object(
  {
    experimentId: Type.String({ minLength: 1 }),
    participantPrivateId: Type.String({ minLength: 1 }),
    participantPublicId: Type.String({ minLength: 1 }),
    cohortId: Type.String({ minLength: 1 }),
    stageId: Type.String({ minLength: 1 }),
    chipResponse: Type.Boolean(),
  },
  strict
);

export type SendChipResponseData = Static<typeof SendChipResponseData>;

/** setChipTurn endpoint data validation. */
export const SetChipTurnData = Type.Object(
  {
    experimentId: Type.String({ minLength: 1 }),
    cohortId: Type.String({ minLength: 1 }),
    stageId: Type.String({ minLength: 1 }),
  },
  strict
);

export type SetChipTurnData = Static<typeof SetChipTurnData>;