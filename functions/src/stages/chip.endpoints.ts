import { Value } from '@sinclair/typebox/value';
import {
  ChipLogEntry,
  ChipOfferStatus,
  ChipStageConfig,
  ChipStagePublicData,
  SendChipOfferData,
  displayChipOfferText,
  SendChipResponseData,
  SetChipTurnData,
  createChipOfferLogEntry,
  createChipRoundLogEntry,
  createChipTurnLogEntry,
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

import { getChipParticipantIds, updateChipCurrentTurn } from './chip.utils';

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

  // Define chip stage config
  const stageDoc = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('stages')
    .doc(data.stageId);

  // Define chip stage public data document reference
  const publicDoc = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('cohorts')
    .doc(data.cohortId)
    .collection('publicStageData')
    .doc(data.stageId);

  // Define log entry collection reference
  const logCollection = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('cohorts')
    .doc(data.cohortId)
    .collection('publicStageData')
    .doc(data.stageId)
    .collection('logs');

  await app.firestore().runTransaction(async (transaction) => {
    const publicStageData = (await publicDoc.get()).data() as ChipStagePublicData;

    // If turn is already set, then no action needed
    if (publicStageData.currentTurn !== null) {
      return { success: false };
    }

    // Get relevant (active, in cohort) participant IDs
    const participantIds = await getChipParticipantIds(data.experimentId, data.cohortId);

    // If no participants, then no action needed
    if (participantIds.length === 0) {
      return { success: false };
    }

    const stageConfig = (await stageDoc.get()).data() as ChipStageConfig;

    const newData = updateChipCurrentTurn(publicStageData, participantIds, stageConfig.numRounds);

    transaction.set(publicDoc, newData);
    transaction.set(
      logCollection.doc(),
      createChipRoundLogEntry(newData.currentRound, Timestamp.now()),
    );
    transaction.set(
      logCollection.doc(),
      createChipTurnLogEntry(
        newData.currentRound + 1,
        newData.currentTurn.participantId,
        Timestamp.now()
      ),
    );
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

  // Define chip stage public data document reference
  const publicDoc = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('cohorts')
    .doc(data.cohortId)
    .collection('publicStageData')
    .doc(data.stageId);

  // Define log entry collection reference
  const logCollection = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('cohorts')
    .doc(data.cohortId)
    .collection('publicStageData')
    .doc(data.stageId)
    .collection('logs');

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    // Set offer round based on public stage current round
    const publicStageData = (await publicDoc.get()).data() as ChipStagePublicData;
    const chipOffer = data.chipOffer;
    chipOffer.round = publicStageData.currentRound;

    // Confirm that offer is valid (it is the participant's turn to send offers
    // and there is not already an offer)
    if (
      chipOffer.senderId !== publicStageData.currentTurn?.participantId ||
      publicStageData.currentTurn.offer !== null
    ) {
      return { success: false };
    }

    // Update participant offer map in public stage data
    // (mark current participant as having submitted an offer)
    if (!publicStageData.participantOfferMap[chipOffer.round]) {
      publicStageData.participantOfferMap[chipOffer.round] = {};
    }
    publicStageData.participantOfferMap[chipOffer.round][data.participantPublicId] = true;

    // Update offer in current turn
    publicStageData.currentTurn.offer = chipOffer;

    // Set new public data
    transaction.set(publicDoc, publicStageData);

    // Add log entry for chip offer
    transaction.set(
      logCollection.doc(),
      createChipOfferLogEntry(data.chipOffer, Timestamp.now())
    );
  });

  return { success: true };
});

// ************************************************************************* //
// sendChipResponse endpoint                                                 //
// Send true/false response to current chip offer                            //
//                                                                           //
// Input structure: {                                                        //
//   experimentId, participantPrivateId, participantPublicId, cohortId,      //
//   stageId, chipResponse                                                   //
// }                                                                         //
// Validation: utils/src/chip.validation.ts                                  //
// ************************************************************************* //
export const sendChipResponse = onCall(async (request) => {
  const { data } = request;

  // Validate input
  const validInput = Value.Check(SendChipResponseData, data);
  if (!validInput) {
    handleSendChipResponseValidationErrors(data);
  }

  // Define chip stage public data document reference
  const publicDoc = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('cohorts')
    .doc(data.cohortId)
    .collection('publicStageData')
    .doc(data.stageId);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    // Confirm that offer is valid (ID matches the current offer ID)
    const publicStageData = (await publicDoc.get()).data() as ChipStagePublicData;
    // TODO: Check offer ID
    if (!publicStageData.currentTurn) {
      return { success: false };
    }

    // Update participant offer map in public stage data
    // (mark current participant as having responded to current offer)
    publicStageData.currentTurn.responseMap[data.participantPublicId] = data.chipResponse;

    // Set new public data
    transaction.set(publicDoc, publicStageData);
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

function handleSendChipResponseValidationErrors(data: any) {
  for (const error of Value.Errors(SendChipResponseData, data)) {
    if (isUnionError(error)) {
      const nested = checkConfigDataUnionOnPath(data, error.path);
      prettyPrintErrors(nested);
    } else {
      prettyPrintError(error);
    }
  }
}
