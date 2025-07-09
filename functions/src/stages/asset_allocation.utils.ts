import {
  AssetAllocationStageConfig,
  AssetAllocationStageParticipantAnswer,
  AssetAllocationStagePublicData,
  ParticipantProfileExtended,
  createAssetAllocationStagePublicData,
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

// ************************************************************************* //
// PROMPT UTILITIES                                                          //
// ************************************************************************* //

/** Get stock names from asset allocation stage configuration. */
function getStockNames(stage: AssetAllocationStageConfig): {
  stockA: string;
  stockB: string;
} {
  return {
    stockA: stage.stockConfig.stockA.name,
    stockB: stage.stockConfig.stockB.name,
  };
}

export function getAssetAllocationSummaryText(
  stage: AssetAllocationStageConfig,
): string {
  const stockNames = getStockNames(stage);
  const overview =
    '## Asset Allocation: User has $1,000 to allocate between two stocks:';

  return `${overview}\n* ${stockNames.stockA}\n* ${stockNames.stockB}`;
}

export function getAssetAllocationAnswersText(
  stage: AssetAllocationStageConfig,
  participantAnswers: Array<{
    participantId: string;
    answer: AssetAllocationStageParticipantAnswer;
  }>,
): string {
  if (participantAnswers.length === 0) {
    return '';
  }

  const stockNames = getStockNames(stage);

  const answerSummaries = participantAnswers.map(({participantId, answer}) => {
    const allocation = answer.allocation;
    // Only include Participant IDs if there are multiple participants.
    const prefix =
      participantAnswers.length > 1 ? `Participant ${participantId}:\n` : '';

    return `${prefix}${stockNames.stockA}: ${allocation.stockAPercentage}%, ${stockNames.stockB}: ${allocation.stockBPercentage}%`;
  });

  return `## Current Asset Allocation:\n${answerSummaries.join('\n')}`;
}
