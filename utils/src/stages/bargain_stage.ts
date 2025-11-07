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

/** Bilateral bargaining stage types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

/**
 * BargainStageConfig.
 *
 * This is saved as a stage doc under experiments/{experimentId}/stages
 */
export interface BargainStageConfig extends BaseStageConfig {
  kind: StageKind.BARGAIN;
  // Name of item being bargained over
  itemName: string;
  // Valuation range for buyer (buyer value >= seller value)
  buyerValuationMin: number;
  buyerValuationMax: number;
  // Valuation range for seller
  sellerValuationMin: number;
  sellerValuationMax: number;
  // Maximum number of turns before negotiation ends (randomly assigned from [6, 8, 10, 12])
  maxTurns: number;
  // Allow participants to chat during negotiation (randomly assigned)
  enableChat: boolean;
  // Whether to show seller's valuation range to buyer (randomly assigned)
  // If true: buyer sees "Values between ${sellerValuationMin} - ${sellerValuationMax}"
  // If false: buyer sees "You have no idea"
  showSellerValuationToBuyer: boolean;
  // Whether to show buyer's valuation range to seller (randomly assigned)
  // If true: seller sees "Values between ${buyerValuationMin} - ${buyerValuationMax}"
  // If false: seller sees "You have no idea"
  showBuyerValuationToSeller: boolean;
}

/** Bargaining roles. */
export enum BargainRole {
  BUYER = 'buyer',
  SELLER = 'seller',
  BYSTANDER = 'bystander',
}

/**
 * BargainStageParticipantAnswer.
 *
 * This is saved as a stage doc (with stage ID as doc ID) under
 * experiments/{experimentId}/participants/{participantPrivateId}/stageData
 */
export interface BargainStageParticipantAnswer extends BaseStageParticipantAnswer {
  kind: StageKind.BARGAIN;
  // Participant's private valuation for the item
  valuation: number;
  // Whether this participant makes the first move
  makeFirstMove: boolean;
  // Information shown to this participant about opponent's valuation
  // Either "Values between $6 - $12" or "You have no idea" (calculated from config)
  opponentInfo: string;
}

/** Bargain offer. */
export interface BargainOffer {
  id: string; // offer ID
  turnNumber: number; // turn number in negotiation (1-indexed)
  senderId: string; // public ID of participant sending the offer
  price: number; // proposed price for the item
  message: string; // optional chat message with the offer
  timestamp: Timestamp;
}

/** Bargain offer response. */
export interface BargainOfferResponse {
  response: boolean; // true = accept, false = reject
  message: string; // optional chat message with the response
  timestamp: Timestamp;
}

/** Bargain transaction (offer + response). */
export interface BargainTransaction {
  offer: BargainOffer;
  response: BargainOfferResponse | null;
  status: BargainTransactionStatus;
}

/** Bargain transaction status. */
export enum BargainTransactionStatus {
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  PENDING = 'PENDING',
}

/**
 * BargainStagePublicData
 *
 * This is saved as a stage doc (with stage ID as doc ID) under
 * experiments/{experimentId}/cohorts/{cohortId}/publicStageData
 */
export interface BargainStagePublicData extends BaseStagePublicData {
  kind: StageKind.BARGAIN;
  // True once negotiation ends (max turns reached or offer accepted)
  isGameOver: boolean;
  // Current turn number (1-indexed, max = maxTurns)
  currentTurn: number;
  // Maximum number of turns for this game
  maxTurns: number;
  // Whether chat is enabled for this game
  chatEnabled: boolean;
  // Public ID of participant whose turn it is to make an offer
  currentOfferer: string | null;
  // Buyer's public ID
  buyerId: string | null;
  // Seller's public ID
  sellerId: string | null;
  // Mapping from participant public ID to their role
  participantRoles: Record<string, BargainRole>;
  // Ordered list of all transactions in this negotiation
  transactions: BargainTransaction[];
  // If a deal was reached, the agreed price; otherwise null
  agreedPrice: number | null;
}

/** Bargain log entry. */
export type BargainLogEntry =
  | BargainStartLogEntry
  | BargainOfferLogEntry
  | BargainResponseLogEntry
  | BargainDealLogEntry
  | BargainNoDealLogEntry
  | BargainInfoLogEntry
  | BargainErrorLogEntry;

export interface BaseBargainLogEntry {
  type: BargainLogType;
  timestamp: UnifiedTimestamp;
}

/** Bargain log type. */
export enum BargainLogType {
  START = 'start', // negotiation started
  OFFER = 'offer', // new offer posted
  RESPONSE = 'response', // response to offer (accept/reject)
  DEAL = 'deal', // deal reached
  NO_DEAL = 'noDeal', // max turns reached without deal
  INFO = 'info', // info message
  ERROR = 'error', // error message
}

export interface BargainStartLogEntry extends BaseBargainLogEntry {
  type: BargainLogType.START;
  buyerId: string;
  sellerId: string;
  firstOfferer: string;
}

export interface BargainOfferLogEntry extends BaseBargainLogEntry {
  type: BargainLogType.OFFER;
  offer: BargainOffer;
}

export interface BargainResponseLogEntry extends BaseBargainLogEntry {
  type: BargainLogType.RESPONSE;
  responderId: string;
  response: BargainOfferResponse;
}

export interface BargainDealLogEntry extends BaseBargainLogEntry {
  type: BargainLogType.DEAL;
  price: number;
  finalTurn: number;
}

