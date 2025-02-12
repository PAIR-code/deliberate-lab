import {Timestamp} from 'firebase-admin/firestore';
import {Value} from '@sinclair/typebox/value';
import {
  CohortConfig,
  CohortCreationData,
  CohortDeletionData,
  ParticipantStatus,
  createPublicDataFromStageConfigs,
} from '@deliberation-lab/utils';

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {onCall} from 'firebase-functions/v2/https';

import {app} from './app';
import {AuthGuard} from './utils/auth-guard';
import {
  checkConfigDataUnionOnPath,
  isUnionError,
  prettyPrintError,
  prettyPrintErrors,
} from './utils/validation';

/** Create/update and delete cohorts. */

// ************************************************************************* //
// createCohort endpoint                                                     //
// WARNING: Do not use this endpoint to update existing cohorts,             //
//          as it will clear existing public stage data.                     //
//                                                                           //
// Input structure: { experimentId, cohortConfig }                           //
// Validation: utils/src/cohort.validation.ts                                //
// ************************************************************************* //

export const createCohort = onCall(async (request) => {
  // TODO: Verify that the experimenter is an admin OR creator/reader
  // of the cohort's experiment
  await AuthGuard.isExperimenter(request);
  const {data} = request;
  const cohortConfig = data.cohortConfig;

  // Validate input
  const validInput = Value.Check(CohortCreationData, data);
  if (!validInput) {
    handleCohortCreationValidationErrors(data);
  }

  // Use current experimenter as creator
  cohortConfig.metadata.creator = request.auth?.token.email;

  // Define document reference
  const document = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('cohorts')
    .doc(cohortConfig.id);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    // For relevant stages, initialize public stage data documents
    const stageDocs = await app
      .firestore()
      .collection(`experiments/${data.experimentId}/stages`)
      .get();
    const stages = stageDocs.docs.map((stageDoc) => stageDoc.data());

    const publicData = createPublicDataFromStageConfigs(stages);

    for (const dataItem of publicData) {
      const dataDoc = app
        .firestore()
        .collection('experiments')
        .doc(data.experimentId)
        .collection('cohorts')
        .doc(cohortConfig.id)
        .collection('publicStageData')
        .doc(dataItem.id);
      transaction.set(dataDoc, dataItem);
    }

    // Set relevant stages (e.g., with no min participants and no wait for all
    // participants) as unlocked
    for (const stage of stages) {
      if (
        stage.progress.minParticipants === 0 &&
        !stage.progress.waitForAllParticipants
      ) {
        cohortConfig.stageUnlockMap[stage.id] = true;
      }
    }

    // Write cohort config
    transaction.set(document, cohortConfig);
  });

  return {id: document.id};
});

function handleCohortCreationValidationErrors(data: any) {
  for (const error of Value.Errors(CohortCreationData, data)) {
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
// updateCohortMetadata endpoint                                             //
//                                                                           //
// Input structure: { experimentId, cohortId, metadata, participantConfig }  //
// Validation: utils/src/cohort.validation.ts                                //
// ************************************************************************* //

export const updateCohortMetadata = onCall(async (request) => {
  await AuthGuard.isExperimenter(request);
  const {data} = request;

  // Define document reference
  const document = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('cohorts')
    .doc(data.cohortId);

  let success = true;
  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const cohortConfig = (await document.get()).data() as CohortConfig;

    // Verify that the experimenter is the creator
    // before updating.
    if (cohortConfig.metadata.creator !== request.auth?.token.email) {
      success = false;
      return;
    }

    // Update date edited
    const metadata = {...data.metadata, dateModified: Timestamp.now()};
    const participantConfig = data.participantConfig;

    transaction.set(document, {...cohortConfig, metadata, participantConfig});
  });

  return {success};
});

// ************************************************************************* //
// deleteCohort endpoint                                                     //
// (recursively remove cohort doc and subcollections)                        //
//                                                                           //
// Input structure: { experimentId, cohortId }                               //
// Validation: utils/src/cohort.validation.ts                                //
// ************************************************************************* //
export const deleteCohort = onCall(async (request) => {
  // TODO: Only allow creator, admins, and readers to delete cohorts
  await AuthGuard.isExperimenter(request);
  const {data} = request;

  // Validate input
  const validInput = Value.Check(CohortDeletionData, data);
  if (!validInput) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid data');
    return {success: false};
  }

  // Verify that experimenter is the creator before enabling delete
  const experiment = (
    await app.firestore().collection('experiments').doc(data.experimentId).get()
  ).data();
  if (request.auth?.token.email !== experiment.metadata.creator) return;

  // Delete document
  const doc = app
    .firestore()
    .doc(`experiments/${data.experimentId}/cohorts/${data.cohortId}`);
  app.firestore().recursiveDelete(doc);

  // Set all participants in cohort to deleted
  const participants = (
    await app
      .firestore()
      .collection('experiments')
      .doc(data.experimentId)
      .collection('participants')
      .get()
  ).docs.map((doc) => doc.data());
  for (const participant of participants) {
    if (
      participant.currentCohortId === data.cohortId ||
      participant.transferCohortId === data.cohortId
    ) {
      await app.firestore().runTransaction(async (transaction) => {
        const participantDoc = app
          .firestore()
          .collection('experiments')
          .doc(data.experimentId)
          .collection('participants')
          .doc(participant.privateId);
        transaction.set(participantDoc, {
          ...participant,
          currentStatus: ParticipantStatus.DELETED,
        });
      });
    }
  }

  return {success: true};
});
