import {
  AssetAllocationStageConfig,
  AssetAllocationStageParticipantAnswer,
  AssetAllocationStagePublicData,
  ParticipantProfileExtended,
} from '@deliberation-lab/utils';

import * as admin from 'firebase-admin';
import {app} from '../app';
import {getFirestoreStagePublicDataRef} from '../utils/firestore';

/** Update AssetAllocation stage public data. */
export async function addParticipantAnswerToAssetAllocationStagePublicData(
  experimentId: string,
  stage: AssetAllocationStageConfig,
  participant: ParticipantProfileExtended,
  answer: AssetAllocationStageParticipantAnswer,
) {
  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const publicDocument = getFirestoreStagePublicDataRef(
      experimentId,
      participant.currentCohortId,
      stage.id,
    );

    // Read current public data first (all reads must come before writes)
    const publicDoc = await transaction.get(publicDocument);
    const publicData = publicDoc.data() as
      | AssetAllocationStagePublicData
      | undefined;

    // Public stage data should be initialized on cohort creation
    if (!publicData) {
      console.warn(
        `Public stage data not found for stage ${stage.id} in cohort ${participant.currentCohortId}. This should have been initialized on cohort creation.`,
      );
      return;
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
