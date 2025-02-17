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

export interface SalespersonBoardCellView {
  row: number;
  column: number;
  content: string; // empty if no coin/exit/etc.
  canMove: boolean; // whether or not can move to this cell
  status: SalespersonBoardCellStatus;
}

export enum SalespersonBoardCellStatus {
  PROPOSED = 'proposed',
  CURRENT = 'current',
  VISITED = 'visited',
  NONE = 'none',
}

export interface SalespersonMove {
  proposedCoord: SalespersonBoardCoord;
  // maps from participant public ID --> their response to the proposed coords
  responseMap: Record<string, SalespersonMoveResponse>;
  // whether or not accepted (or null if pending)
  status: SalespersonMoveStatus;
}

export enum SalespersonMoveStatus {
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  PENDING = 'pending',
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

/** Construct board view. */
export function buildBoardView(
  boardConfig: SalespersonBoardConfig,
  role: string, // player role that the board should build for
  moveHistory: SalespersonMove[],
): SalespersonBoardCellView[][] {
  const getProposedCoord = (): SalespersonBoardCoord | null => {
    if (moveHistory.length === 0) {
      return null;
    }
    const current = moveHistory[moveHistory.length - 1];
    if (current.status === SalespersonMoveStatus.PENDING) {
      return current.proposedCoord;
    }
    return null;
  };

  const getCurrentCoord = (): SalespersonBoardCoord => {
    const history = moveHistory.filter(
      (move) => move.status === SalespersonMoveStatus.ACCEPTED,
    );
    if (history.length === 0) {
      return boardConfig.startCoord;
    }
    return history[history.length - 1].proposedCoord;
  };

  const isCurrent = (row: number, column: number) => {
    return row === currentCoord.row && column === currentCoord.column;
  };

  const hasCoin = (row: number, column: number) => {
    const coins = boardConfig.coinMap[role] ?? [];
    const coinHistory = moveHistory.filter(
      (move) => move.status === SalespersonMoveStatus.ACCEPTED,
    );
    for (const coin of coins) {
      // Return true if coin is visible to current role and has not been
      // collected in the move history of accepted moves
      if (coin.row === row && coin.column === column) {
        return !coinHistory.find(
          (move) =>
            move.proposedCoord.row === row &&
            move.proposedCoord.column === column,
        );
      }
    }
    return false;
  };

  const isExit = (row: number, column: number) => {
    return (
      boardConfig.endCoord.row === row && boardConfig.endCoord.column === column
    );
  };

  const getStatus = (row: number, column: number) => {
    if (isCurrent(row, column)) {
      return SalespersonBoardCellStatus.CURRENT;
    } else if (row === proposedCoord?.row && column === proposedCoord?.column) {
      return SalespersonBoardCellStatus.PROPOSED;
    }
    const visitedCell = moveHistory.find(
      (cell) =>
        cell.proposedCoord.row === row &&
        cell.proposedCoord.column === column &&
        cell.status === SalespersonMoveStatus.ACCEPTED,
    );
    if (visitedCell) {
      return SalespersonBoardCellStatus.VISITED;
    }
    return SalespersonBoardCellStatus.NONE;
  };

  const getContent = (row: number, column: number) => {
    if (isCurrent(row, column)) {
      return '🙋';
    }
    // Don't show exit to controller player
    if (isExit(row, column) && role !== SALESPERSON_ROLE_CONTROLLER_ID) {
      return '🚪';
    }
    if (hasCoin(row, column)) {
      return '🪙';
    }
    return '';
  };

  const inRange = (row: number, column: number) => {
    return (
      (Math.abs(row - currentCoord.row) === 1 &&
        column - currentCoord.column === 0) ||
      (row - currentCoord.row === 0 &&
        Math.abs(column - currentCoord.column) === 1)
    );
  };

  const board: SalespersonBoardCellView[][] = [];
  const proposedCoord = getProposedCoord();
  const currentCoord = getCurrentCoord();

  let row = 0;
  while (row < boardConfig.numRows) {
    const boardRow: SalespersonBoardCellView[] = [];
    let column = 0;
    while (column < boardConfig.numColumns) {
      boardRow.push({
        row,
        column,
        content: getContent(row, column),
        canMove: inRange(row, column),
        status: getStatus(row, column),
      });
      column += 1;
    }
    board.push(boardRow);
    row += 1;
  }

  return board;
}
