import {Type, type Static} from '@sinclair/typebox';
import {UnifiedTimestampSchema} from '../shared.validation';
import {StageKind} from './stage';
import {
  StageTextConfigSchema,
  StageProgressConfigSchema,
} from './stage.validation';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

/** Bargain stage config data. */
export const BargainStageConfigData = Type.Object(
  {
    id: Type.String(),
    kind: Type.Literal(StageKind.BARGAIN),
    name: Type.String(),
    descriptions: StageTextConfigSchema,
    progress: StageProgressConfigSchema,
    itemName: Type.String(),
    buyerValuationMin: Type.Number(),
    buyerValuationMax: Type.Number(),
    sellerValuationMin: Type.Number(),
    sellerValuationMax: Type.Number(),
    maxTurns: Type.Number(),
    enableChat: Type.Boolean(),
    showSellerValuationToBuyer: Type.Boolean(),
    showBuyerValuationToSeller: Type.Boolean(),
  },
  strict,
);

export type BargainStageConfigData = Static<typeof BargainStageConfigData>;

/** Bargain offer data. */
export const BargainOfferData = Type.Object(
  {
    id: Type.String(),
    turnNumber: Type.Number(),
    senderId: Type.String({minLength: 1}),
    price: Type.Number(),
    message: Type.String(),
    timestamp: UnifiedTimestampSchema,
  },
  strict,
);

export type BargainOfferData = Static<typeof BargainOfferData>;

/** sendBargainOffer endpoint data validation. */
export const SendBargainOfferData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    participantPrivateId: Type.String({minLength: 1}),
    participantPublicId: Type.String({minLength: 1}),
    cohortId: Type.String({minLength: 1}),
    stageId: Type.String({minLength: 1}),
    price: Type.Number(),
    message: Type.String(),
  },
  strict,
);

export type SendBargainOfferData = Static<typeof SendBargainOfferData>;

/** sendBargainResponse endpoint data validation. */
export const SendBargainResponseData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    participantPrivateId: Type.String({minLength: 1}),
    participantPublicId: Type.String({minLength: 1}),
    cohortId: Type.String({minLength: 1}),
    stageId: Type.String({minLength: 1}),
    accept: Type.Boolean(),
    message: Type.String(),
  },
  strict,
);

export type SendBargainResponseData = Static<typeof SendBargainResponseData>;

/** initializeBargain endpoint data validation. */
export const InitializeBargainData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    cohortId: Type.String({minLength: 1}),
    stageId: Type.String({minLength: 1}),
  },
  strict,
);

export type InitializeBargainData = Static<typeof InitializeBargainData>;
