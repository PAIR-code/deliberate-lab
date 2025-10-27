import {Value} from '@sinclair/typebox/value';
import {
  SendBargainOfferData,
  SendBargainResponseData,
} from '@deliberation-lab/utils';

import {onCall} from 'firebase-functions/v2/https';

import {app} from '../app';
import {prettyPrintErrors} from '../utils/validation';

import {processBargainOffer, processBargainResponse} from './bargain.utils';

/** Manage bargain negotiation offers and responses. */

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
