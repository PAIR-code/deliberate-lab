/**
 * Functions for data downloads.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  Firestore,
  orderBy,
  query,
} from 'firebase/firestore';
import {
  ChatMessage,
  ChatMessageType,
  ChipItem,
  ChipStageConfig,
  ChipStagePublicData,
  ChipTransaction,
  ChipTransactionStatus,
  CohortConfig,
  CohortDownload,
  Experiment,
  ExperimentDownload,
  ParticipantDownload,
  ParticipantProfileExtended,
  PayoutItemType,
  PayoutStageConfig,
  PayoutStageParticipantAnswer,
  RankingStageConfig,
  RankingStagePublicData,
  StageConfig,
  StageKind,
  StageParticipantAnswer,
  StagePublicData,
  SurveyAnswer,
  SurveyPerParticipantStageConfig,
  SurveyStageConfig,
  SurveyQuestion,
  SurveyQuestionKind,
  UnifiedTimestamp,
  calculatePayoutResult,
  calculatePayoutTotal,
  createCohortDownload,
  createExperimentDownload,
  createParticipantDownload,
} from '@deliberation-lab/utils';
import {convertUnifiedTimestampToISO} from './utils';

// ****************************************************************************
// FILE DOWNLOAD FUNCTIONS
// ****************************************************************************

/** Download blob (helper function for file downloads) */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click(); // Trigger the download

  // Clean up the URL and remove the link after the download
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/** Download data as a CSV */
export function downloadCSV(data: string[][], filename: string) {
  const csvData = data
    .map((line: string[]) => line.map((line) => JSON.stringify(line)).join(','))
    .join('\n');

  const blob = new Blob([csvData], {type: 'application/csv'});
  downloadBlob(blob, `${filename}.csv`);
}

/** Download data as a JSON file */
export function downloadJSON(data: object, filename: string) {
  const jsonData = JSON.stringify(data, null, 2);

  const blob = new Blob([jsonData], {type: 'application/json'});
  downloadBlob(blob, filename);
}

/** Make text CSV-compatibile. */
export function toCSV(text: string | null) {
  if (!text) return '';

  return text.replaceAll(',', '').replaceAll('\n', '');
}

// ****************************************************************************
// EXPERIMENT DOWNLOAD JSON
// ****************************************************************************
export async function getExperimentDownload(
  firestore: Firestore,
  experimentId: string,
) {
  // Get experiment config from experimentId
  const experimentConfig = (
    await getDoc(doc(firestore, 'experiments', experimentId))
  ).data() as Experiment;

  // Create experiment download using experiment config
  const experimentDownload = createExperimentDownload(experimentConfig);

  // For each experiment stage config, add to ExperimentDownload
  const stageConfigs = (
    await getDocs(collection(firestore, 'experiments', experimentId, 'stages'))
  ).docs.map((doc) => doc.data() as StageConfig);
  for (const stage of stageConfigs) {
    experimentDownload.stageMap[stage.id] = stage;
  }

  // For each participant, add ParticipantDownload
  const profiles = (
    await getDocs(
      collection(firestore, 'experiments', experimentId, 'participants'),
    )
  ).docs.map((doc) => doc.data() as ParticipantProfileExtended);
  for (const profile of profiles) {
    // Create new ParticipantDownload
    const participantDownload = createParticipantDownload(profile);

    // For each stage answer, add to ParticipantDownload map
    const stageAnswers = (
      await getDocs(
        collection(
          firestore,
          'experiments',
          experimentId,
          'participants',
          profile.privateId,
          'stageData',
        ),
      )
    ).docs.map((doc) => doc.data() as StageParticipantAnswer);
    for (const stage of stageAnswers) {
      participantDownload.answerMap[stage.id] = stage;
    }
    // Add ParticipantDownload to ExperimentDownload
    experimentDownload.participantMap[profile.publicId] = participantDownload;
  }

  // For each cohort, add CohortDownload
  const cohorts = (
    await getDocs(collection(firestore, 'experiments', experimentId, 'cohorts'))
  ).docs.map((cohort) => cohort.data() as CohortConfig);
  for (const cohort of cohorts) {
    // Create new CohortDownload
    const cohortDownload = createCohortDownload(cohort);

    // For each public stage data, add to CohortDownload
    const publicStageData = (
      await getDocs(
        collection(
          firestore,
          'experiments',
          experimentId,
          'cohorts',
          cohort.id,
          'publicStageData',
        ),
      )
    ).docs.map((doc) => doc.data() as StagePublicData);
    for (const data of publicStageData) {
      cohortDownload.dataMap[data.id] = data;
      // If chat stage, add list of chat messages to CohortDownload
      if (data.kind === StageKind.CHAT) {
        const chatList = (
          await getDocs(
            query(
              collection(
                firestore,
                'experiments',
                experimentId,
                'cohorts',
                cohort.id,
                'publicStageData',
                data.id,
                'chats',
              ),
              orderBy('timestamp', 'asc'),
            ),
          )
        ).docs.map((doc) => doc.data() as ChatMessage);
        cohortDownload.chatMap[data.id] = chatList;
      }
    }

    // Add CohortDownload to ExperimentDownload
    experimentDownload.cohortMap[cohort.id] = cohortDownload;
  }

  return experimentDownload;
}

