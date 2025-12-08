import {Value} from '@sinclair/typebox/value';
import {
  SendBargainOfferData,
  SendBargainResponseData,
  StartBargainGameData,
  BargainStageConfig,
  BargainStagePublicData,
  StageKind,
  ParticipantProfileExtended,
} from '@deliberation-lab/utils';

import {onCall} from 'firebase-functions/v2/https';

import {app} from '../app';
import {prettyPrintErrors} from '../utils/validation';

import {processBargainOffer, processBargainResponse, initializeBargainStage} from './bargain.utils';

/** Manage bargain negotiation offers and responses. */

// ************************************************************************* //
// startBargainGame endpoint                                                 //
//                                                                           //
// Initialize the bargaining game when a participant clicks "Start Game"    //
// button. Assigns roles, valuations, and randomizes game parameters.       //
//                                                                           //
// Input structure: {                                                        //
//   experimentId, cohortId, stageId                                         //
// }                                                                         //
// Validation: utils/src/stages/bargain_stage.validation.ts                 //
// ************************************************************************* //
export const startBargainGame = onCall(async (request) => {
  const {data} = request;

  // Validate input
  const validInput = Value.Check(StartBargainGameData, data);
  if (!validInput) {
    const errors = [...Value.Errors(StartBargainGameData, data)];
    throw new Error(
      `Invalid startBargainGame data: ${prettyPrintErrors(errors)}`,
    );
  }

  // Define stage config document reference
  const stageDoc = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('stages')
    .doc(data.stageId);

  // Define public data document reference
  const publicDoc = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('cohorts')
    .doc(data.cohortId)
    .collection('publicStageData')
    .doc(data.stageId);

  await app.firestore().runTransaction(async (transaction) => {
    const publicDataSnapshot = await transaction.get(publicDoc);
    let publicData = publicDataSnapshot.data() as BargainStagePublicData | undefined;

    // If game is already started (currentTurn is not null), no action needed
    if (publicData && publicData.currentTurn !== null) {
      console.log('[BARGAIN] Game already started, currentTurn:', publicData.currentTurn);
      return {success: false, message: 'Game already started'};
    }

    // Get all participants in this cohort who are at this stage
    const participantsSnapshot = await app
      .firestore()
      .collection('experiments')
      .doc(data.experimentId)
      .collection('participants')
      .where('currentCohortId', '==', data.cohortId)
      .where('currentStageId', '==', data.stageId)
      .get();

    const participantsAtStage = participantsSnapshot.docs.map(
      (doc) => doc.data() as ParticipantProfileExtended,
    );

    console.log('[BARGAIN] Participants at stage:', {
      count: participantsAtStage.length,
      participantIds: participantsAtStage.map((p) => p.publicId),
    });

    // Need at least 2 participants to start the game
    if (participantsAtStage.length < 2) {
      console.log('[BARGAIN] Not enough participants to start game');
      return {success: false, message: 'Need at least 2 participants'};
    }

    // Initialize readyParticipants if not exists (convert Set to array for Firestore)
    const readyParticipantsArray = publicData?.readyParticipants
      ? Array.from(publicData.readyParticipants as any)
      : [];

    // Add current participant to ready list if not already there
    if (!readyParticipantsArray.includes(data.participantPublicId)) {
      readyParticipantsArray.push(data.participantPublicId);
      console.log('[BARGAIN] Participant marked as ready:', data.participantPublicId);
    }

    // Check if we have enough ready participants (need at least 2)
    if (readyParticipantsArray.length < 2) {
      console.log('[BARGAIN] Waiting for more participants to be ready:', {
        ready: readyParticipantsArray.length,
        needed: 2,
        readyParticipants: readyParticipantsArray,
      });

      // Update public data with ready status but don't start game yet
      if (publicData) {
        transaction.update(publicDoc, {
          readyParticipants: readyParticipantsArray,
        });
      } else {
        // Initialize public data if it doesn't exist
        transaction.set(publicDoc, {
          id: data.stageId,
          kind: StageKind.BARGAIN,
          isGameOver: false,
          currentTurn: null,
          maxTurns: 8,
          chatEnabled: false,
          currentOfferer: null,
          participantRoles: {},
          readyParticipants: readyParticipantsArray,
          transactions: [],
          agreedPrice: null,
        });
      }

      return {success: true, message: 'Waiting for other participants', ready: readyParticipantsArray.length};
    }

    // All required participants are ready, start the game!
    console.log('[BARGAIN] All participants ready, starting game initialization');

    // Get stage config
    const stageSnapshot = await transaction.get(stageDoc);
    const stageConfig = stageSnapshot.data() as BargainStageConfig;

    if (!stageConfig || stageConfig.kind !== StageKind.BARGAIN) {
      throw new Error('Invalid stage configuration');
    }

    // Initialize the bargain stage
    await initializeBargainStage(
      transaction,
      data.experimentId,
      data.cohortId,
      stageConfig,
      participantsAtStage,
    );

    return {success: true, message: 'Game started successfully', ready: readyParticipantsArray.length};
  });

  return {success: true};
});

// ************************************************************************* //
// sendBargainOffer endpoint                                                 //
//                                                                           //
// Process an offer from a participant                                       //
//                                                                           //
// Input structure: {                                                        //
//   experimentId, cohortId, stageId,                                        //
//   participantPublicId, participantPrivateId,                              //
//   price, message                                                          //
// }                                                                         //
// Validation: utils/src/stages/bargain_stage.validation.ts                 //
// ************************************************************************* //
export const sendBargainOffer = onCall(async (request) => {
  const {data} = request;

  // Validate input
  const validInput = Value.Check(SendBargainOfferData, data);
  if (!validInput) {
    const errors = [...Value.Errors(SendBargainOfferData, data)];
    throw new Error(
      `Invalid sendBargainOffer data: ${prettyPrintErrors(errors)}`,
    );
  }

  await app.firestore().runTransaction(async (transaction) => {
    await processBargainOffer(
      transaction,
      data.experimentId,
      data.cohortId,
      data.stageId,
      data.participantPublicId,
      data.price,
      data.message,
    );
  });

  return {success: true};
});

// ************************************************************************* //
// sendBargainResponse endpoint                                              //
//                                                                           //
// Process a response (accept/reject) from a participant                     //
//                                                                           //
// Input structure: {                                                        //
//   experimentId, cohortId, stageId,                                        //
//   participantPublicId, participantPrivateId,                              //
//   accept, message                                                         //
// }                                                                         //
// Validation: utils/src/stages/bargain_stage.validation.ts                 //
// ************************************************************************* //
export const sendBargainResponse = onCall(async (request) => {
  const {data} = request;

  // Validate input
  const validInput = Value.Check(SendBargainResponseData, data);
  if (!validInput) {
    const errors = [...Value.Errors(SendBargainResponseData, data)];
    throw new Error(
      `Invalid sendBargainResponse data: ${prettyPrintErrors(errors)}`,
    );
  }

  await app.firestore().runTransaction(async (transaction) => {
    await processBargainResponse(
      transaction,
      data.experimentId,
      data.cohortId,
      data.stageId,
      data.participantPublicId,
      data.participantPrivateId,
      data.accept,
      data.message,
    );
  });

  return {success: true};
});
