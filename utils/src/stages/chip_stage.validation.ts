import {Type, type Static} from '@sinclair/typebox';
import {UnifiedTimestampSchema} from '../shared.validation';
import {StageKind} from './stage';
import {
  StageTextConfigSchema,
  StageProgressConfigSchema,
} from './stage.validation';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

/** Chip item data. */
export const ChipItemData = Type.Object(
  {
    id: Type.String(),
    name: Type.String(),
    avatar: Type.String(),
    canBuy: Type.Boolean(),
    canSell: Type.Boolean(),
    startingQuantity: Type.Number(),
    lowerValue: Type.Number(),
    upperValue: Type.Number(),
  },
  {$id: 'ChipItem', ...strict},
);

/** Chip stage config data. */
export const ChipStageConfigData = Type.Object(
  {
    id: Type.String(),
    kind: Type.Literal(StageKind.CHIP),
    name: Type.String(),
    descriptions: Type.Ref(StageTextConfigSchema),
    progress: Type.Ref(StageProgressConfigSchema),
    enableChat: Type.Boolean(),
    numRounds: Type.Number(),
    chips: Type.Array(ChipItemData),
  },
  {$id: 'ChipStageConfig', ...strict},
);

/** Chip offer data. */
export const ChipOfferData = Type.Object(
  {
    id: Type.String(),
    round: Type.Number(),
    senderId: Type.String({minLength: 1}),
    buy: Type.Record(Type.String(), Type.Number()),
    sell: Type.Record(Type.String(), Type.Number()),
    timestamp: UnifiedTimestampSchema,
  },
  strict,
);

/** sendChipOffer endpoint data validation. */
export const SendChipOfferData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    participantPrivateId: Type.String({minLength: 1}),
    participantPublicId: Type.String({minLength: 1}),
    cohortId: Type.String({minLength: 1}),
    stageId: Type.String({minLength: 1}),
    chipOffer: ChipOfferData,
  },
  strict,
);

export type SendChipOfferData = Static<typeof SendChipOfferData>;

/** sendChipResponse endpoint data validation. */
export const SendChipResponseData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    participantPrivateId: Type.String({minLength: 1}),
    participantPublicId: Type.String({minLength: 1}),
    cohortId: Type.String({minLength: 1}),
    stageId: Type.String({minLength: 1}),
    chipResponse: Type.Boolean(),
  },
  strict,
);

export type SendChipResponseData = Static<typeof SendChipResponseData>;

/** setChipTurn endpoint data validation. */
export const SetChipTurnData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    cohortId: Type.String({minLength: 1}),
    stageId: Type.String({minLength: 1}),
  },
  strict,
);

export type SetChipTurnData = Static<typeof SetChipTurnData>;

/** requestChipAssistance endpoint data validation. */
export const RequestChipAssistanceData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    cohortId: Type.String({minLength: 1}),
    stageId: Type.String({minLength: 1}),
    participantId: Type.String({minLength: 1}),
    assistanceMode: Type.String({minLength: 1}),
    buyMap: Type.Optional(Type.Record(Type.String(), Type.Number())),
    sellMap: Type.Optional(Type.Record(Type.String(), Type.Number())),
    offerResponse: Type.Optional(Type.Boolean()),
  },
  strict,
);

export type RequestChipAssistanceData = Static<
  typeof RequestChipAssistanceData
>;
