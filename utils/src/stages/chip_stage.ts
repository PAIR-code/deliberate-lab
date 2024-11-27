import { Timestamp } from 'firebase/firestore';
import { generateId, UnifiedTimestamp } from '../shared';
import {
  BaseStageConfig,
  BaseStageParticipantAnswer,
  BaseStagePublicData,
  StageGame,
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
  isPrivateOffers: boolean; // if true, only show current participant offers
  chips: ChipItem[];
}

/** Chip item config. */
export interface ChipItem {
  id: string; // id of chip
  name: string; // name of chip, e.g., "red"
  canBuy: boolean; // if true, participants can buy this chip
  canSell: boolean; // if true, participants can sell this chip
  quantity: number; // starting quantity of chips
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
  pendingOffer: ChipOffer|null; // offer waiting to be processed (or null if none)
}

/** Chip offer. */
export interface ChipOffer {
  id: string; // offer ID
  round: number; // round number
  buy: Record<string, number>; // chip ID to quantity willing to buy
  sell: Record<string, number>; // chip ID to quantity willing to sell
}

/**
 * ChipStagePublicData
 *
 * This is saved as a stage doc (with stage ID as doc ID) under
 * experiments/{experimentId}/cohorts/{cohortId}/publicStageData
 */
export interface ChipStagePublicData extends BaseStagePublicData {
  kind: StageKind.CHIP;
  // starting with 0
  currentRound: number;
  // map of round # to (map of participant public ID to if offer was made)
  participantOfferMap: Record<number, Record<string, boolean>>;
}

/** Chip log entry (recording pending, successful, or failed transaction). */
export interface ChipLogEntry {
  id: string;
  participantId: string;
  offer: ChipOffer;
  offerStatus: ChipOfferStatus;
  chipMap: Record<string, number>; // chip ID to quantity left after offer
  timestamp: UnifiedTimestamp;
}

export enum ChipOfferStatus {
  PENDING = 'proposed', // offer made
  REJECTED = 'rejected', // offer rejected (no transaction)
  ACCEPTED = 'transaction', // offer accepted (transaction made)
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create chip stage. */
export function createChipStage(
  config: Partial<ChipStageConfig> = {}
): ChipStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.CHIP,
    game: config.game ?? StageGame.NONE,
    name: config.name ?? 'Chip negotiation',
    descriptions: config.descriptions ?? createStageTextConfig(),
    progress: config.progress ?? createStageProgressConfig({ waitForAllParticipants: true }),
    isPrivateOffers: config.isPrivateOffers ?? true,
    chips: config.chips ?? [],
  };
}

/** Create chip stage participant answer. */
export function createChipStageParticipantAnswer(
  id: string, // stage ID
  chipMap: Record<string, number> // chip ID to quantity
): ChipStageParticipantAnswer {
  return {
    id,
    kind: StageKind.CHIP,
    chipMap,
    pendingOffer: null
  };
}

/** Create chip stage public data. */
export function createChipStagePublicData(
  id: string, // stage ID
): ChipStagePublicData {
  return {
    id,
    kind: StageKind.CHIP,
    currentRound: 0,
    participantOfferMap: {}
  };
}