export interface BargainNoDealLogEntry extends BaseBargainLogEntry {
  type: BargainLogType.NO_DEAL;
  maxTurnsReached: number;
}

export interface BargainInfoLogEntry extends BaseBargainLogEntry {
  type: BargainLogType.INFO;
  infoMessage: string;
}

export interface BargainErrorLogEntry extends BaseBargainLogEntry {
  type: BargainLogType.ERROR;
  errorMessage: string;
}

// ************************************************************************* //
// HELPER FUNCTIONS                                                          //
// ************************************************************************* //

/** Create bargain stage. */
export function createBargainStage(
  config: Partial<BargainStageConfig> = {},
): BargainStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.BARGAIN,
    name: config.name ?? 'Bargaining game',
    descriptions: config.descriptions ?? createStageTextConfig(),
    progress:
      config.progress ??
      createStageProgressConfig({
        minParticipants: 2,
        waitForAllParticipants: true,
      }),
    itemName: config.itemName ?? 'item',
    buyerValuationMin: config.buyerValuationMin ?? 6,
    buyerValuationMax: config.buyerValuationMax ?? 12,
    sellerValuationMin: config.sellerValuationMin ?? 6,
    sellerValuationMax: config.sellerValuationMax ?? 12,
    maxTurns: config.maxTurns ?? 8,
    enableChat: config.enableChat ?? false,
    showSellerValuationToBuyer: config.showSellerValuationToBuyer ?? false,
    showBuyerValuationToSeller: config.showBuyerValuationToSeller ?? false,
  };
}

/** Create bargain offer. */
export function createBargainOffer(
  config: Partial<BargainOffer> = {},
): BargainOffer {
  return {
    id: config.id ?? generateId(),
    turnNumber: config.turnNumber ?? 1,
    senderId: config.senderId ?? '',
    price: config.price ?? 0,
    message: config.message ?? '',
    timestamp: config.timestamp ?? Timestamp.now(),
  };
}

/** Create bargain offer response. */
export function createBargainOfferResponse(
  config: Partial<BargainOfferResponse> = {},
): BargainOfferResponse {
  return {
    response: config.response ?? false,
    message: config.message ?? '',
    timestamp: config.timestamp ?? Timestamp.now(),
  };
}

/** Create bargain transaction. */
export function createBargainTransaction(
  offer: BargainOffer,
): BargainTransaction {
  return {
    offer,
    response: null,
    status: BargainTransactionStatus.PENDING,
  };
}

/** Create bargain stage participant answer. */
export function createBargainStageParticipantAnswer(
  id: string, // stage ID
  valuation: number,
  makeFirstMove: boolean,
  opponentInfo: string,
): BargainStageParticipantAnswer {
  return {
    id,
    kind: StageKind.BARGAIN,
    valuation,
    makeFirstMove,
    opponentInfo,
  };
}

/** Create bargain stage public data. */
export function createBargainStagePublicData(
  id: string, // stage ID
  maxTurns: number,
  chatEnabled: boolean,
): BargainStagePublicData {
  return {
    id,
    kind: StageKind.BARGAIN,
    isGameOver: false,
    currentTurn: 0,
    maxTurns,
    chatEnabled,
    currentOfferer: null,
    buyerId: null,
    sellerId: null,
    participantRoles: {},
    transactions: [],
    agreedPrice: null,
  };
}

/** Create bargain info log entry. */
export function createBargainInfoLogEntry(
  infoMessage: string,
  timestamp = Timestamp.now(),
): BargainInfoLogEntry {
  return {
    type: BargainLogType.INFO,
    infoMessage,
    timestamp,
  };
}

/** Create bargain error log entry. */
export function createBargainErrorLogEntry(
  errorMessage: string,
  timestamp = Timestamp.now(),
): BargainErrorLogEntry {
  return {
    type: BargainLogType.ERROR,
    errorMessage,
    timestamp,
  };
}

/** Create bargain start log entry. */
export function createBargainStartLogEntry(
  buyerId: string,
  sellerId: string,
  firstOfferer: string,
  timestamp = Timestamp.now(),
): BargainStartLogEntry {
  return {
    type: BargainLogType.START,
    buyerId,
    sellerId,
    firstOfferer,
    timestamp,
  };
}

/** Create bargain offer log entry. */
export function createBargainOfferLogEntry(
  offer: BargainOffer,
  timestamp = Timestamp.now(),
): BargainOfferLogEntry {
  return {
    type: BargainLogType.OFFER,
    offer,
    timestamp,
  };
}

/** Create bargain response log entry. */
export function createBargainResponseLogEntry(
  responderId: string,
  response: BargainOfferResponse,
  timestamp = Timestamp.now(),
): BargainResponseLogEntry {
  return {
    type: BargainLogType.RESPONSE,
    responderId,
    response,
    timestamp,
  };
}

/** Create bargain deal log entry. */
export function createBargainDealLogEntry(
  price: number,
  finalTurn: number,
  timestamp = Timestamp.now(),
): BargainDealLogEntry {
  return {
    type: BargainLogType.DEAL,
    price,
    finalTurn,
    timestamp,
  };
}

/** Create bargain no deal log entry. */
export function createBargainNoDealLogEntry(
  maxTurnsReached: number,
  timestamp = Timestamp.now(),
): BargainNoDealLogEntry {
  return {
    type: BargainLogType.NO_DEAL,
    maxTurnsReached,
    timestamp,
  };
}
