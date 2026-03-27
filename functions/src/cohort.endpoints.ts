import {Timestamp} from 'firebase-admin/firestore';
import {Value} from '@sinclair/typebox/value';
import {
  CohortConfig,
  CohortCreationData,
  CohortDeletionData,
} from '@deliberation-lab/utils';

import {onCall, HttpsError} from 'firebase-functions/v2/https';

import {app} from './app';
import {AuthGuard} from './utils/auth-guard';
import {
  checkConfigDataUnionOnPath,
  isUnionError,
  prettyPrintError,
  prettyPrintErrors,
} from './utils/validation';
import {
  createCohortInternal,
  markCohortParticipantsAsDeleted,
} from './cohort.utils';

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

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    await createCohortInternal(transaction, data.experimentId, cohortConfig);
  });

  return {id: cohortConfig.id};
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleCohortCreationValidationErrors(data: any) {
  for (const error of Value.Errors(CohortCreationData, data)) {
    if (isUnionError(error)) {
      const nested = checkConfigDataUnionOnPath(data, error.path);
      prettyPrintErrors(nested);
    } else {
      prettyPrintError(error);
    }
  }

  throw new HttpsError('invalid-argument', 'Invalid data');
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

    const canUpdate = await AuthGuard.isCreatorOrAdmin(
      request,
      cohortConfig.metadata.creator,
    );

    if (!canUpdate) {
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
    throw new HttpsError('invalid-argument', 'Invalid data');
    return {success: false};
  }

  const experiment = (
    await app.firestore().collection('experiments').doc(data.experimentId).get()
  ).data();
  if (!experiment) {
    throw new HttpsError(
      'not-found',
      `Experiment ${data.experimentId} not found`,
    );
  }

  const canDelete = await AuthGuard.isCreatorOrAdmin(
    request,
    experiment.metadata.creator,
  );
  if (!canDelete) {
    return {success: false};
  }

  // Set all participants in cohort to deleted
  await markCohortParticipantsAsDeleted(data.experimentId, data.cohortId);

  // TODO: Set all mediators in cohort to deleted

  // Delete document (after marking participants, to avoid race conditions)
  const doc = app
    .firestore()
    .doc(`experiments/${data.experimentId}/cohorts/${data.cohortId}`);
  await app.firestore().recursiveDelete(doc);

  return {success: true};
});