// ****************************************************************************
// JSON DATA TYPES
// ****************************************************************************
export interface ChipNegotiationData {
  experimentName: string;
  cohortName: string;
  stageName: string;
  data: ChipNegotiationGameData;
}

export interface ChipNegotiationGameData {
  metadata: ChipNegotiationGameMetadata;
  history: ChipNegotiationRoundData[];
  isGameOver: boolean;
}

export interface ChipNegotiationGameMetadata {
  // Maps from participant ID to chip value map
  participantChipValueMap: Record<string, Record<string, number>>;
  // List of players
  players: string[];
  // List of chips
  chips: ChipItem[];
}

export interface ChipNegotiationRoundData {
  round: number;
  turns: ChipNegotiationTurnData[];
}

export interface ChipNegotiationTurnData {
  transaction: ChipTransaction;
  senderData: ChipNegotiationSenderData;
  responseData: Record<string, ChipNegotiationResponderData>;
}

export interface ChipNegotiationSenderData {
  participantId: string;
  chipValues: Record<string, number>;
  chipsBeforeTurn: Record<string, number>;
  chipsAfterTurn: Record<string, number>;
  payoutBeforeTurn: number;
  payoutAfterTurn: number;
}

export interface ChipNegotiationResponderData {
  participantId: string;
  selectedAsRecipient: boolean;
  offerResponse: boolean;
  offerResponseTimestamp: UnifiedTimestamp;
  chipValues: Record<string, number>;
  chipsBeforeTurn: Record<string, number>;
  chipsAfterTurn: Record<string, number>;
  payoutBeforeTurn: number;
  payoutAfterTurn: number;
}

// ****************************************************************************
// CHIP NEGOTIATION DATA FUNCTIONS
// ****************************************************************************
export function getChipNegotiationCSV(
  data: ExperimentDownload,
  games: ChipNegotiationData[],
): string[][] {
  const columns: string[][] = [];

  // Calculate max players across all games (needed for header columns)
  let maxPlayers = 0;
  games.forEach((game) => {
    const numPlayers = game.data.metadata.players.length;
    if (numPlayers > maxPlayers) {
      maxPlayers = numPlayers;
    }
  });

  // Add headers
  columns.push(getChipNegotiationTurnColumns(maxPlayers, data, games[0], null));

  games.forEach((game) => {
    game.data.history.forEach((round) => {
      round.turns.forEach((turn) => {
        columns.push(
          getChipNegotiationTurnColumns(maxPlayers, data, game, turn),
        );
      });
    });
  });

  return columns;
}

