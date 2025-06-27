import {Value} from '@sinclair/typebox/value';
import {
  ChipLogEntry,
  ChipOfferStatus,
  ChipStageConfig,
  ChipStagePublicData,
  SendChipOfferData,
  displayChipOfferText,
  SendChipResponseData,
  SetChipTurnData,
  StageKind,
  createChipOfferLogEntry,
  createChipRoundLogEntry,
  createChipTurnLogEntry,
  createChipTransaction,
  generateId,
} from '@deliberation-lab/utils';

import * as admin from 'firebase-admin';
import {Timestamp} from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import {onCall} from 'firebase-functions/v2/https';

import {app} from '../app';
import {
  getExperimenterDataFromExperiment,
  getFirestoreCohortParticipants,
  getFirestoreParticipant,
  getFirestoreParticipants,
  getFirestoreParticipantAnswer,
  getFirestoreStage,
  getFirestoreStagePublicData,
} from '../utils/firestore';
import {
  checkConfigDataUnionOnPath,
  isUnionError,
  prettyPrintError,
  prettyPrintErrors,
} from '../utils/validation';

import {
  addChipOfferToPublicData,
  addChipResponseToPublicData,
  getChipOfferAssistance,
  getChipParticipants,
  getChipResponseAssistance,
  updateChipCurrentTurn,
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
  const {data} = request;

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
    const publicStageData = (
      await publicDoc.get()
    ).data() as ChipStagePublicData;

    // If turn is already set, then no action needed
    if (publicStageData.currentTurn !== null) {
      return {success: false};
    }

    // Get relevant (active, in cohort) participant IDs
    const participants = await getChipParticipants(
      data.experimentId,
      data.cohortId,
    );

    // If no participants, then no action needed
    if (participants.length === 0) {
      return {success: false};
    }

    const stageConfig = (await stageDoc.get()).data() as ChipStageConfig;

    const newData = updateChipCurrentTurn(
      publicStageData,
      participants,
      stageConfig.numRounds,
    );

    transaction.set(publicDoc, newData);
    transaction.set(
      logCollection.doc(),
      createChipRoundLogEntry(newData.currentRound, Timestamp.now()),
    );
    transaction.set(
      logCollection.doc(),
      createChipTurnLogEntry(
        newData.currentRound,
        newData.currentTurn,
        Timestamp.now(),
      ),
    );
  }); // end transaction

  return {success: true};
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
  const {data} = request;

  // Validate input
  const validInput = Value.Check(SendChipOfferData, data);
  if (!validInput) {
    handleSendChipOfferValidationErrors(data);
  }

  // Add chip offer to public data
  const success = await addChipOfferToPublicData(
    data.experimentId,
    data.cohortId,
    data.stageId,
    data.chipOffer,
  );

  return {success};
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
  const {data} = request;

  // Validate input
  const validInput = Value.Check(SendChipResponseData, data);
  if (!validInput) {
    handleSendChipResponseValidationErrors(data);
  }

  const success = addChipResponseToPublicData(
    data.experimentId,
    data.cohortId,
    data.stageId,
    data.participantPublicId,
    data.chipResponse,
  );

  return {success};
});

// ************************************************************************* //
// requestChipAssistance endpoint                                       //
// Returns LLM API response to requested assistance with chip offer/response //
//                                                                           //
// Input structure: {                                                        //
//   experimentId, cohortId, stageId,                                        //
//   participantId, assistanceMode,                                          //
//   (optionally filled for coach mode: buyMap, sellMap, offerResponse)      //
// }                                                                         //
// Validation: utils/src/chip.validation.ts                                  //
// ************************************************************************* //
export const requestChipAssistance = onCall(async (request) => {
  const {data} = request;

  console.log(data)

  const participant = await getFirestoreParticipant(
    data.experimentId,
    data.participantId,
  );
  if (!participant) return {data: ''};

  const participantAnswer = await getFirestoreParticipantAnswer(
    data.experimentId,
    data.participantId,
    data.stageId,
  );
  if (!participantAnswer) return {data: ''};

  const stage = await getFirestoreStage(data.experimentId, data.stageId);
  if (stage?.kind !== StageKind.CHIP) return {data: ''};

  const publicData = await getFirestoreStagePublicData(
    data.experimentId,
    data.cohortId,
    data.stageId,
  );
  if (publicData?.kind !== StageKind.CHIP) return {data: ''};

  // If not current participant, give chip response assistance with offer
  if (publicData.currentTurn !== participant.publicId) {
    const roundMap =
      publicData.participantOfferMap[publicData.currentRound] ?? {};
    const currentOffer = roundMap[publicData.currentTurn].offer;
    if (!currentOffer) {
      return {data: null};
    }

    return {
      data: await getChipResponseAssistance(
        data.experimentId,
        stage,
        publicData,
        await getFirestoreCohortParticipants(data.experimentId, data.cohortId),
        participant,
        participantAnswer,
        await getExperimenterDataFromExperiment(data.experimentId),
        data.assistanceMode,
        currentOffer,
        data.offerResponse,
      ),
    };
  }

  // Otherwise, assist with offer
  return {
    data: await getChipOfferAssistance(
      data.experimentId,
      stage,
      publicData,
      await getFirestoreCohortParticipants(data.experimentId, data.cohortId),
      participant,
      participantAnswer,
      await getExperimenterDataFromExperiment(data.experimentId),
      data.assistanceMode,
      data.buyMap ?? {},
      data.sellMap ?? {},
    ),
  };
});

// ************************************************************************* //
// VALIDATION FUNCTIONS                                                      //
// ************************************************************************* //

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
