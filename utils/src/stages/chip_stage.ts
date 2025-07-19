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

/** "Chip" negotiation stage types and functions. */

// ************************************************************************* //
// TYPES                                                                     //
// ************************************************************************* //

/**
 * ChipStageConfig.
 *
 * This is saved as a stage doc under experiments/{experimentId}/stages
 */
export interface ChipStageConfig extends BaseStageConfig {
  kind: StageKind.CHIP;
  // allow participants to chat with each other
  enableChat: boolean;
  // number of rounds allowed (in each round, each participant
  // has the opportunity to submit an offer that others accept/reject)
  numRounds: number;
  chips: ChipItem[];
  // If set, use chip assistance workflow to send/respond to offers
  assistanceConfig: ChipAssistanceConfig | null;
}

/** Chip item config. */
export interface ChipItem {
  id: string; // id of chip
  name: string; // name of chip, e.g., "red"
  avatar: string; // emoji for chip
  canBuy: boolean; // if true, participants can buy this chip
  canSell: boolean; // if true, participants can sell this chip
  startingQuantity: number; // starting quantity of chips
  lowerValue: number; // lower bound for randomly-sampled value
  upperValue: number; // upper bound for randomly-sampled value
}

/**
 * ChipStageParticipantAnswer.
 *
 * This is saved as a stage doc (with stage ID as doc ID) under
 * experiments/{experimentId}/participants/{participantPrivateId}/stageData
 */
export interface ChipStageParticipantAnswer extends BaseStageParticipantAnswer {
  kind: StageKind.CHIP;
  chipMap: Record<string, number>; // chip ID to quantity left
  chipValueMap: Record<string, number>; // chip ID to value per chip
  // Current assistance shown to user (or null if none)
  currentAssistance: ChipAssistanceMove | null;
  // Current assistance is moved to assistance history when complete
  assistanceHistory: ChipAssistanceMove[];
}

/** Chip offer. */
export interface ChipOffer {
  id: string; // offer ID
  round: number;
  senderId: string; // public ID of participant esnding the offer
  buy: Record<string, number>; // chip ID to quantity willing to buy
  sell: Record<string, number>; // chip ID to quantity willing to sell
  timestamp: Timestamp;
}

/** Chip transaction (specific turn in a round). */
export interface ChipTransaction {
  // offer sent by participant
  offer: ChipOffer;
  // map (public ID --> response) made by participants regarding offer
  responseMap: Record<string, ChipOfferResponse>;
  // status of transaction
  status: ChipTransactionStatus;
  // public ID of recipient chosen (or null if none available or not set)
  recipientId: string | null;
}

export interface ChipOfferResponse {
  response: boolean; // accept or decline offer
  timestamp: Timestamp;
}

/** Chip transaction status. */
export enum ChipTransactionStatus {
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  PENDING = 'PENDING',
}

/**
 * ChipStagePublicData
 *
 * This is saved as a stage doc (with stage ID as doc ID) under
 * experiments/{experimentId}/cohorts/{cohortId}/publicStageData
 */
// TODO: Record timestamps for when each turn begins/ends
export interface ChipStagePublicData extends BaseStagePublicData {
  kind: StageKind.CHIP;
  // initialized false, set to true once completes number of rounds
  // specified in stage config
  isGameOver: boolean;
  // starting with 0
  currentRound: number;
  // participant public ID for current turn within a round
  currentTurn: string | null;
  // map of round # to (map of public ID --> participant's transaction)
  participantOfferMap: Record<number, Record<string, ChipTransaction>>;
  // map of participant to current chip quantity map
  participantChipMap: Record<string, Record<string, number>>;
  // map of participant to current chip value map
  participantChipValueMap: Record<string, Record<string, number>>;
}

/** Simplified chip log. */
export interface SimpleChipLog {
  message: string;
  timestamp: Timestamp | null;
}

/** Chip assistance workflow config. */
export interface ChipAssistanceConfig {
  // List of chip assistance modes to include in offer
  offerModes: ChipAssistanceMode[];
  // List of chip assistance modes to include in response
  responseModes: ChipAssistanceMode[];
}

