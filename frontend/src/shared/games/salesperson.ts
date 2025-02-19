import {
  SALESPERSON_ROLE_CONTROLLER_ID,
  SALESPERSON_ROLE_RESPONDER_ID,
  ProfileType,
  SalespersonBoardConfig,
  SalespersonBoardCoord,
  StageConfig,
  StageGame,
  createInfoStage,
  createMetadataConfig,
  createProfileStage,
  createSalespersonStage,
  createStageTextConfig,
  randint,
} from '@deliberation-lab/utils';

// ****************************************************************************
// Experiment config
// ****************************************************************************
export const SALESPERSON_GAME_METADATA = createMetadataConfig({
  name: 'Cooperative Traveling Salesperson',
  publicName: 'Cooperative Traveling Salesperson',
  description: 'Two players work together to collect coins and reach the exit.',
});

export function getSalespersonStageConfigs(): StageConfig[] {
  const stages: StageConfig[] = [];

  stages.push(PROFILE_STAGE);
  stages.push(INFO_STAGE);
  stages.push(BOARD_STAGE);

  return stages;
}

const PROFILE_STAGE = createProfileStage({
  id: 'profile',
  name: 'View randomly generated profile',
  descriptions: createStageTextConfig({
    primaryText:
      "This identity is how other players will see you during today's experiment.",
  }),
  game: StageGame.CTS,
  profileType: ProfileType.ANONYMOUS_ANIMAL,
});

const GAME_RULES = `
  You are one of two players working together to move across the board below.
  Each player can only see half the coins on the board, and only one player
  can see the exit.

  To score points, you must reach the exit in **12 moves or less**.
  One player will propose the moves, and the other player can accept/reject.
  Note that a rejected move still counts as a move!

  The number of points you score is based on how many coins you collect.
`;

const INFO_STAGE = createInfoStage({
  id: 'info',
  name: 'Game rules',
  infoLines: [GAME_RULES],
  game: StageGame.CTS,
});

function getCoinMap() {
  const coinMap: Record<string, SalespersonBoardCoord[]> = {};
  coinMap[SALESPERSON_ROLE_CONTROLLER_ID] = [
    {row: 3, column: 1},
    {row: 2, column: 2},
    {row: 4, column: 0},
  ];
  coinMap[SALESPERSON_ROLE_RESPONDER_ID] = [
    {row: 1, column: 2},
    {row: 3, column: 3},
    {row: 0, column: 0},
  ];
  return coinMap;
}

const GAME_BOARD: SalespersonBoardConfig = {
  numRows: 5,
  numColumns: 5,
  startCoord: {row: 4, column: 2},
  endCoord: {row: 0, column: 4},
  maxNumberOfMoves: 12,
  timeLimitInMinutes: null,
  coinMap: getCoinMap(),
};

const BOARD_STAGE = createSalespersonStage(GAME_BOARD, {
  id: 'salesperson',
  name: 'Cooperative Traveling Salesperson Game',
  game: StageGame.CTS,
  progress: {
    minParticipants: 2,
    waitForAllParticipants: false,
    showParticipantProgress: false,
  },
});