export function getChipNegotiationTurnColumns(
  maxPlayers: number, // needed for player column headers
  data: ExperimentDownload,
  game: ChipNegotiationData,
  turn: ChipNegotiationTurnData | null,
): string[] {
  // Start with player list that is maxPlayers long and populate in order.
  // Players have turns in order of their ID
  // NOTE: Keep in sync with player turn logic on backend
  const players: string[] = [];
  const playerList: string[] = game.data.metadata.players.sort();
  let index = 0;
  while (index < maxPlayers) {
    if (index < playerList.length) {
      players.push(playerList[index]);
    } else {
      players.push('');
    }
    index += 1;
  }

  const chips = game.data.metadata.chips;
  const columns: string[] = [];
  const roundNumber = turn?.transaction.offer.round ?? -1;
  const senderId = turn?.senderData.participantId ?? '';
  const recipientId = turn?.transaction.recipientId ?? '';
  const getPlayerNumber = () => {
    const index = playerList.findIndex((p) => p === senderId);
    if (index === -1) return '';
    return `${index + 1}`;
  };

  columns.push(!turn ? 'Cohort' : toCSV(game.cohortName));
  columns.push(!turn ? 'Stage ID' : toCSV(game.stageName));
  columns.push(!turn ? 'Round' : roundNumber.toString());
  columns.push(!turn ? 'Turn (player number)' : getPlayerNumber());
  columns.push(!turn ? 'Turn (sender ID)' : senderId);
  columns.push(
    !turn
      ? 'Turn (sender name)'
      : (toCSV(data.participantMap[senderId]?.profile.name) ?? ''),
  );
  columns.push(
    !turn
      ? 'Turn (avatar)'
      : (data.participantMap[senderId]?.profile.avatar ?? ''),
  );

  columns.push(
    !turn
      ? 'Offer (timestamp)'
      : convertUnifiedTimestampToISO(turn.transaction.offer.timestamp),
  );
  chips.forEach((chip) => {
    columns.push(
      !turn
        ? `Buy offer (${chip.id})`
        : (turn.transaction.offer.buy[chip.id]?.toString() ?? '0'),
    );
  });
  chips.forEach((chip) => {
    columns.push(
      !turn
        ? `Sell offer (${chip.id})`
        : (turn.transaction.offer.sell[chip.id]?.toString() ?? '0'),
    );
  });
  columns.push(!turn ? 'Offer status' : turn.transaction.status);
  columns.push(!turn ? 'Offer recipient' : recipientId);
  columns.push(
    !turn
      ? `Sender payout before turn`
      : turn.senderData.payoutBeforeTurn.toString(),
  );
  columns.push(
    !turn
      ? `Sender payout after turn`
      : turn.senderData.payoutAfterTurn.toString(),
  );
  columns.push(
    !turn
      ? `Recipient payout before turn`
      : (turn.responseData[recipientId]?.payoutBeforeTurn?.toString() ?? ''),
  );
  columns.push(
    !turn
      ? `Recipient payout after turn`
      : (turn.responseData[recipientId]?.payoutAfterTurn?.toString() ?? ''),
  );

  // Map player number to player ID
  players.forEach((player, index) => {
    columns.push(!turn ? `player ${index + 1}` : player);
  });

  players.forEach((player, index) => {
    columns.push(
      !turn
        ? `player ${index + 1} (is sender)`
        : (player === senderId).toString(),
    );
    columns.push(
      !turn
        ? `player ${index + 1} (is selected recipient)`
        : (player === recipientId).toString(),
    );
    columns.push(
      !turn
        ? `player ${index + 1} offer timestamp`
        : player === senderId
          ? 'n/a'
          : turn.responseData[player]
            ? convertUnifiedTimestampToISO(
                turn.responseData[player]?.offerResponseTimestamp,
              )
            : '',
    );
    columns.push(
      !turn
        ? `player ${index + 1} offer response`
        : player === senderId
          ? 'n/a'
          : (turn.responseData[player]?.offerResponse.toString() ?? ''),
    );
    chips.forEach((chip) => {
      columns.push(
        !turn
          ? `player ${index + 1} ${chip.id} before turn`
          : player == senderId
            ? (turn.senderData.chipsBeforeTurn[chip.id]?.toString() ?? '')
            : (turn.responseData[player]?.chipsBeforeTurn[
                chip.id
              ]?.toString() ?? ''),
      );
      columns.push(
        !turn
          ? `player ${index + 1} ${chip.id} after turn`
          : player == senderId
            ? (turn.senderData.chipsAfterTurn[chip.id]?.toString() ?? '')
            : (turn.responseData[player]?.chipsAfterTurn[chip.id]?.toString() ??
              ''),
      );
    });
    chips.forEach((chip) => {
      columns.push(
        !turn
          ? `player ${index + 1} ${chip.id} value`
          : player == senderId
            ? (turn.senderData.chipValues[chip.id]?.toString() ?? '')
            : (turn.responseData[player]?.chipValues[chip.id]?.toString() ??
              ''),
      );
    });
    columns.push(
      !turn
        ? `player ${index + 1} payout before turn`
        : player == senderId
          ? turn.senderData.payoutBeforeTurn.toString()
          : (turn.responseData[player]?.payoutBeforeTurn?.toString() ?? ''),
    );
    columns.push(
      !turn
        ? `player ${index + 1} payout after turn`
        : player == senderId
          ? turn.senderData.payoutAfterTurn.toString()
          : (turn.responseData[player]?.payoutAfterTurn?.toString() ?? ''),
    );
  });

  return columns;
}

export function getChipNegotiationPlayerMapCSV(
  data: ExperimentDownload,
  games: ChipNegotiationData[],
): string[][] {
  const columns: string[][] = [];

  // Hacky solution since cohort history isn't currently tracked:
  // use timestamp to order games

  const getGameTimestamp = (game: ChipNegotiationData) => {
    return game.data.history[0].turns[0].transaction.offer.timestamp;
  };

  const sortedGames = games.sort(
    (gameA: ChipNegotiationData, gameB: ChipNegotiationData) => {
      const timestampA = getGameTimestamp(gameA);
      const timestampB = getGameTimestamp(gameB);
      const timeA = timestampA.seconds * 1000 + timestampA.nanoseconds / 1e6;
      const timeB = timestampB.seconds * 1000 + timestampB.nanoseconds / 1e6;
      return timeA - timeB;
    },
  );

  // Maps from participant ID to games played
  const playerMap: Record<string, string[]> = {};
  let maxGames = 0;
  for (const game of sortedGames) {
    game.data.metadata.players.forEach((player) => {
      if (!playerMap[player]) {
        playerMap[player] = [];
      }
      playerMap[player].push(game.cohortName);
      if (playerMap[player]?.length ?? 0 > maxGames) {
        maxGames = playerMap[player]?.length;
      }
    });
  }

  const getPlayerColumns = (player: string | null): string[] => {
    const columns: string[] = [];
    const playerGames = !player ? [] : (playerMap[player] ?? []);

    // Add player IDs, name, avatar, pronouns
    columns.push(
      !player
        ? 'Private ID'
        : (data.participantMap[player]?.profile.privateId ?? ''),
    );
    columns.push(
      !player
        ? 'Public ID'
        : (data.participantMap[player]?.profile.publicId ?? ''),
    );
    columns.push(
      !player ? 'Name' : toCSV(data.participantMap[player]?.profile.name),
    );
    columns.push(
      !player ? 'Avatar' : toCSV(data.participantMap[player]?.profile.avatar),
    );
    columns.push(
      !player
        ? 'Pronouns'
        : toCSV(data.participantMap[player]?.profile.pronouns),
    );

    // Add column for each game
    let gameNumber = 0;
    while (gameNumber < maxGames) {
      columns.push(
        !player
          ? `Game ${gameNumber + 1}`
          : gameNumber < playerGames.length
            ? playerGames[gameNumber]
            : '',
      );
      gameNumber += 1;
    }

    return columns;
  };

  // Add headers
  columns.push(getPlayerColumns(null));
  // Add players
  Object.keys(playerMap)
    .sort()
    .forEach((player) => {
      columns.push(getPlayerColumns(player));
    });

  return columns;
}

