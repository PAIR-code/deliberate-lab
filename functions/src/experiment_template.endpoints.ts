import {Value} from '@sinclair/typebox/value';
import {
  ExperimentTemplate,
  ExperimentTemplateDeletionData,
} from '@deliberation-lab/utils';
import {onCall, HttpsError} from 'firebase-functions/v2/https';
import {app} from './app';
import {AuthGuard} from './utils/auth-guard';

/** Create, update, and delete experiment templates. */

// ************************************************************************* //
// saveExperimentTemplate endpoint                                           //
// (create or update experiment template in specified Firestore collection)  //
//                                                                           //
// Input structure: { experimentTemplate }                   //
// ************************************************************************* //
const EXPERIMENT_TEMPLATES_COLLECTION = 'experimentTemplates';

export const saveExperimentTemplate = onCall(async (request) => {
  await AuthGuard.isExperimenter(request);
  const {data} = request;
  const template = data.experimentTemplate as ExperimentTemplate;

  // Define document reference
  const document = app
    .firestore()
    .collection(EXPERIMENT_TEMPLATES_COLLECTION)
    .doc(template.id);

  // Use current experimenter as creator if not set
  if (request.auth && !template.experiment.metadata.creator) {
    template.experiment.metadata.creator = request.auth.token.email || '';
    template.experiment.metadata.creator =
      template.experiment.metadata.creator.toLowerCase();
  }

  // Sanitize sharedWith
  if (template.sharedWith) {
    template.sharedWith = template.sharedWith
      .map((email) => email.toLowerCase().trim())
      .filter((email) => email.length > 0);
  }

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    transaction.set(document, template);
  });

  return {id: document.id};
});

// ************************************************************************* //
// getExperimentTemplates endpoint                                           //
// (retrieve all experiment templates from specified Firestore collection)   //
//                                                                           //
// Input structure: { collectionName }                                       //
// ************************************************************************* //
export const getExperimentTemplates = onCall(async (request) => {
  await AuthGuard.isExperimenter(request);
  const userEmail = request.auth?.token.email?.toLowerCase() || '';

  const publicTemplatesQuery = app
    .firestore()
    .collection(EXPERIMENT_TEMPLATES_COLLECTION)
    .where('visibility', '==', 'public')
    .get();

  const myTemplatesQuery = app
    .firestore()
    .collection(EXPERIMENT_TEMPLATES_COLLECTION)
    .where('experiment.metadata.creator', '==', userEmail)
    .get();

  const sharedWithMeQuery = app
    .firestore()
    .collection(EXPERIMENT_TEMPLATES_COLLECTION)
    .where('sharedWith', 'array-contains', userEmail)
    .get();

  const [publicTemplates, myTemplates, sharedWithMe] = await Promise.all([
    publicTemplatesQuery,
    myTemplatesQuery,
    sharedWithMeQuery,
  ]);

  const templateMap = new Map<string, ExperimentTemplate>();

  publicTemplates.docs.forEach((doc) => {
    templateMap.set(doc.id, doc.data() as ExperimentTemplate);
  });

  myTemplates.docs.forEach((doc) => {
    templateMap.set(doc.id, doc.data() as ExperimentTemplate);
  });

  sharedWithMe.docs.forEach((doc) => {
    templateMap.set(doc.id, doc.data() as ExperimentTemplate);
  });

  return {templates: Array.from(templateMap.values())};
});

// ************************************************************************* //
// deleteExperimentTemplate endpoint                                         //
// (remove experiment template doc)                                          //
//                                                                           //
// Input structure: { collectionName, templateId }                           //
// ************************************************************************* //
export const deleteExperimentTemplate = onCall(async (request) => {
  await AuthGuard.isExperimenter(request);
  const {data} = request;

  // Validate input
  const validInput = Value.Check(ExperimentTemplateDeletionData, data);
  if (!validInput) {
    throw new HttpsError('invalid-argument', 'Invalid data');
  }

  // Delete document
  const docRef = app
    .firestore()
    .doc(`${EXPERIMENT_TEMPLATES_COLLECTION}/${data.templateId}`);

  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    throw new HttpsError('not-found', 'Template not found');
  }

  const template = snapshot.data() as ExperimentTemplate;
  const userEmail = request.auth?.token.email?.toLowerCase();

  // strict creator check
  if (template.experiment.metadata.creator !== userEmail) {
    throw new HttpsError(
      'permission-denied',
      'Only the creator can delete this template',
    );
  }

  await docRef.delete();
  return {success: true};
});
