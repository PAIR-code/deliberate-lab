import {
  FlipCardStageConfig,
  FlipCardStageParticipantAnswer,
  FlipCardStagePublicData,
  ParticipantProfileExtended,
} from '@deliberation-lab/utils';

import * as admin from 'firebase-admin';
import {app} from '../app';

/** Update FlipCard stage public data. */
export async function addParticipantAnswerToFlipCardStagePublicData(
  experimentId: string,
  stage: FlipCardStageConfig,
  participant: ParticipantProfileExtended,
  answer: FlipCardStageParticipantAnswer,
) {
  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const publicDocument = app
      .firestore()
      .collection('experiments')
      .doc(experimentId)
      .collection('cohorts')
      .doc(participant.currentCohortId)
      .collection('publicStageData')
      .doc(stage.id);

    // Read current public data first (all reads must come before writes)
    const publicDoc = await transaction.get(publicDocument);
    const publicData = publicDoc.data() as FlipCardStagePublicData | undefined;

    if (publicData) {
      // Update public data with participant's flip history and selections
      const updatedPublicData: FlipCardStagePublicData = {
        ...publicData,
        participantFlipHistory: {
          ...publicData.participantFlipHistory,
          [participant.publicId]: answer.flipHistory,
        },
        participantSelections: {
          ...publicData.participantSelections,
          [participant.publicId]: answer.selectedCardIds,
        },
      };

      transaction.set(publicDocument, {
        ...updatedPublicData,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });
}
