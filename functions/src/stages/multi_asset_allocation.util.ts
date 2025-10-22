import {
  MultiAssetAllocationStageConfig,
  MultiAssetAllocationStageParticipantAnswer,
  ParticipantProfile,
  createMultiAssetAllocationStagePublicData,
} from '@deliberation-lab/utils';
import * as admin from 'firebase-admin';

/**
 * Reads all participant answers for a MultiAssetAllocation stage and
 * updates the public data document.
 */
export const addParticipantAnswerToMultiAssetAllocationStagePublicData = async (
  experimentId: string,
  stage: MultiAssetAllocationStageConfig,
  participant: ParticipantProfile,
  answer: MultiAssetAllocationStageParticipantAnswer | undefined,
) => {
  if (!answer) return;

  // 1. Fetch all participant answers for this stage using a collectionGroup query.
  const answersSnapshot = await admin.firestore()
    .collectionGroup('stageData') // Or 'answers' depending on the collection name
    .where('id', '==', stage.id)
    .get();

  const participantAnswerMap: Record<string, MultiAssetAllocationStageParticipantAnswer> = {};
  answersSnapshot.forEach(doc => {
    const participantAnswer = doc.data() as MultiAssetAllocationStageParticipantAnswer;
    // Get the participant ID from the document's path (e.g., .../participants/{id}/...)
    const docParticipantId = doc.ref.parent.parent!.id;
    participantAnswerMap[docParticipantId] = participantAnswer;
  });

  // 2. Create the public data object using the creator function from your utils library.
  const publicData = createMultiAssetAllocationStagePublicData({
    id: stage.id,
    participantAnswerMap: participantAnswerMap,
  });

  // 3. Write the new public data document to the stage's subcollection.
  const publicDataRef = admin.firestore()
    .doc(`experiments/${experimentId}/stages/${stage.id}/publicData/latest`);
    
  await publicDataRef.set(publicData);

  console.log(`SUCCESS: Public data created for MultiAssetAllocation stage ${stage.id}.`);
};