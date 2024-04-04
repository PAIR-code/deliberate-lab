/** Endpoints for interactions with experiments */

import { onRequest } from 'firebase-functions/v2/https';
import { app } from '../app';

/** Fetch all experiments in database (not paginated) */
export const experiments = onRequest(async (request, response) => {
  const experiments = await app.firestore().collection('experiments').get();
  const data = experiments.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));
  response.send({ data });
});

/** Fetch a specific experiment's extended data (ie: the experiment and all of its associated users) */
export const experiment = onRequest(async (request, response) => {
  const experimentUid = request.params[0];

  if (!experimentUid) {
    response.status(400).send('Missing experiment UID');
    return;
  }

  const experiment = await app.firestore().collection('experiments').doc(experimentUid).get();

  if (!experiment.exists) {
    response.status(404).send('Experiment not found');
    return;
  }

  const experimentData = experiment.data();

  if (!experimentData) {
    response.status(500).send('Experiment data is missing');
    return;
  }

  const participants = await app
    .firestore()
    .collection('participants')
    .where('experimentId', '==', experimentUid)
    .get();

  const data = {
    ...experimentData,
    uid: experiment.id,
    participants: participants.docs.map((doc) => ({ uid: doc.id, ...doc.data() })),
  };

  response.send(data);
});

export const deleteExperiment = onRequest(async (request, response) => {
  const experimentId = request.params[0];

  if (!experimentId) {
    response.status(400).send('Missing experiment UID');
    return;
  }

  const experiment = await app.firestore().collection('experiments').doc(experimentId).get();

  if (!experiment.exists) {
    response.status(404).send('Experiment not found');
    return;
  }

  // Delete all participants associated with the experiment
  const participants = await app
    .firestore()
    .collection('participants')
    .where('experimentId', '==', experimentId)
    .get();

  const batch = app.firestore().batch();
  batch.delete(experiment.ref);
  participants.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();

  response.send({ data: `Experiment of ID ${experimentId} was successfully deleted` });
});
