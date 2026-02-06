import {CallableRequest, HttpsError} from 'firebase-functions/v2/https';
import {app} from '../app';

/** Extract claims for the user who made the request. */
const getClaims = async (request: CallableRequest) => {
  const uid = request.auth?.uid;
  if (!uid || !request.auth?.token.email)
    throw new HttpsError('unauthenticated', 'User is not authenticated');

  const allowlistDoc = await app
    .firestore()
    .collection('allowlist')
    .doc(request.auth.token.email.toLowerCase())
    .get();

  return allowlistDoc.exists;
};

const throwUnauthIfNot = (condition: boolean) => {
  if (!condition)
    throw new HttpsError(
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

  public static async isAdmin(request: CallableRequest) {
    const uid = request.auth?.uid;
    if (!uid || !request.auth?.token.email)
      throw new HttpsError('unauthenticated', 'User is not authenticated');

    const allowlistDoc = await app
      .firestore()
      .collection('allowlist')
      .doc(request.auth.token.email.toLowerCase())
      .get();

    const isAdmin =
      allowlistDoc.exists && allowlistDoc.data()?.isAdmin === true;

    throwUnauthIfNot(isAdmin);
  }

  public static async isCreatorOrAdmin(
    request: CallableRequest,
    creatorEmail: string,
  ) {
    const email = request.auth?.token.email?.toLowerCase();
    if (!email) return false;
    if (email === creatorEmail) return true;

    const allowlistDoc = await app
      .firestore()
      .collection('allowlist')
      .doc(email)
      .get();

    return allowlistDoc.exists && allowlistDoc.data()?.isAdmin === true;
  }

  public static async isAdminEmail(
    firestore: FirebaseFirestore.Firestore,
    email: string,
  ) {
    if (!email) return false;
    const allowlistDoc = await firestore
      .collection('allowlist')
      .doc(email)
      .get();

    return allowlistDoc.exists && allowlistDoc.data()?.isAdmin === true;
  }
}
