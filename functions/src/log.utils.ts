import {ModelLogEntry, createModelLogEntry} from '@deliberation-lab/utils';

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {Timestamp} from 'firebase-admin/firestore';

import {app} from './app';

/** Write model log for cohort. */
export async function writeModelLogEntry(
  experimentId: string,
  log: ModelLogEntry,
) {
  const logDoc = await app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('logs')
    .doc(log.id);

  await app.firestore().runTransaction(async (transaction) => {
    transaction.set(logDoc, log);
  });
}
