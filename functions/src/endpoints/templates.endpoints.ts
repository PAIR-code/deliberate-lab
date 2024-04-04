/** Endpoints for interactions with experiments */

import { onRequest } from 'firebase-functions/v2/https';
import { app } from '../app';

/** Create an experiment template */
export const createTemplate = onRequest(async (request, response) => {
  // Extract data from the body
  const { name, stageMap, allowedStageProgressionMap } = request.body;

  const template = app.firestore().collection('templates').doc();
  await app.firestore().runTransaction(async (transaction) => {
    transaction.set(template, {
      name,
      stageMap,
      allowedStageProgressionMap,
    });
  });

  response.send({ data: 'Template created successfully', uid: template.id });
});
