import {CallableRequest} from 'firebase-functions/v2/https';
import {app} from '../app';

import * as functions from 'firebase-functions';

/** Extract claims for the user who made the request. */
const getClaims = async (request: CallableRequest) => {
  const uid = request.auth?.uid;
  if (!uid)
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User is not authenticated',
    );

  const allowlistDoc = await app
    .firestore()
    .collection('allowlist')
    .doc(request.auth.token.email)
    .get();

  return allowlistDoc.exists;
};

const throwUnauthIfNot = (condition: boolean) => {
  if (!condition)
    throw new functions.https.HttpsError(
      'permission-denied',
      'User does not have permission to access this resource',
    );
};

/** Authentication guard. Throws authentication or authorization errors. */
export class AuthGuard {
  public static async isExperimenter(request: CallableRequest) {
    const claims = await getClaims(request);

    throwUnauthIfNot(claims);
  }
}
