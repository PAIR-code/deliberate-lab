/** Endpoints for interactions with experiments */

import { onCall } from 'firebase-functions/v2/https';
import { app } from '../app';
import { AuthGuard } from '../utils/auth-guard';

/** Fetch all templates (not paginated) */
export const templates = onCall(async (request) => {
  await AuthGuard.isExperimenter(request);

  const templates = await app.firestore().collection('templates').get();
  const data = templates.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return { data };
});

/** Create an experiment template */
export const createTemplate = onCall(async (request) => {
  await AuthGuard.isExperimenter(request);

  // Extract data from the body
  const { name, stageMap, allowedStageProgressionMap } = request.data;

  const template = app.firestore().collection('templates').doc();
  await app.firestore().runTransaction(async (transaction) => {
    transaction.set(template, {
      name,
      stageMap,
      allowedStageProgressionMap,
    });
  });

  return { data: 'Template created successfully', uid: template.id };
});
