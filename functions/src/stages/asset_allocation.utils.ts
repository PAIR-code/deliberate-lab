import {
  AssetAllocationStageConfig,
  AssetAllocationStageParticipantAnswer,
  AssetAllocationStagePublicData,
  ParticipantProfileExtended,
  createAssetAllocationStagePublicData,
} from '@deliberation-lab/utils';

import * as admin from 'firebase-admin';
import {app} from '../app';

/** Update AssetAllocation stage public data. */
export async function addParticipantAnswerToAssetAllocationStagePublicData(
  experimentId: string,
  stage: AssetAllocationStageConfig,
  participant: ParticipantProfileExtended,
  answer: AssetAllocationStageParticipantAnswer,
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
    let publicData = publicDoc.data() as
      | AssetAllocationStagePublicData
      | undefined;

    // Create initial public data if it doesn't exist
    if (!publicData) {
      publicData = createAssetAllocationStagePublicData({
        id: stage.id,
      });
    }

    // Update public data with participant's allocation
    const updatedPublicData: AssetAllocationStagePublicData = {
      ...publicData,
      participantAllocations: {
        ...publicData.participantAllocations,
        [participant.publicId]: answer.allocation,
      },
    };

    transaction.set(publicDocument, {
      ...updatedPublicData,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
}
