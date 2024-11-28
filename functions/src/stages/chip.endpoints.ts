import { Value } from '@sinclair/typebox/value';
import {
  ChipLogEntry,
  ChipOfferStatus,
  ChipStageParticipantAnswer,
  ChipStagePublicData,
  SendChipOfferData,
  SetChipTurnData,
  createChipStageParticipantAnswer,
  createChipTurn,
  generateId,
} from '@deliberation-lab/utils';

import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { onCall } from 'firebase-functions/v2/https';

import { app } from '../app';
import {
  checkConfigDataUnionOnPath,
  isUnionError,
  prettyPrintError,
  prettyPrintErrors,
} from '../utils/validation';

import {
  getChipParticipantIds,
  updateChipCurrentTurn
} from './chip.utils';


/** Manage chip negotiation offers. */

// ************************************************************************* //
// setChipTurn endpoint                                                      //
//                                                                           //
// If game is not over, set current turn based on first participant in       //
// cohort who has not yet submitted an offer for the current round           //
//                                                                           //
// Input structure: {                                                        //
//   experimentId, cohortId, stageId                                         //
// }                                                                         //
// Validation: utils/src/chip.validation.ts                                  //
// ************************************************************************* //
export const setChipTurn = onCall(async (request) => {
  const { data } = request;

  // Validate input
  const validInput = Value.Check(SetChipTurnData, data);
  if (!validInput) {
    handleSetChipTurnValidationErrors(data);
  }

  // Define chip stage public data document reference
  const publicDoc = app.firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('cohorts')
    .doc(data.cohortId)
    .collection('publicStageData')
    .doc(data.stageId);

  await app.firestore().runTransaction(async (transaction) => {
    const publicStageData =
      (await publicDoc.get()).data() as ChipStagePublicData;

    // If turn is already set, then no action needed
    if (publicStageData.currentTurn !== null) {
      return { success: false };
    }

    // Get relevant (active, in cohort) participant IDs
    const participantIds = await getChipParticipantIds(
      data.experimentId,
      data.cohortId
    );

    // If no participants, then no action needed
    if (participantIds.length === 0) {
      return { success: false };
    }

    const newData = updateChipCurrentTurn(publicStageData, participantIds);
    transaction.set(publicDoc, newData);
  }); // end transaction

  return { success: true };
});

// ************************************************************************* //
// sendChipOffer endpoint                                                    //
//                                                                           //
// Input structure: {                                                        //
//   experimentId, participantPrivateId, participantPublicId, cohortId,      //
//   stageId, chipOffer                                                      //
// }                                                                         //
// Validation: utils/src/chip.validation.ts                                  //
// ************************************************************************* //

export const sendChipOffer = onCall(async (request) => {
  const { data } = request;

  // Validate input
  const validInput = Value.Check(SendChipOfferData, data);
  if (!validInput) {
    handleSendChipOfferValidationErrors(data);
  }

  // Define participant answer document reference
  const answerDoc = app.firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(data.participantPrivateId)
    .collection('stageData')
    .doc(data.stageId);

  // Define chip stage public data document reference
  const publicDoc = app.firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('cohorts')
    .doc(data.cohortId)
    .collection('publicStageData')
    .doc(data.stageId);

  // Define log entry document reference
  const logId = generateId();
  const logDoc = app.firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('cohorts')
    .doc(data.cohortId)
    .collection('publicStageData')
    .doc(data.stageId)
    .collection('logs')
    .doc(logId);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    // Set offer round based on public stage current round
    const publicStageData =
      (await publicDoc.get()).data() as ChipStagePublicData;
    const chipOffer = data.chipOffer;
    chipOffer.round = publicStageData.currentRound;

    // Confirm that offer is valid (it is the participant's turn to send offers)
    if (chipOffer.senderId !== publicStageData.currentTurn?.participantId) {
      return { success: false };
    }

    // Update participant offer map in public stage data
    // (mark current participant as having submitted an offer)
    if (!publicStageData[chipOffer.round]) {
      publicStageData[chipOffer.round] = {};
    }
    publicStageData[chipOffer.round][data.participantPublicId] = true;

    // Update offer in current turn
    publicStageData.currentTurn.offer = chipOffer;

    // Set new public data
    transaction.set(publicDoc, publicStageData);

    // Get participant answer with existing chip quantities, pending offer
    const participantAnswer =
      (await answerDoc.get()).data() as ChipStageParticipantAnswer;

    // Add log entry for chip offer
    const logEntry: ChipLogEntry = {
      id: logId,
      participantId: data.participantPublicId,
      offer: chipOffer,
      offerStatus: ChipOfferStatus.PENDING,
      chipMap: participantAnswer.chipMap,
      timestamp: Timestamp.now(),
    };

    // If chip offer already exists, log this chip offer as failed
    if (participantAnswer.pendingOffer) {
      logEntry.offerStatus = ChipOfferStatus.BLOCKED;
      transaction.set(logDoc, logEntry);
      return { success: false };
    } else {
      transaction.set(logDoc, logEntry);
    }

    // Set new chip offer to pending
    participantAnswer.pendingOffer = chipOffer;
    transaction.set(answerDoc, participantAnswer);
  });

  return { success: true };
});

// ************************************************************************* //
// VALIDATION FUNCTIONS                                                      //
// ************************************************************************* //

function handleSetChipTurnValidationErrors(data: any) {
  for (const error of Value.Errors(SetChipTurnData, data)) {
    if (isUnionError(error)) {
      const nested = checkConfigDataUnionOnPath(data, error.path);
      prettyPrintErrors(nested);
    } else {
      prettyPrintError(error);
    }
  }
}

function handleSendChipOfferValidationErrors(data: any) {
  for (const error of Value.Errors(SendChipOfferData, data)) {
    if (isUnionError(error)) {
      const nested = checkConfigDataUnionOnPath(data, error.path);
      prettyPrintErrors(nested);
    } else {
      prettyPrintError(error);
    }
  }
}