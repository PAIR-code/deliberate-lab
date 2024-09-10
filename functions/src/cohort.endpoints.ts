import { Value } from '@sinclair/typebox/value';
import {
  CohortCreationData,
  createPublicDataFromStageConfigs,
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

/** Create/update and delete cohorts. */

// ************************************************************************* //
// writeCohort endpoint                                                      //
// (create or update experiment to specified Firestore collection)           //
//                                                                           //
// Input structure: { experimentId, cohortConfig }                           //
// Validation: utils/src/cohort.validation.ts                                //
// ************************************************************************* //

export const writeCohort = onCall(async (request) => {
  await AuthGuard.isExperimenter(request);
  const { data } = request;
  const cohortConfig = data.cohortConfig;

  // TODO: If experiment exists, verify that the experimenter is the creator
  // before updating.

  // Validate input
  const validInput = Value.Check(CohortCreationData, data);
  if (!validInput) {
    handleCohortCreationValidationErrors(data);
  }

  // Use current experimenter as creator
  cohortConfig.metadata.creator = request.auth!.uid;

  // Define document reference
  const document = app.firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('cohorts')
    .doc(cohortConfig.id);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    transaction.set(document, cohortConfig);

    // For relevant stages, initialize public stage data documents
    const stageConfigs =
      await app.firestore().collection(`experiments/${data.experimentId}/stages`)
      .get();

    const publicData = createPublicDataFromStageConfigs(
      stageConfigs.docs.map(stageDoc => stageDoc.data())
    );

    for (const dataItem of publicData) {
      const dataDoc = app.firestore()
        .collection('experiments')
        .doc(data.experimentId)
        .collection('cohorts')
        .doc(cohortConfig.id)
        .collection('publicStageData')
        .doc(dataItem.id);
      transaction.set(dataDoc, dataItem);
    }
  });

  return { id: document.id };
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