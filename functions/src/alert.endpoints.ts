import {
  AlertMessage,
  AlertStatus,
  createAlertMessage,
} from '@deliberation-lab/utils';

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {Timestamp} from 'firebase-admin/firestore';
import {onCall} from 'firebase-functions/v2/https';

import {app} from './app';
import {AuthGuard} from './utils/auth-guard';

// Send alert message (from participant to experimenter)
export const sendAlertMessage = onCall(async (request) => {
  const {data} = request;
  const experimentId = data.experimentId;
  const cohortId = data.cohortId;
  const stageId = data.stageId;
  const participantId = data.participantId;
  const message = data.message;

  const alert: AlertMessage = createAlertMessage({
    experimentId,
    cohortId,
    stageId,
    participantId,
    message,
    timestamp: Timestamp.now(),
  });

  // Store alert message under participant's alerts collection
  const participantAlertDoc = await app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('participants')
    .doc(participantId)
    .collection('alerts')
    .doc(alert.id);

  // Also store alert message under experiment's alerts collection
  const experimenterAlertDoc = await app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('alerts')
    .doc(alert.id);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    transaction.set(participantAlertDoc, alert);
    transaction.set(experimenterAlertDoc, alert);
  });

  return {success: true};
});

// Mark alert message as read and optionally write response
export const ackAlertMessage = onCall(async (request) => {
  const {data} = request;
  const experimentId = data.experimentId;
  const alertId = data.alertId;
  const response = data.response;

  // Only allow experimenters to ack alerts
  await AuthGuard.isExperimenter(request);

  const doc = await app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('alerts')
    .doc(alertId);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const alert = (await doc.get()).data() as AlertMessage;
    alert.status = AlertStatus.READ;
    if (response.length > 0) {
      alert.responses.push(response);
    }
    transaction.set(doc, alert);
  });

  return {success: true};
});
