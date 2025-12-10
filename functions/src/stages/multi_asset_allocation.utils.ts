import {
  MultiAssetAllocationStageConfig,
  MultiAssetAllocationStageParticipantAnswer,
  MultiAssetAllocationStagePublicData,
  ParticipantProfile,
} from '@deliberation-lab/utils';

import {app} from '../app';

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
    const publicDocumentRef = app
      .firestore()
      .collection('experiments')
      .doc(experimentId)
      .collection('cohorts')
      .doc(participant.currentCohortId)
      .collection('publicStageData')
      .doc(stage.id);

    const publicDoc = await transaction.get(publicDocumentRef);
    const publicData = publicDoc.data() as
      | MultiAssetAllocationStagePublicData
      | undefined;

    if (!publicData) {
      console.warn(
        `Public stage data not found for stage ${stage.id} in cohort ${participant.currentCohortId}. This should have been initialized on cohort creation.`,
      );
      return;
    }

    const currentPublicData = publicData;

    const updatedPublicData: MultiAssetAllocationStagePublicData = {
      ...currentPublicData,
      participantAnswerMap: {
        ...currentPublicData.participantAnswerMap,
        [participant.publicId]: answer,
      },
    };

    transaction.set(publicDocumentRef, {
      ...updatedPublicData,
    });
  });
}
