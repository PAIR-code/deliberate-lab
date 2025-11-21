import { Value } from '@sinclair/typebox/value';
import {
  ExperimentTemplate,
  ExperimentTemplateDeletionData,
} from '@deliberation-lab/utils';
import * as functions from 'firebase-functions';
import { onCall } from 'firebase-functions/v2/https';
import { app } from './app';
import { AuthGuard } from './utils/auth-guard';

/** Create, update, and delete experiment templates. */

// ************************************************************************* //
// saveExperimentTemplate endpoint                                           //
// (create or update experiment template in specified Firestore collection)  //
//                                                                           //
// Input structure: { collectionName, experimentTemplate }                   //
// ************************************************************************* //
export const saveExperimentTemplate = onCall(async (request) => {
  await AuthGuard.isExperimenter(request);
  const { data } = request;
  const template = data.experimentTemplate as ExperimentTemplate;

  // Define document reference
  const document = app
    .firestore()
    .collection(data.collectionName)
    .doc(template.id);

  // Use current experimenter as creator if not set
  if (request.auth && !template.experiment.metadata.creator) {
    template.experiment.metadata.creator = request.auth.token.email || '';
    template.experiment.metadata.creator =
      template.experiment.metadata.creator.toLowerCase();
  }

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    transaction.set(document, template);
  });

  return { id: document.id };
});

// ************************************************************************* //
// getExperimentTemplates endpoint                                           //
// (retrieve all experiment templates from specified Firestore collection)   //
//                                                                           //
// Input structure: { collectionName }                                       //
// ************************************************************************* //
export const getExperimentTemplates = onCall(async (request) => {
  await AuthGuard.isExperimenter(request);
  const { data } = request;

  const templates = (
    await app.firestore().collection(data.collectionName).get()
  ).docs.map((doc) => doc.data() as ExperimentTemplate);

  return { templates };
});

// ************************************************************************* //
// deleteExperimentTemplate endpoint                                         //
// (remove experiment template doc)                                          //
//                                                                           //
// Input structure: { collectionName, templateId }                           //
// ************************************************************************* //
export const deleteExperimentTemplate = onCall(async (request) => {
  await AuthGuard.isExperimenter(request);
  const { data } = request;

  // Validate input
  const validInput = Value.Check(ExperimentTemplateDeletionData, data);
  if (!validInput) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid data');
  }

  // Delete document
  const doc = app
    .firestore()
    .doc(`${data.collectionName}/${data.templateId}`);
  await doc.delete();
  return { success: true };
});
