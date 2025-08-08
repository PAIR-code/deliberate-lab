/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as admin from 'firebase-admin';

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// By default, cloud functions use a legacy db name (just the project id), whereas the rest of
// firebase uses the new db name (project id + -default-rtdb).
export const app = admin.initializeApp({
  databaseURL: `https://${process.env.GCLOUD_PROJECT}-default-rtdb.firebaseio.com`,
});
app.firestore().settings({ignoreUndefinedProperties: true});