export function getChipNegotiationData(
  data: ExperimentDownload,
): ChipNegotiationData[] {
  const participantMap = data.participantMap;
  const cohortMap = data.cohortMap;
  const stageMap = data.stageMap;
  const experimentName = data.experiment.metadata.name;

  const gameData: ChipNegotiationData[] = [];

  // For each cohort, look for chip negotiation games
  Object.values(cohortMap).forEach((cohortData: CohortDownload) => {
    const cohortName = `${
      cohortData.cohort.metadata.name
    }-${cohortData.cohort.id.substring(0, 6)}`;

    for (const publicStage of Object.values(cohortData.dataMap)) {
      const stage = stageMap[publicStage.id];
      const stageName = `${stage.name}-${stage.id}`;

      // If public stage is a chip negotiation that was played
      if (
        publicStage.kind === StageKind.CHIP &&
        stage?.kind === StageKind.CHIP &&
        Object.keys(publicStage.participantOfferMap).length > 0
      ) {
        // build metadata
        const metadata = getChipNegotiationGameMetadata(stage, publicStage);

        // track each player's chip quantities from start to end of game
        let currentChipMap = getChipNegotiationStartingQuantityMap(
          stage,
          metadata.players,
        );

        // for each round, add list of transactions
        const roundData: ChipNegotiationRoundData[] = [];
        let roundNumber = 0;
        while (roundNumber < stage.numRounds) {
          if (publicStage.participantOfferMap[roundNumber]) {
            const {data, updatedChipMap} = getChipNegotiationRoundData(
              roundNumber,
              publicStage.participantOfferMap[roundNumber],
              metadata,
              currentChipMap,
            );
            roundData.push(data);
            currentChipMap = updatedChipMap;
          } // end if statement checking for round
          roundNumber += 1;
        } // end loop over game rounds

        gameData.push({
          experimentName,
          cohortName,
          stageName,
          data: {
            metadata,
            history: roundData,
            isGameOver: publicStage.isGameOver,
          },
        });
      } // end if statement for chip negotiation stage
    } // end stage iteration
  }); // end cohort iteration

  return gameData;
}

function getChipNegotiationGameMetadata(
  stage: ChipStageConfig,
  publicStage: ChipStagePublicData,
): ChipNegotiationGameMetadata {
  // iterate through offer map to determine players
  const playerSet = new Set<string>();
  Object.values(publicStage.participantOfferMap).forEach((round) => {
    Object.keys(round).forEach((senderId) => {
      playerSet.add(senderId);
      Object.keys(round[senderId].responseMap).forEach((responderId) => {
        playerSet.add(responderId);
      });
    });
  });
  const players: string[] = Array.from(playerSet);

  // build metadata
  return {
    participantChipValueMap: publicStage.participantChipValueMap,
    players,
    chips: stage.chips,
  };
}

function getChipNegotiationStartingQuantityMap(
  stage: ChipStageConfig,
  players: string[],
) {
  const currentChipMap: Record<string, Record<string, number>> = {};
  const startingQuantityMap: Record<string, number> = {};
  stage.chips.forEach((chip) => {
    startingQuantityMap[chip.id] = chip.startingQuantity;
  });
  players.forEach((player) => {
    currentChipMap[player] = startingQuantityMap;
  });

  return currentChipMap;
}

function getChipNegotiationRoundData(
  roundNumber: number,
  roundMap: Record<string, ChipTransaction>, // participant ID to transaction
  playerMetadata: ChipNegotiationGameMetadata,
  currentChipMap: Record<string, Record<string, number>>,
): {
  data: ChipNegotiationRoundData;
  updatedChipMap: Record<string, Record<string, number>>;
} {
  const transactions = Object.values(roundMap).sort(
    (a: ChipTransaction, b: ChipTransaction) => {
      const timeA =
        a.offer.timestamp.seconds * 1000 + a.offer.timestamp.nanoseconds / 1e6;
      const timeB =
        b.offer.timestamp.seconds * 1000 + b.offer.timestamp.nanoseconds / 1e6;
      return timeA - timeB;
    },
  );

  const turns: ChipNegotiationTurnData[] = [];
  transactions.forEach((transaction) => {
    const response = getChipNegotiationTurnData(
      transaction,
      playerMetadata,
      currentChipMap,
    );
    currentChipMap = response.currentChipMap;
    turns.push(response.turn);
  });

  return {data: {round: roundNumber, turns}, updatedChipMap: currentChipMap};
}

// TODO: Create utils function for transactions to use across frontend/backend
function runChipTransaction(
  currentChipMap: Record<string, number>,
  addChipMap: Record<string, number>,
  removeChipMap: Record<string, number>,
) {
  const newChipMap: Record<string, number> = {};
  if (!currentChipMap) return {};

  Object.keys(currentChipMap).forEach((chipId) => {
    newChipMap[chipId] = currentChipMap[chipId];
  });

  Object.keys(addChipMap).forEach((chipId) => {
    newChipMap[chipId] = (currentChipMap[chipId] ?? 0) + addChipMap[chipId];
  });

  Object.keys(removeChipMap).forEach((chipId) => {
    newChipMap[chipId] = (currentChipMap[chipId] ?? 0) - removeChipMap[chipId];
  });

  return newChipMap;
}

