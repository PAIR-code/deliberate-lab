import * as functions from 'firebase-functions';
import {Value} from '@sinclair/typebox/value';
import {
  CreateMediatorData,
  MediatorProfileExtended,
  UpdateMediatorStatusData,
} from '@deliberation-lab/utils';
import {onCall} from 'firebase-functions/v2/https';

import {app} from './app';
import {AuthGuard} from './utils/auth-guard';
import {createMediatorForCohortFromPersona} from './mediator.utils';

// ****************************************************************************
// Update mediator status
// Input structure: { experimentId, mediatorId, status }
// Validation: utils/src/mediator.validation.ts
// ****************************************************************************
export const updateMediatorStatus = onCall(async (request) => {
  const {data} = request;

  // Only allow experimenters to change mediator status
  await AuthGuard.isExperimenter(request);

  if (!Value.Check(UpdateMediatorStatusData, data)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid data');
  }

  const mediatorDoc = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('mediators')
    .doc(data.mediatorId);

  await app.firestore().runTransaction(async (transaction) => {
    const snapshot = await mediatorDoc.get();
    if (!snapshot.exists) {
      throw new functions.https.HttpsError('not-found', 'Mediator not found');
    }

    const mediator = snapshot.data() as MediatorProfileExtended;
    mediator.currentStatus = data.status;

    transaction.set(mediatorDoc, mediator);
  });

  return {success: true};
});

// ****************************************************************************
// Create mediator
// Input structure: { experimentId, cohortId, agentPersonaId }
// Validation: utils/src/mediator.validation.ts
// ****************************************************************************
export const createMediator = onCall(async (request) => {
  const {data} = request;

  await AuthGuard.isExperimenter(request);

  if (!Value.Check(CreateMediatorData, data)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid data');
  }

  const existingMediator = (
    await app
      .firestore()
      .collection('experiments')
      .doc(data.experimentId)
      .collection('mediators')
      .where('agentConfig.agentId', '==', data.agentPersonaId)
      .get()
  ).docs
    .map((doc) => doc.data() as MediatorProfileExtended)
    .find((mediator) => mediator.currentCohortId === data.cohortId);

  if (existingMediator) {
    throw new functions.https.HttpsError(
      'already-exists',
      'Mediator already assigned to cohort',
    );
  }

  const mediator = await createMediatorForCohortFromPersona(
    data.experimentId,
    data.cohortId,
    data.agentPersonaId,
  );

  if (!mediator) {
    throw new functions.https.HttpsError(
      'not-found',
      'Agent mediator persona not found',
    );
  }

  const mediatorDoc = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('mediators')
    .doc(mediator.privateId);

  await mediatorDoc.set(mediator);

  return {id: mediator.privateId};
});
