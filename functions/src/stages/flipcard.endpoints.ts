import {Value} from '@sinclair/typebox/value';
import {
  FlipCardStageParticipantAnswer,
  FlipCardStagePublicData,
} from '@deliberation-lab/utils';

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {onCall} from 'firebase-functions/v2/https';

import {app} from '../app';

/** Endpoints for FlipCard stage operations. */

// ************************************************************************* //
// updateFlipCardStageParticipantAnswer endpoint                            //
//                                                                           //
// Updates participant's FlipCard answer and public data                    //
// ************************************************************************* //

export const updateFlipCardStageParticipantAnswer = onCall(async (request) => {
  const {data} = request;

  try {
    // Extract required fields
    const {
      experimentId,
      cohortId,
      participantPrivateId,
      participantPublicId,
      flipCardStageParticipantAnswer,
    } = data;

    if (
      !experimentId ||
      !cohortId ||
      !participantPrivateId ||
      !participantPublicId ||
      !flipCardStageParticipantAnswer
    ) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields',
      );
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

    // Define public stage document reference
    const publicDocument = app
      .firestore()
      .collection('experiments')
      .doc(experimentId)
      .collection('cohorts')
      .doc(cohortId)
      .collection('publicStageData')
      .doc(flipCardStageParticipantAnswer.id);

    // Update participant answer and public data in a transaction
    await app.firestore().runTransaction(async (transaction) => {
      // Read current public data first (all reads must come before writes)
      const publicDoc = await transaction.get(publicDocument);
      const publicData = publicDoc.data() as
        | FlipCardStagePublicData
        | undefined;

      // Update participant's answer
      transaction.set(participantDocument, {
        ...flipCardStageParticipantAnswer,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (publicData) {
        // Update public data with participant's flip history and selections
        const updatedPublicData: FlipCardStagePublicData = {
          ...publicData,
          participantFlipHistory: {
            ...publicData.participantFlipHistory,
            [participantPublicId]: flipCardStageParticipantAnswer.flipHistory,
          },
          participantSelections: {
            ...publicData.participantSelections,
            [participantPublicId]:
              flipCardStageParticipantAnswer.selectedCardIds,
          },
        };

        transaction.set(publicDocument, updatedPublicData);
      }
    });

    return {success: true};
  } catch (error) {
    console.error('Error updating FlipCard stage participant answer:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to update FlipCard stage participant answer',
    );
  }
});

// ************************************************************************* //
// getFlipCardStagePublicData endpoint                                      //
//                                                                           //
// Retrieves public FlipCard stage data for a cohort                       //
// ************************************************************************* //

export const getFlipCardStagePublicData = onCall(async (request) => {
  const {data} = request;

  try {
    const {experimentId, cohortId, stageId} = data;

    if (!experimentId || !cohortId || !stageId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: experimentId, cohortId, stageId',
      );
    }

    // Define public stage document reference
    const publicDocument = app
      .firestore()
      .collection('experiments')
      .doc(experimentId)
      .collection('cohorts')
      .doc(cohortId)
      .collection('publicStageData')
      .doc(stageId);

    const doc = await publicDocument.get();

    if (!doc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'FlipCard stage public data not found',
      );
    }

    return doc.data() as FlipCardStagePublicData;
  } catch (error) {
    console.error('Error getting FlipCard stage public data:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to get FlipCard stage public data',
    );
  }
});