// TODO: Create utils function for chip payout calculation
function getChipPayout(
  currentChipMap: Record<string, number>,
  chipValueMap: Record<string, number>,
): number {
  let payout = 0;
  if (!currentChipMap) return 0;

  Object.keys(currentChipMap).forEach((chipId) => {
    const value = chipValueMap[chipId] ?? 0;
    payout += value * currentChipMap[chipId];
  });

  return Math.floor(payout * 100) / 100; // round final payout
}

function getChipNegotiationTurnData(
  transaction: ChipTransaction,
  playerMetadata: ChipNegotiationGameMetadata,
  currentChipMap: Record<string, Record<string, number>>,
): {
  turn: ChipNegotiationTurnData;
  currentChipMap: Record<string, Record<string, number>>;
} {
  const senderId = transaction.offer.senderId;
  const before = currentChipMap;
  const after: Record<string, Record<string, number>> = {};

  // If appropriate, do transaction
  if (
    transaction.status === ChipTransactionStatus.ACCEPTED &&
    transaction.recipientId !== null
  ) {
    const offer = transaction.offer;
    after[senderId] = runChipTransaction(
      before[senderId],
      offer.buy,
      offer.sell,
    );
    after[transaction.recipientId] = runChipTransaction(
      before[transaction.recipientId],
      offer.sell,
      offer.buy,
    );
  } else {
    after[senderId] = before[senderId];
  }

  const senderChipValueMap = playerMetadata.participantChipValueMap[senderId];
  const senderData: ChipNegotiationSenderData = {
    participantId: senderId,
    chipValues: playerMetadata.participantChipValueMap[senderId],
    chipsBeforeTurn: before[senderId] ?? {},
    chipsAfterTurn: after[senderId] ?? {},
    payoutBeforeTurn: getChipPayout(before[senderId], senderChipValueMap),
    payoutAfterTurn: getChipPayout(after[senderId], senderChipValueMap),
  };

  const responseData: Record<string, ChipNegotiationResponderData> = {};
  Object.keys(transaction.responseMap).forEach((responderId) => {
    if (!after[responderId]) {
      after[responderId] = before[responderId];
    }
    const offerResponse = transaction.responseMap[responderId];
    const responderChipValueMap =
      playerMetadata.participantChipValueMap[responderId];

    responseData[responderId] = {
      participantId: responderId,
      selectedAsRecipient: responderId === transaction.recipientId,
      offerResponse: offerResponse.response,
      offerResponseTimestamp: offerResponse.timestamp,
      chipValues: playerMetadata.participantChipValueMap[responderId],
      chipsBeforeTurn: before[responderId] ?? {},
      chipsAfterTurn: after[responderId] ?? {},
      payoutBeforeTurn: getChipPayout(
        before[responderId],
        responderChipValueMap,
      ),
      payoutAfterTurn: getChipPayout(after[responderId], responderChipValueMap),
    };
  });

  return {
    turn: {transaction, senderData, responseData},
    currentChipMap: after,
  };
}

// ****************************************************************************
// CSV DATA TYPES
// ****************************************************************************

/** CSV chat history data. */
export interface ChatHistoryData {
  experimentName: string;
  cohortId: string;
  stageId: string;
  data: string[][];
}

// ****************************************************************************
// CSV DATA FUNCTIONS
// ****************************************************************************

/** Returns CSV data for all participants in experiment download. */
export function getParticipantData(data: ExperimentDownload) {
  const participantData: string[][] = [];

  // Add headings
  participantData.push(
    getAllParticipantCSVColumns(data, null, data.participantMap),
  );

  // Add participants
  for (const participant of Object.values(data.participantMap)) {
    participantData.push(
      getAllParticipantCSVColumns(data, participant, data.participantMap),
    );
  }
  return participantData;
}

/** Returns CSV data for all chat histories in experiment download. */
export function getChatHistoryData(
  data: ExperimentDownload,
): ChatHistoryData[] {
  const chatData: ChatHistoryData[] = [];
  for (const cohortId of Object.keys(data.cohortMap)) {
    const cohort = data.cohortMap[cohortId];
    for (const stageId of Object.keys(cohort.chatMap)) {
      const chat = cohort.chatMap[stageId];
      const chatHistory: string[][] = [];
      // Add headings
      chatHistory.push(getChatMessageCSVColumns());
      // Add chat messages
      for (const message of chat) {
        chatHistory.push(getChatMessageCSVColumns(message));
      }
      chatData.push({
        experimentName: data.experiment.metadata.name,
        cohortId,
        stageId,
        data: chatHistory,
      });
    }
  }
  return chatData;
}

