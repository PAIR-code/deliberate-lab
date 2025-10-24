// in functions/src/stages/multi_asset_allocation.utils.ts

import {
  MultiAssetAllocationStageConfig,
  MultiAssetAllocationStageParticipantAnswer,
  MultiAssetAllocationStagePublicData,
  ParticipantProfile, // Assuming this has currentCohortId
} from '@deliberation-lab/utils';
import * as admin from 'firebase-admin';
import {app} from '../app'; // Use the shared app instance like in the example

/**
 * Updates the MultiAssetAllocation stage public data with a single
 * participant's latest answer.
 */
export async function addParticipantAnswerToMultiAssetAllocationStagePublicData(
  experimentId: string,
  stage: MultiAssetAllocationStageConfig,
  participant: ParticipantProfile & {currentCohortId: string}, // Ensure cohortId is available
  answer: MultiAssetAllocationStageParticipantAnswer | undefined,
) {
  if (!answer || !participant.currentCohortId) {
    console.error(
      'Missing answer or currentCohortId for participant',
      participant.publicId,
    );
    return;
  }

  // Use a transaction to ensure atomic read-update-write.
  await app.firestore().runTransaction(async (transaction) => {
    // 1. Define the correct path to the public data document for this stage's cohort.
    const publicDocumentRef = app
      .firestore()
      .collection('experiments')
      .doc(experimentId)
      .collection('cohorts')
      .doc(participant.currentCohortId)
      .collection('publicStageData')
      .doc(stage.id);

    // 2. Read the current public data document first (must happen before any writes).
    const publicDoc = await transaction.get(publicDocumentRef);
    const publicData = publicDoc.data() as
      | MultiAssetAllocationStagePublicData
      | undefined;

    // This should never happen if our createExperiment logic is correct, but it's a safe check.
    if (!publicData) {
      console.error(
        `Public data for stage ${stage.id} does not exist. Cannot update.`,
      );
      return;
    }

    // 3. Create the updated version of the public data.
    const updatedPublicData: MultiAssetAllocationStagePublicData = {
      ...publicData,
      // Update the map by adding or overwriting the current participant's answer.
      participantAnswerMap: {
        ...publicData.participantAnswerMap,
        [participant.publicId]: answer, // Use publicId as the key, which is safer.
      },
    };

    // 4. Write the entire updated object back to the document.
    // The `set` command will overwrite the existing document with the new version.
    transaction.set(publicDocumentRef, {
      ...updatedPublicData,
      // It's good practice to add a server timestamp to know when it was last updated.
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  console.log(
    `SUCCESS: Updated public data for MultiAssetAllocation stage ${stage.id} with answer from ${participant.publicId}.`,
  );
}
