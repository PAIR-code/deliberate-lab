import {generateId, UnifiedTimestamp} from '../shared';
import {
  BaseStageConfig,
  BaseStagePublicData,
  StageGame,
  StageKind,
  createStageTextConfig,
  createStageProgressConfig,
} from './stage';

/** Cooperative Traveling Salesperson game stage. */
export interface SalespersonStageConfig extends BaseStageConfig {
  kind: StageKind.SALESPERSON;
  board: SalespersonBoardConfig;
}

/** Board for game. */
export interface SalespersonBoardConfig {
  numRows: number;
  numColumns: number;
  startCoord: SalespersonBoardCoord;
  endCoord: SalespersonBoardCoord;
  maxNumberOfMoves: number | null; // null if no max
  timeLimitInMinutes: number | null; // null if no limit
  // Maps from player role (e.g., controller) to coins visible
  // TODO: Add coin value? Add coin ID?
  coinMap: Record<string, SalespersonBoardCoord[]>;
}

export interface SalespersonBoardCoord {
  row: number;
  column: number;
}

/**
 * SalespersonStagePublicData
 *
 * This is saved as a stage doc (with stage ID as doc ID) under
 * experiments/{experimentId}/cohorts/{cohortId}/publicStageData
 */
export interface SalespersonStagePublicData extends BaseStagePublicData {
  kind: StageKind.SALESPERSON;
  // public ID of participant who will control the board
  controller: string;
  // initialized false, set to true if players reach the board "end" coord
  // or game is ended by experimenter
  // TODO: temporarily end game if one of the players drops?
  isGameOver: boolean;
  // initialized to zero, increments each time the players move on the board
  numMoves: number;
  // history of moves made
  moveHistory: SalespersonMove[];
  // Track which coins are collected based on their coordinates
  // TODO: Update so that coins are tracked by ID
  coinsCollected: SalespersonBoardCoord[];
  // current coordinates
  currentCoord: SalespersonBoardCoord;
}

export interface SalespersonMove {
  proposedCoord: SalespersonBoardCoord;
  // maps from participant public ID --> their response to the proposed coords
  responseMap: Record<string, SalespersonMoveResponse>;
  // whether or not accepted (or null if pending)
  status: SalespersonMoveStatus;
}

export enum SalespersonMoveStatus {
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  PENDING = 'PENDING',
}

export interface SalespersonMoveResponse {
  response: boolean; // accept or decline move
  timestamp: UnifiedTimestamp;
}

export interface SalespersonLogEntry {
  sender: string | null; // public ID or null if automated log
  message: string;
  timestamp: UnifiedTimestamp;
}

/** Constants for setting the board. */
export const SALESPERSON_ROLE_CONTROLLER_ID = 'controller';
export const SALESPERSON_ROLE_RESPONDER_ID = 'responder';

// ************************************************************************* //
// FUNCTIONS                                                                 //
// ************************************************************************* //

/** Create salesperson stage. */
export function createSalespersonStage(
  board: SalespersonBoardConfig,
  config: Partial<SalespersonStageConfig> = {},
): SalespersonStageConfig {
  return {
    id: config.id ?? generateId(),
    kind: StageKind.SALESPERSON,
    game: config.game ?? StageGame.NONE,
    name: config.name ?? 'Traveling salesperson',
    descriptions: config.descriptions ?? createStageTextConfig(),
    progress:
      config.progress ??
      createStageProgressConfig({waitForAllParticipants: true}),
    board,
  };
}

/** Create salesperson stage public data. */
export function createSalespersonStagePublicData(
  id: string, // stage ID
  currentCoord: SalespersonBoardCoord,
): SalespersonStagePublicData {
  return {
    id,
    kind: StageKind.SALESPERSON,
    controller: '',
    isGameOver: false,
    numMoves: 0,
    moveHistory: [],
    coinsCollected: [],
    currentCoord,
  };
}