/** Returns all CSV columns for given participant (or headings if null). */
export function getAllParticipantCSVColumns(
  data: ExperimentDownload,
  participant: ParticipantDownload | null = null,
  participantMap: Record<string, ParticipantDownload> = {},
) {
  let participantColumns = getParticipantProfileCSVColumns(
    participant?.profile ?? null,
  );

  // For each answer stage, add columns
  data.experiment.stageIds.forEach((stageId) => {
    const stageConfig = data.stageMap[stageId];
    if (!stageConfig) return;

    switch (stageConfig.kind) {
      case StageKind.SURVEY:
        const surveyColumns = getSurveyStageCSVColumns(
          stageConfig,
          participant,
        );
        participantColumns = [...participantColumns, ...surveyColumns];
        break;
      case StageKind.SURVEY_PER_PARTICIPANT:
        const sppColumns = getSurveyPerParticipantStageCSVColumns(
          stageConfig,
          participant,
          participantMap,
        );
        participantColumns = [...participantColumns, ...sppColumns];
        break;
      case StageKind.RANKING:
        const rankingColumns = getRankingStageCSVColumns(
          stageConfig,
          data,
          participant,
        );
        participantColumns = [...participantColumns, ...rankingColumns];
        break;
      case StageKind.PAYOUT:
        const payoutColumns = getPayoutStageCSVColumns(
          stageConfig,
          data,
          participant,
        );
        participantColumns = [...participantColumns, ...payoutColumns];
        break;
      default:
        break;
    }
  });
  return participantColumns;
}

/** Create CSV columns for participant profile. */
export function getParticipantProfileCSVColumns(
  profile: ParticipantProfileExtended | null = null, // if null, return headers
): string[] {
  const columns: string[] = [];

  // Private ID
  columns.push(!profile ? 'Private ID' : profile.privateId);

  // Public ID
  columns.push(!profile ? 'Public ID' : profile.publicId);

  // Prolific ID
  columns.push(!profile ? 'Prolific ID' : (profile.prolificId ?? ''));

  // Profile name
  columns.push(!profile ? 'Name' : toCSV(profile.name));

  // Profile avatar
  columns.push(!profile ? 'Avatar' : toCSV(profile.avatar));

  // Profile pronouns
  columns.push(!profile ? 'Pronouns' : toCSV(profile.pronouns));

  // Current status
  columns.push(!profile ? 'Current status' : profile.currentStatus);

  // Current stage ID
  columns.push(!profile ? 'Current stage ID' : profile.currentStageId);

  // Current cohort ID
  columns.push(!profile ? 'Current cohort ID' : profile.currentCohortId);

  // Transfer cohort ID
  columns.push(
    !profile ? 'Transfer cohort ID' : (profile.transferCohortId ?? ''),
  );

  // Start experiment timestamp
  const startTimestamp = profile?.timestamps.startExperiment
    ? convertUnifiedTimestampToISO(profile.timestamps.startExperiment)
    : '';
  columns.push(!profile ? 'Start experiment timestamp' : startTimestamp);

  // End experiment timestamp
  const endTimestamp = profile?.timestamps.endExperiment
    ? convertUnifiedTimestampToISO(profile.timestamps.endExperiment)
    : '';
  columns.push(!profile ? 'End experiment timestamp' : endTimestamp);

  // Accepted TOS timestamp
  const tosTimestamp = profile?.timestamps.acceptedTOS
    ? convertUnifiedTimestampToISO(profile.timestamps.acceptedTOS)
    : '';
  columns.push(!profile ? 'Accepted TOS timestamp' : tosTimestamp);

  // TODO: Add columns for stage and time completed
  // based on given list of stage configs

  return columns;
}

/** Create CSV columns for payout stage. */
export function getPayoutStageCSVColumns(
  payoutStage: PayoutStageConfig,
  data: ExperimentDownload, // used to extract cohort public data
  participant: ParticipantDownload | null = null, // if null, return headers
): string[] {
  const columns: string[] = [];

  // Get public data map from relevant cohort
  const cohortId = participant ? participant.profile.currentCohortId : null;
  const publicDataMap = cohortId ? data.cohortMap[cohortId]?.dataMap : {};

  // Get participant answer (which specifies which random selection
  // payout items to use)
  const answer = !participant
    ? null
    : (participant.answerMap[payoutStage.id] as PayoutStageParticipantAnswer);

  // Get payout results
  const resultConfig =
    participant && answer
      ? calculatePayoutResult(
          payoutStage,
          answer,
          data.stageMap,
          publicDataMap,
          participant.profile,
        )
      : null;

  payoutStage.payoutItems.forEach((item) => {
    // Skip if payout item is not active
    if (!item.isActive) return;

    const resultItem =
      resultConfig?.results.find((result) => result.id === item.id) ?? null;

    // Name of payout item
    const name = `${toCSV(item?.name)} (${item?.id})`;

    // Column for amount earned if stage completed
    columns.push(
      !participant
        ? `Payout earned if stage completed - ${name} - Stage ${payoutStage.id}`
        : // Get amount earned from result config
          (resultItem?.baseAmountEarned.toString() ?? ''),
    );

    if (item.type === PayoutItemType.SURVEY) {
      // Column for ranking stage whose winner is used
      // (or null if using current participant's answers)
      columns.push(
        !participant
          ? `Ranking stage used for payout - ${name} - Stage ${payoutStage.id}`
          : (item.rankingStageId ?? ''),
      );

      // For each question in payout stage config that is also
      // in payout item question map, column for amount earned
      const surveyQuestions =
        (data.stageMap[item.stageId] as SurveyStageConfig)?.questions ?? [];
      surveyQuestions.forEach((question) => {
        if (item.questionMap[question.id]) {
          const questionResult =
            resultItem?.type === PayoutItemType.SURVEY
              ? resultItem.questionResults.find(
                  (result) => result.question.id === question.id,
                )
              : null;
          columns.push(
            !participant
              ? `Correct answer payout - "${toCSV(question.questionTitle)}" - ${name} - Stage ${payoutStage.id}`
              : (questionResult?.amountEarned.toString() ?? ''),
          );
        }
      });
    }
  });

  // Column for payout total
  columns.push(
    !participant
      ? `Total payout - Stage ${payoutStage.id}`
      : resultConfig
        ? calculatePayoutTotal(resultConfig).toString()
        : '',
  );

  return columns;
}

