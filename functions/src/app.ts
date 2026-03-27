import {StageManager} from '@deliberation-lab/utils';
import * as admin from 'firebase-admin';
import {setGlobalOptions} from 'firebase-functions/v2';

// Set global options before any function definitions.
// This MUST be in this file (not index.ts) because the bundler resolves
// dependency modules before executing index.ts top-level code.
// Since all endpoint files import app.ts, this runs before any onCall() calls.
setGlobalOptions({memory: '512MiB'});

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// By default, cloud functions use a legacy db name (just the project id), whereas the rest of
// firebase uses the new db name (project id + -default-rtdb).
export const app = admin.initializeApp({
  databaseURL: `https://${process.env.GCLOUD_PROJECT}-default-rtdb.firebaseio.com`,
});
try {
  app.firestore().settings({ignoreUndefinedProperties: true});
} catch (e) {
  console.warn('Firestore settings already set:', e);
}

// Stage config manager for directing stage type specific processing actions
// (e.g., editing private/public answers, fetching prompts)
export const stageManager = new StageManager();
