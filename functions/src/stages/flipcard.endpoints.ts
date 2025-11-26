import * as admin from 'firebase-admin';
import {onCall, HttpsError} from 'firebase-functions/v2/https';

import {app} from '../app';

/** Endpoints for FlipCard stage operations. */

// ************************************************************************* //
// updateFlipCardStageParticipantAnswer endpoint                            //
//                                                                           //
// Updates participant's FlipCard answer (public data updated by trigger)  //
// ************************************************************************* //

export const updateFlipCardStageParticipantAnswer = onCall(async (request) => {
  const {data} = request;

  try {
    // Extract required fields
    const {experimentId, participantPrivateId, flipCardStageParticipantAnswer} =
      data;

    if (
      !experimentId ||
      !participantPrivateId ||
      !flipCardStageParticipantAnswer
    ) {
      throw new HttpsError('invalid-argument', 'Missing required fields');
    }

    // Define participant answer document reference
    const participantDocument = app
      .firestore()
      .collection('experiments')
      .doc(experimentId)
      .collection('participants')
      .doc(participantPrivateId)
      .collection('stageData')
      .doc(flipCardStageParticipantAnswer.id);

    // Update participant answer only (public data will be updated by trigger)
    await app.firestore().runTransaction(async (transaction) => {
      // Update participant's answer
      transaction.set(participantDocument, {
        ...flipCardStageParticipantAnswer,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    return {success: true};
  } catch (error) {
    console.error('Error updating FlipCard stage participant answer:', error);
    throw new HttpsError(
      'internal',
      'Failed to update FlipCard stage participant answer',
    );
  }
});