/** Chip assistance modes. */
export enum ChipAssistanceMode {
  NONE = 'none', // manually submit without assistance
  ADVISOR = 'advisor',
  COACH = 'coach',
  DELEGATE = 'delegate',
  ERROR = 'error',
}

/** Chip assistance move. */
export type ChipAssistanceMove =
  | ChipOfferAssistanceMove
  | ChipResponseAssistanceMove;

export interface BaseChipAssistanceMove {
  round: number;
  turn: string; // public ID of participant whose turn it is
  type: ChipAssistanceType;
  selectedMode: ChipAssistanceMode;
  // timestamp of when mode was selected
  selectedTime: UnifiedTimestamp;
  // timestamp of when model call finished
  proposedTime: UnifiedTimestamp | null;
  // timestamp of when assistance move was completed
  endTime: UnifiedTimestamp | null;
  message: string | null; // explanation from model call to show to user
  reasoning: string | null; // reasoning from model call
  modelResponse: object; // parsed model response from call
}

export interface ChipOfferAssistanceMove extends BaseChipAssistanceMove {
  type: ChipAssistanceType.OFFER;
  proposedOffer: ChipOffer | null;
  finalOffer: ChipOffer;
}

export interface ChipResponseAssistanceMove extends BaseChipAssistanceMove {
  type: ChipAssistanceType.RESPONSE;
  proposedResponse: boolean | null; // null if N/A (e.g., delegate/advisor mode)
  finalResponse: boolean | null;
}

export enum ChipAssistanceType {
  OFFER = 'offer',
  RESPONSE = 'response',
}

// TODO: Consider removing subcollections for chip logs and transactions,
// as they are no longer used.

/** Chip log entry. */
export type ChipLogEntry =
  | ChipRoundLogEntry
  | ChipTurnLogEntry
  | ChipOfferLogEntry
  | ChipOfferDeclinedLogEntry
  | ChipInfoLogEntry
  | ChipErrorLogEntry
  | ChipTransactionLogEntry;

export interface BaseChipLogEntry {
  type: ChipLogType;
  timestamp: UnifiedTimestamp;
}

/** Chip log type. */
export enum ChipLogType {
  ERROR = 'error', // error message
  INFO = 'info', // info message
  NEW_ROUND = 'newRound', // new round
  NEW_TURN = 'newTurn', // new turn
  OFFER = 'offer', // new offer posted
  OFFER_DECLINED = 'offerDeclined', // no one accepted offer
  TRANSACTION = 'transaction', // transaction cleared
}

export interface ChipRoundLogEntry extends BaseChipLogEntry {
  type: ChipLogType.NEW_ROUND;
  roundNumber: number;
}

export interface ChipTurnLogEntry extends BaseChipLogEntry {
  type: ChipLogType.NEW_TURN;
  roundNumber: number;
  participantId: string; // public ID
}

export interface ChipInfoLogEntry extends BaseChipLogEntry {
  type: ChipLogType.INFO;
  infoMessage: string;
}

export interface ChipErrorLogEntry extends BaseChipLogEntry {
  type: ChipLogType.ERROR;
  errorMessage: string;
}

export interface ChipOfferLogEntry extends BaseChipLogEntry {
  type: ChipLogType.OFFER;
  offer: ChipOffer;
}

export interface ChipOfferDeclinedLogEntry extends BaseChipLogEntry {
  type: ChipLogType.OFFER_DECLINED;
  offer: ChipOffer;
}

export interface ChipTransactionLogEntry extends BaseChipLogEntry {
  type: ChipLogType.TRANSACTION;
  transaction: ChipTransaction;
}

// ****************************************************************************
// Helper functions for creating chip types.
// For other utility functions, see chip_stage.utils.ts
// ****************************************************************************