/** Create CSV columns for ranking stage answers. */
export function getRankingStageCSVColumns(
  rankingStage: RankingStageConfig,
  data: ExperimentDownload, // used to extract ranking public data for cohort
  participant: ParticipantDownload | null = null, // if null, return headers
): string[] {
  const columns: string[] = [];

  // Extract participant answer for ranking stage
  const stageAnswer = participant
    ? participant.answerMap[rankingStage.id]
    : null;

  // Extract winner ID from cohort ranking public data
  const cohortId = participant ? participant.profile.currentCohortId : null;
  const publicData = cohortId
    ? data.cohortMap[cohortId]?.dataMap[rankingStage.id]
    : null;
  const winnerId =
    publicData?.kind === StageKind.RANKING ? publicData.winnerId : '';

  // Add column for ranking stage type
  columns.push(
    !participant
      ? `Ranking type - ${rankingStage.id}`
      : rankingStage.rankingType,
  );

  // Add columns for ranking stage strategy
  columns.push(
    !participant
      ? `Ranking strategy - ${rankingStage.id}`
      : rankingStage.strategy,
  );

  // Add column for participant's cohort (since winners are per cohort)
  columns.push(!participant ? `Participant's cohort ID` : (cohortId ?? ''));

  // Add column for ranking winner
  columns.push(
    !participant
      ? `Ranking winner (for participant's cohort) - ${rankingStage.id}`
      : winnerId,
  );

  // Add column for participant's rankings
  columns.push(
    !participant
      ? `Participant rankings - ${rankingStage.id}`
      : stageAnswer?.kind === StageKind.RANKING
        ? `"${stageAnswer.rankingList.join(',')}"`
        : '',
  );

  return columns;
}

/** Create CSV columns for survey stage answers. */
export function getSurveyStageCSVColumns(
  surveyStage: SurveyStageConfig,
  participant: ParticipantDownload | null = null, // if null, return headers
): string[] {
  const columns: string[] = [];

  const stageAnswer = participant
    ? participant.answerMap[surveyStage.id]
    : null;
  surveyStage.questions.forEach((question) => {
    const answer =
      stageAnswer?.kind === StageKind.SURVEY
        ? stageAnswer?.answerMap[question.id]
        : null;

    switch (question.kind) {
      case SurveyQuestionKind.TEXT:
        const textAnswer =
          answer?.kind === SurveyQuestionKind.TEXT ? answer?.answer : '';
        columns.push(
          !participant
            ? `"${toCSV(question.questionTitle)}" - Survey ${surveyStage.id}`
            : toCSV(textAnswer),
        );
        break;
      case SurveyQuestionKind.CHECK:
        const checkAnswer =
          answer?.kind === SurveyQuestionKind.CHECK
            ? answer?.isChecked.toString()
            : '';
        columns.push(
          !participant
            ? `"${toCSV(question.questionTitle)}" - Survey ${surveyStage.id}`
            : checkAnswer,
        );
        break;
      case SurveyQuestionKind.MULTIPLE_CHOICE:
        const mcAnswer =
          answer?.kind === SurveyQuestionKind.MULTIPLE_CHOICE
            ? answer?.choiceId
            : '';
        // Add columns for every multiple choice option
        question.options.forEach((item, index) => {
          columns.push(
            !participant
              ? `Option ${index + 1} (${item.id}) - "${toCSV(
                  question.questionTitle,
                )}" - Survey ${surveyStage.id}`
              : item.text,
          );
        });
        // If correct answer, add column for correct answer
        if (question.correctAnswerId) {
          columns.push(
            !participant
              ? `Correct answer - "${toCSV(question.questionTitle)}" - Survey ${surveyStage.id}`
              : (question.options.find(
                  (item) => item.id === question.correctAnswerId,
                )?.text ?? ''),
          );
        }
        // Add column for participant answer ID
        columns.push(
          !participant
            ? `Participant answer (ID) - "${toCSV(question.questionTitle)}" - Survey ${surveyStage.id}`
            : mcAnswer,
        );
        // Add column for participant text answer
        columns.push(
          !participant
            ? `Participant answer (text) - "${toCSV(question.questionTitle)}" - Survey ${surveyStage.id}`
            : (question.options.find((item) => item.id === mcAnswer)?.text ??
                ''),
        );
        // If correct answer, add column for if answer was correct
        if (question.correctAnswerId) {
          columns.push(
            !participant
              ? `Is participant correct? - "${toCSV(question.questionTitle)}" - Survey ${surveyStage.id}`
              : (mcAnswer === question.correctAnswerId).toString(),
          );
        }
        break;
      case SurveyQuestionKind.SCALE:
        const scaleAnswer =
          answer?.kind === SurveyQuestionKind.SCALE
            ? answer?.value.toString()
            : '';
        columns.push(
          !participant
            ? `"${toCSV(question.questionTitle)}" - Survey ${surveyStage.id}`
            : scaleAnswer,
        );
        break;
      default:
        break;
    }
  });

  return columns;
}

