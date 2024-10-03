import { Value } from '@sinclair/typebox/value';
import {
  CreateParticipantData,
  Experiment,
  ParticipantProfileExtendedData,
  StageKind,
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

  // Create initial participant config
  const participantConfig = createParticipantProfileExtended({
    currentCohortId: data.cohortId,
  });

  // Define document reference
  const document = app.firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(participantConfig.privateId);

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

    // Set values in participant config
    const publicId = generateParticipantPublicId(numParticipants);
    participantConfig.publicId = publicId;
    participantConfig.currentStageId = experiment.stageIds[0];

    transaction.set(document, participantConfig);
  });

  return { id: document.id };
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
// Input structure: { experimentId, isTransfer, participantConfig }          //
// Validation: utils/src/participant.validation.ts                           //
// ************************************************************************* //


export const updateParticipant = onCall(async (request) => {
  // TODO: Only allow experimenters to update full profiles
  // and use separate updateParticipantProfile (with base profile only)
  // endpoint for participants
  // await AuthGuard.isExperimenter(request);
  const { data } = request;

  // Validate input
  const validInput = Value.Check(ParticipantProfileExtendedData, data);
  if (!validInput) {
    handleUpdateParticipantValidationErrors(data);
  }

  const privateId = data.participantConfig.privateId;
  const publicId = data.participantConfig.publicId;

  // Define document reference
  const document = app.firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(privateId);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    transaction.set(document, data.participantConfig);

    // If transfer is true, copy participant stage answers to current cohort
    if (!data.isTransfer) {
      return;
    }

    const stageData =
      await app.firestore().collection(`experiments/${data.experimentId}/participants/${privateId}/stageData`)
      .get();

    const stageAnswers = stageData.docs.map(stage => stage.data());
    // For each relevant answer, add to current cohort's public stage data
    for (const stage of stageAnswers) {
      const publicDocument = app.firestore()
        .collection('experiments')
        .doc(data.experimentId)
        .collection('cohorts')
        .doc(data.participantConfig.currentCohortId)
        .collection('publicStageData')
        .doc(stage.id);

      switch (stage.kind) {
        case StageKind.SURVEY:
          const publicStageData = (await publicDocument.get()).data() as StagePublicData;
          publicStageData.participantAnswerMap[publicId] = stage.answerMap;
          transaction.set(publicDocument, publicStageData);
        default:
          break;
      }
    }
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
