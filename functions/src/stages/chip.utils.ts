import {
  ChipStagePublicData,
  ParticipantProfile,
  ParticipantStatus,
  createChipTurn,
} from '@deliberation-lab/utils';

import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { onCall } from 'firebase-functions/v2/https';

import { app } from '../app';

/**
 * Get relevant (active), ordered participant public IDs for given cohort.
 * (used to check, e.g., if all participants have made an offer)
 */
export async function getChipParticipantIds(
  experimentId: string,
  cohortId: string
) {
  const cohortParticipantsRef = app.firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('participants')
    .where('currentCohortId', '==', cohortId)
    .orderBy('publicId', 'asc');

  const participants: ParticipantProfile = [];
  (await cohortParticipantsRef.get()).forEach(doc => {
    // Check that participant is active for negotiation stage
    const participant = doc.data() as ParticipantProfile;
    if (
      participant.currentStatus === ParticipantStatus.IN_PROGRESS ||
      participant.currentStatus === ParticipantStatus.ATTENTION_CHECK
    ) {
      participants.push(participant);
    }
  });

  return participants.map(p => p.publicId);
}

/** Update chip negotiation public data current turn
  * (and round if applicable)
  */
export function updateChipCurrentTurn(
  publicStageData: ChipStagePublicData,
  participantIds: string[],
  numRounds = 3,
) {
  if (participantIds.length === 0) {
    return publicStageData;
  }

  // Find first participant who has not yet made an offer
  const getTurnParticipant: string|null = (
    publicStageData: ChipStagePublicData,
    participantIds: string[]
  ) => {
    const round = publicStageData.currentRound;
    const roundMap = publicStageData.participantOfferMap[round];
    for (const participantId of participantIds) {
      if (!roundMap || !roundMap[participantId]) {
        return participantId;
      }
    }
    return null;
  };

  const nextParticipantId = getTurnParticipant(publicStageData, participantIds);

  // If all participants in current round have made offers,
  // increment round and use first participant
  if (!nextParticipantId) {
    publicStageData.currentRound += 1;
    publicStageData.currentTurn = createChipTurn(participantIds[0]);
  } else {
    publicStageData.currentTurn = createChipTurn(nextParticipantId);
  }

  // If specified number of rounds is over, set isGameOver
  if (publicStageData.currentRound === numRounds) {
    publicStageData.isGameOver = true;
  }

  return publicStageData;
}