/** Create chip stage. */
export function createChipStage(
  config: Partial<ChipStageConfig> = {},
): ChipStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.CHIP,
    name: config.name ?? 'Chip negotiation',
    descriptions: config.descriptions ?? createStageTextConfig(),
    progress:
      config.progress ??
      createStageProgressConfig({waitForAllParticipants: true}),
    enableChat: config.enableChat ?? false,
    numRounds: config.numRounds ?? 3,
    chips: config.chips ?? [],
    assistanceConfig: config.assistanceConfig ?? null,
  };
}

/** Create chip offer. */
export function createChipOffer(config: Partial<ChipOffer> = {}): ChipOffer {
  return {
    id: config.id ?? generateId(),
    round: config.round ?? 0,
    senderId: config.senderId ?? '',
    buy: config.buy ?? {},
    sell: config.sell ?? {},
    timestamp: config.timestamp ?? Timestamp.now(),
  };
}

/** Create chip stage participant answer. */
export function createChipStageParticipantAnswer(
  id: string, // stage ID
  chipMap: Record<string, number>, // chip ID to quantity
  chipValueMap: Record<string, number>, // chip ID to value
): ChipStageParticipantAnswer {
  return {
    id,
    kind: StageKind.CHIP,
    chipMap,
    chipValueMap,
    currentAssistance: null,
    assistanceHistory: [],
  };
}

/** Create chip stage public data. */
export function createChipStagePublicData(
  id: string, // stage ID
): ChipStagePublicData {
  return {
    id,
    kind: StageKind.CHIP,
    isGameOver: false,
    currentRound: 0,
    currentTurn: null,
    participantOfferMap: {},
    participantChipMap: {},
    participantChipValueMap: {},
  };
}

/** Create simple chip log. */
export function createSimpleChipLog(
  message: string,
  timestamp: Timestamp | null = null,
): SimpleChipLog {
  return {
    message,
    timestamp,
  };
}

/** Create chip transaction. */
export function createChipTransaction(offer: ChipOffer): ChipTransaction {
  return {
    offer,
    responseMap: {},
    status: ChipTransactionStatus.PENDING,
    recipientId: null,
  };
}

/** Create chip info log entry. */
export function createChipInfoLogEntry(
  infoMessage: string,
  timestamp = Timestamp.now(),
): ChipInfoLogEntry {
  return {
    type: ChipLogType.INFO,
    infoMessage,
    timestamp,
  };
}

/** Create chip error log entry. */
export function createChipErrorLogEntry(
  errorMessage: string,
  timestamp = Timestamp.now(),
): ChipErrorLogEntry {
  return {
    type: ChipLogType.ERROR,
    errorMessage,
    timestamp,
  };
}

/** Create chip round log entry. */
export function createChipRoundLogEntry(
  roundNumber: number,
  timestamp = Timestamp.now(),
): ChipRoundLogEntry {
  return {
    type: ChipLogType.NEW_ROUND,
    roundNumber,
    timestamp,
  };
}

/** Create chip turn log entry. */
export function createChipTurnLogEntry(
  roundNumber: number,
  participantId: string,
  timestamp = Timestamp.now(),
): ChipTurnLogEntry {
  return {
    type: ChipLogType.NEW_TURN,
    roundNumber,
    participantId,
    timestamp,
  };
}

/** Create chip offer log entry. */
export function createChipOfferLogEntry(
  offer: ChipOffer,
  timestamp = Timestamp.now(),
): ChipOfferLogEntry {
  return {
    type: ChipLogType.OFFER,
    offer,
    timestamp,
  };
}

/** Create chip offer declined log entry. */
export function createChipOfferDeclinedLogEntry(
  offer: ChipOffer,
  timestamp = Timestamp.now(),
): ChipOfferDeclinedLogEntry {
  return {
    type: ChipLogType.OFFER_DECLINED,
    offer,
    timestamp,
  };
}

/** Create chip transaction log entry. */
export function createChipTransactionLogEntry(
  transaction: ChipTransaction,
  timestamp = Timestamp.now(),
): ChipTransactionLogEntry {
  return {
    type: ChipLogType.TRANSACTION,
    transaction,
    timestamp,
  };
}
