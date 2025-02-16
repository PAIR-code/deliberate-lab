import {
  SalespersonBoardCoord,
  SalespersonMove,
  SalespersonMoveStatus,
  SalespersonStageConfig,
  SalespersonStagePublicData,
  generateId,
} from '@deliberation-lab/utils';

import * as admin from 'firebase-admin';
import {Timestamp} from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import {onCall} from 'firebase-functions/v2/https';

import {app} from '../app';
import {getChipParticipants} from './chip.utils';

/** Start salesperson game by assigning first fetched
 * person in cohort as the controller.
 * { experimentId, cohortId, stageId }
 */
export const setSalespersonController = onCall(async (request) => {
  const {data} = request;

  // Define stage public data document reference
  const publicDoc = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('cohorts')
    .doc(data.cohortId)
    .collection('publicStageData')
    .doc(data.stageId);

  await app.firestore().runTransaction(async (transaction) => {
    const publicStageData = (
      await publicDoc.get()
    ).data() as SalespersonStagePublicData;

    // Check if controller already set
    if (publicStageData.controller.length > 0) {
      return {success: false};
    }

    const participants = await getChipParticipants(
      data.experimentId,
      data.cohortId,
    );
    if (participants.length === 0) {
      return {success: false};
    }
    publicStageData.controller = participants[0].publicId;
    transaction.set(publicDoc, publicStageData);
  });

  return {success: true};
});

/** Register controller's proposed move
 * { experimentId, cohortId, stageId, participantId, proposedColumn, proposedRow }
 */
export const setSalespersonMove = onCall(async (request) => {
  const {data} = request;

  // Define stage public data document reference
  const publicDoc = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('cohorts')
    .doc(data.cohortId)
    .collection('publicStageData')
    .doc(data.stageId);

  await app.firestore().runTransaction(async (transaction) => {
    const publicStageData = (
      await publicDoc.get()
    ).data() as SalespersonStagePublicData;

    // Check if person is controller
    if (publicStageData.controller !== data.participantId) {
      return {success: false};
    }
    // Check if move already in progress
    if (publicStageData.numMoves < publicStageData.moveHistory.length) {
      return {success: false};
    }
    // TODO: Check that row/column coord are valid
    const newMove: SalespersonMove = {
      proposedCoord: {row: data.proposedRow, column: data.proposedColumn},
      responseMap: {},
      status: SalespersonMoveStatus.PENDING,
    };
    publicStageData.moveHistory.push(newMove);
    transaction.set(publicDoc, publicStageData);
  });

  return {success: true};
});

/** Process non-controller's response
 * { experimentId, cohortId, stageId, participantId, response }
 */
export const setSalespersonResponse = onCall(async (request) => {
  const {data} = request;

  // Define stage public data document reference
  const publicDoc = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('cohorts')
    .doc(data.cohortId)
    .collection('publicStageData')
    .doc(data.stageId);
  const doc = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('stages')
    .doc(data.stageId);

  await app.firestore().runTransaction(async (transaction) => {
    const publicStageData = (
      await publicDoc.get()
    ).data() as SalespersonStagePublicData;

    // Confirm person is not controller
    if (publicStageData.controller === data.participantId) {
      return {success: false};
    }
    // Confirm pending move
    if (publicStageData.numMoves === publicStageData.moveHistory.length) {
      return {success: false};
    }

    // Otherwise, assume for now there is only one other player
    // and immediately process the move based on the incoming response
    // TODO: Account for >1 non-controller players
    if (publicStageData.moveHistory.length === 0) {
      return {success: false};
    }

    // Record participant response
    publicStageData.moveHistory[publicStageData.moveHistory.length - 1].status =
      data.response
        ? SalespersonMoveStatus.ACCEPTED
        : SalespersonMoveStatus.DECLINED;
    publicStageData.moveHistory[
      publicStageData.moveHistory.length - 1
    ].responseMap[data.participantId] = {
      response: data.response,
      timestamp: Timestamp.now(),
    };
    publicStageData.numMoves += 1;

    if (data.response === false) {
      transaction.set(publicDoc, publicStageData);
      return {success: true};
    }

    // If response is true, update coins and current coord
    const currentMove =
      publicStageData.moveHistory[publicStageData.moveHistory.length - 1];
    publicStageData.currentCoord = currentMove.proposedCoord;
    const stageConfig = (await doc.get()).data() as SalespersonStageConfig;
    let coins: SalespersonBoardCoord[] = [];
    Object.values(stageConfig.board.coinMap).forEach((coinList) => {
      coins = [...coins, ...coinList];
    });
    const column = currentMove.proposedCoord.column;
    const row = currentMove.proposedCoord.row;
    if (
      coins.find((coin) => coin.column === column && coin.row === row) &&
      !publicStageData.coinsCollected.find(
        (coin) => coin.column === column && coin.row === row,
      )
    ) {
      publicStageData.coinsCollected.push(currentMove.proposedCoord);
    }
    if (
      (stageConfig.board.maxNumberOfMoves !== null &&
        publicStageData.numMoves >= stageConfig.board.maxNumberOfMoves) ||
      (column === stageConfig.board.endCoord.column &&
        row === stageConfig.board.endCoord.row)
    ) {
      publicStageData.isGameOver = true;
    }
    transaction.set(publicDoc, publicStageData);
  });

  return {success: true};
});