/** Create CSV columns for survey-per-participant stage answers. */
export function getSurveyPerParticipantStageCSVColumns(
  stage: SurveyPerParticipantStageConfig,
  participant: ParticipantDownload | null = null, // if null, return headers
  participantMap: Record<string, ParticipantDownload> = {},
): string[] {
  const columns: string[] = [];
  const stageAnswer = participant ? participant.answerMap[stage.id] : null;
  const participantList = Object.keys(participantMap);

  participantList.forEach((participantId) => {
    const answerMap =
      stageAnswer?.kind === StageKind.SURVEY_PER_PARTICIPANT
        ? (stageAnswer?.answerMap[participantId] ?? {})
        : {};

    stage.questions.forEach((question) => {
      const answer = answerMap[question.id];
      switch (question.kind) {
        case SurveyQuestionKind.TEXT:
          const textAnswer =
            answer?.kind === SurveyQuestionKind.TEXT ? answer?.answer : '';
          columns.push(
            !participant
              ? `"${toCSV(question.questionTitle)}" - ${participantId} - Per-Participant Survey ${stage.id}`
              : toCSV(textAnswer),
          );
          break;
        case SurveyQuestionKind.CHECK:
          const checkAnswer =
            answer?.kind === SurveyQuestionKind.CHECK
              ? answer?.isChecked.toString()
              : '';
          columns.push(
            !participant
              ? `"${toCSV(question.questionTitle)}" - ${participantId} - Per-Participant Survey ${stage.id}`
              : checkAnswer,
          );
          break;
        case SurveyQuestionKind.MULTIPLE_CHOICE:
          const mcAnswer =
            answer?.kind === SurveyQuestionKind.MULTIPLE_CHOICE
              ? answer?.choiceId
              : '';
          // Add columns for every multiple choice option
          question.options.forEach((item, index) => {
            columns.push(
              !participant
                ? `Option ${index + 1} (${item.id}) - "${toCSV(
                    question.questionTitle,
                  )}" - ${participantId} - Per-Participant Survey ${stage.id}`
                : item.text,
            );
          });
          // If correct answer, add column for correct answer
          if (question.correctAnswerId) {
            columns.push(
              !participant
                ? `Correct answer - "${toCSV(question.questionTitle)}" - ${participantId} - Per-Participant Survey ${stage.id}`
                : (question.options.find(
                    (item) => item.id === question.correctAnswerId,
                  )?.text ?? ''),
            );
          }
          // Add column for participant answer ID
          columns.push(
            !participant
              ? `Participant answer (ID) - "${toCSV(question.questionTitle)}" - ${participantId} - Per-Participant Survey ${stage.id}`
              : mcAnswer,
          );
          // Add column for participant text answer
          columns.push(
            !participant
              ? `Participant answer (text) - "${toCSV(question.questionTitle)}" - ${participantId} - Per-Participant Survey ${stage.id}`
              : (question.options.find((item) => item.id === mcAnswer)?.text ??
                  ''),
          );
          // If correct answer, add column for if answer was correct
          if (question.correctAnswerId) {
            columns.push(
              !participant
                ? `Is participant correct? - "${toCSV(question.questionTitle)}" - ${participantId} - Per-Participant Survey ${stage.id}`
                : (mcAnswer === question.correctAnswerId).toString(),
            );
          }
          break;
        case SurveyQuestionKind.SCALE:
          const scaleAnswer =
            answer?.kind === SurveyQuestionKind.SCALE
              ? answer?.value.toString()
              : '';
          columns.push(
            !participant
              ? `"${toCSV(question.questionTitle)}" - ${participantId} - Per-Participant Survey ${stage.id}`
              : scaleAnswer,
          );
          break;
        default:
          break;
      }
    });
  });

  return columns;
}

/** Create CSV columns for ChatMessage. */
export function getChatMessageCSVColumns(
  message: ChatMessage | null = null, // if null, return headers
): string[] {
  const columns: string[] = [];

  // Timestamp
  columns.push(
    !message ? 'Timestamp' : convertUnifiedTimestampToISO(message.timestamp),
  );

  // ID
  columns.push(!message ? 'Message ID' : message.id);

  // Discussion ID
  columns.push(!message ? 'Discussion ID' : (message.discussionId ?? ''));

  // Type
  columns.push(!message ? 'Message type' : message.type);

  // Participant public ID (if participant chat message)
  const publicId =
    message?.type === ChatMessageType.PARTICIPANT
      ? message.participantPublicId
      : '';
  columns.push(!message ? 'Participant public ID' : publicId);

  // Profile name
  columns.push(!message ? 'Sender name' : toCSV(message.profile.name));

  // Profile avatar
  columns.push(!message ? 'Sender avatar' : toCSV(message.profile.avatar));

  // Profile pronouns
  columns.push(!message ? 'Sender pronouns' : toCSV(message.profile.pronouns));

  // Message content
  columns.push(!message ? 'Message content' : toCSV(message.message));

  return columns;
}
