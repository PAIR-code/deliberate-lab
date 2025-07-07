import {Value} from '@sinclair/typebox/value';
import {MediatorProfileExtended} from '@deliberation-lab/utils';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {onCall} from 'firebase-functions/v2/https';

import {app} from './app';
import {AuthGuard} from './utils/auth-guard';

// ****************************************************************************
// Update mediator status
// Input structure: { experimentId, mediatorId, status }
// Validation: utils/src/mediator.validation.ts
// ****************************************************************************
export const updateMediatorStatus = onCall(async (request) => {
  const {data} = request;

  // Only allow experimenters to change mediator status
  await AuthGuard.isExperimenter(request);

  const mediatorDoc = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('mediators')
    .doc(data.mediatorId);

  await app.firestore().runTransaction(async (transaction) => {
    const mediator = (
      await mediatorDoc.get()
    ).data() as MediatorProfileExtended;
    mediator.currentStatus = data.status;

    transaction.set(mediatorDoc, mediator);
  });

  return {success: true};
});
