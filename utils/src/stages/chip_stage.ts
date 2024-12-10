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
  // allow participants to chat with each other
  enableChat: boolean;
  // number of rounds allowed (in each round, each participant
  // has the opportunity to submit an offer that others accept/reject)
  numRounds: number;
  chips: ChipItem[];
}

/** Chip item config. */
export interface ChipItem {
  id: string; // id of chip
  name: string; // name of chip, e.g., "red"
  canBuy: boolean; // if true, participants can buy this chip
  canSell: boolean; // if true, participants can sell this chip
  quantity: number; // starting quantity of chips
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
}

/** Chip offer. */
export interface ChipOffer {
  id: string; // offer ID
  round: number; // round number
  senderId: string; // public ID of participant who sent the offer
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
  // initialized false, set to true once completes number of rounds
  // specified in stage config
  isGameOver: boolean;
  // starting with 0
  currentRound: number;
  // current turn (e.g., participant offer) within a round
  currentTurn: ChipTurn | null;
  // map of round # to (map of public ID --> if participant had turn)
  // (this helps determine whose turn it is and when to move to next round)
  participantOfferMap: Record<number, Record<string, boolean>>;
  // map of participant to current chip quantity map
  participantChipMap: Record<string, Record<string, number>>;
  // map of participant to current chip value map
  participantChipValueMap: Record<string, Record<string, number>>;
}

/** Chip turn in a round. */
export interface ChipTurn {
  // public ID of participant whose turn it is to send offer
  participantId: string;
  // offer sent by participant, or null if not sent yet
  offer: ChipOffer | null;
  // map (public ID --> response) made by participants regarding offer
  responseMap: Record<string, boolean>;
}

/** Chip log entry. */
export interface ChipLogEntry {
  // TODO: Add chip log entry types for offer|transaction|round|etc.
  message: string;
  timestamp: UnifiedTimestamp;
}

/** Chip transaction. */
export interface ChipTransaction {
  offer: ChipOffer; // offer from sender to receiver
  recipientId: string; // participant public ID
  timestamp: UnifiedTimestamp;
}

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create chip stage. */
export function createChipStage(config: Partial<ChipStageConfig> = {}): ChipStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.CHIP,
    game: config.game ?? StageGame.NONE,
    name: config.name ?? 'Chip negotiation',
    descriptions: config.descriptions ?? createStageTextConfig(),
    progress: config.progress ?? createStageProgressConfig({ waitForAllParticipants: true }),
    enableChat: config.enableChat ?? false,
    numRounds: config.numRounds ?? 3,
    chips: config.chips ?? [],
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

/** Create chip turn. */
export function createChipTurn(participantId: string): ChipTurn {
  return {
    participantId,
    offer: null,
    responseMap: {},
  };
}

/** Create chip log entry. */
export function createChipLogEntry(message: string, timestamp = Timestamp.now()): ChipLogEntry {
  return {
    message,
    timestamp,
  };
}

export function displayChipOfferText(chips: Record<string, number>): string {
  const chipIcons: Record<string, string> = {
    RED: '🔴',
    GREEN: '🟢',
    BLUE: '🔵',
  };

  const getChipDescription = (chipId: string, quantity: number): string => {
    return `${chipIcons[chipId]} ${quantity} ${chipId.toLowerCase()} chip${quantity > 1 ? 's' : ''}`;
  };

  if (Object.keys(chips).length === 1) {
    const chipId = Object.keys(chips)[0];
    const quantity = chips[chipId];
    return getChipDescription(chipId, quantity);
  }

  const chipDescriptions = Object.entries(chips).map(([chipId, quantity]) => {
    return getChipDescription(chipId, quantity);
  });

  if (chipDescriptions.length > 2) {
    const lastDescription = chipDescriptions.pop();
    return `${chipDescriptions.join(', ')}, and ${lastDescription}`;
  }

  return chipDescriptions.join(' and ');
}
