import { CallableRequest } from 'firebase-functions/v2/https';
import { app } from '../app';

import * as functions from 'firebase-functions';
import { Document } from './type-aliases';

/** Extract claims for the user who made the request. */
const getClaims = async (request: CallableRequest) => {
  const uid = request.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'User is not authenticated');
  return app
    .auth()
    .getUser(uid)
    .then((u) => u.customClaims ?? {});
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

    throwUnauthIfNot(claims['role'] === 'experimenter');
  }

  /** Strict participant check. Throws errors on experimenters. */
  public static async isThisParticipant(request: CallableRequest, participantUid: string) {
    const claims = await getClaims(request);

    throwUnauthIfNot(claims['role'] === 'participant');
    throwUnauthIfNot(claims['participantId'] === participantUid);
  }

  public static async participatesInExperiment(request: CallableRequest, experimentId: string) {
    const claims = await getClaims(request);

    if (claims['role'] === 'experimenter') return;

    throwUnauthIfNot(claims['role'] === 'participant');
    throwUnauthIfNot(claims['experimentId'] === experimentId);
  }

  /** Experimenters cannot send messages as a user ! */
  public static async canSendUserMessage(request: CallableRequest, chatId: string) {
    const claims = await getClaims(request);

    throwUnauthIfNot(claims['role'] === 'participant');
    throwUnauthIfNot(claims['chatIds'].includes(chatId));
  }

  public static async belongsToSameExperimentAs(request: CallableRequest, participant: Document) {
    const claims = await getClaims(request);

    if (claims['role'] === 'experimenter') return;

    throwUnauthIfNot(claims['role'] === 'participant');
    throwUnauthIfNot(claims['experimentId'] === participant.data()?.experimentId);
  }
}
