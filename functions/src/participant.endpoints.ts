import { Value } from '@sinclair/typebox/value';
import {
  CreateParticipantData,
  Experiment,
  ParticipantProfileExtendedData,
  createParticipantProfileExtended,
  generateParticipantPublicId,
} from '@deliberation-lab/utils';

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { onCall } from 'firebase-functions/v2/https';

import { app } from './app';
import { AuthGuard } from './utils/auth-guard';
import {
  checkConfigDataUnionOnPath,
  isUnionError,
  prettyPrintError,
  prettyPrintErrors,
} from './utils/validation';

/** Create, update, and delete participants. */

// ************************************************************************* //
// createParticipant endpoint                                                //
//                                                                           //
// Input structure: { experimentId, cohortId }                               //
// Validation: utils/src/participant.validation.ts                           //
// ************************************************************************* //

export const createParticipant = onCall(async (request) => {
  const { data } = request;

  // Validate input
  const validInput = Value.Check(CreateParticipantData, data);
  if (!validInput) {
    handleCreateParticipantValidationErrors(data);
  }

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    // Get number of participants in collection
    const numParticipants = (
      await app
      .firestore()
      .collection(`experiments/${data.experimentId}/participants`)
      .count().get())
    .data().count;

    // Use experiment config to get currentStageId
    const experiment = (
      await app.firestore().doc(`experiments/${data.experimentId}`).get()
    ).data() as Experiment;

    // Define participant config
    const publicId = generateParticipantPublicId(numParticipants);
    const participantConfig = createParticipantProfileExtended({
      publicId,
      currentStageId: experiment.stageIds[0],
      currentCohortId: data.cohortId,
    });

    // Define document reference
    const document = app.firestore()
      .collection('experiments')
      .doc(data.experimentId)
      .collection('participants')
      .doc(participantConfig.privateId);

    transaction.set(document, participantConfig);
  });

  return true;
});

function handleCreateParticipantValidationErrors(data: any) {
  for (const error of Value.Errors(CreateParticipantData, data)) {
    if (isUnionError(error)) {
      const nested = checkConfigDataUnionOnPath(data, error.path);
      prettyPrintErrors(nested);
    } else {
      prettyPrintError(error);
    }
  }

  throw new functions.https.HttpsError('invalid-argument', 'Invalid data');
}

// ************************************************************************* //
// updateParticipant endpoint for experimenters                              //
//                                                                           //
// Input structure: { experimentId, participnatConfig }                      //
// Validation: utils/src/participant.validation.ts                           //
// ************************************************************************* //


export const updateParticipant = onCall(async (request) => {
  await AuthGuard.isExperimenter(request);
  const { data } = request;

  // Validate input
  const validInput = Value.Check(ParticipantProfileExtendedData, data);
  if (!validInput) {
    handleUpdateParticipantValidationErrors(data);
  }

  // Define document reference
  const document = app.firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(participantConfig.privateId);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    transaction.set(document, participantConfig);
  });

  return { id: document.id };
});

function handleUpdateParticipantValidationErrors(data: any) {
  for (const error of Value.Errors(ParticipantProfileExtendedData, data)) {
    if (isUnionError(error)) {
      const nested = checkConfigDataUnionOnPath(data, error.path);
      prettyPrintErrors(nested);
    } else {
      prettyPrintError(error);
    }
  }

  throw new functions.https.HttpsError('invalid-argument', 'Invalid data');
}
