import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import {
  ParticipantProfile,
  StageConfig,
  StageKind,
} from '@deliberation-lab/utils';

import { app } from '../app';

/**
  * When chip negotiation public data is updated,
  * clear transactions and increment round
  * if all participants have submitted an offer.
  */
export const completeChipNegotiationRound = onDocumentUpdated(
  {
    document:
    'experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}'
  },
  async (event) => {
    const stageDoc = app.firestore()
      .collection('experiments')
      .doc(event.params.experimentId)
      .collection('cohorts')
      .doc(event.params.cohortId)
      .collection('publicStageData')
      .doc(event.params.stageId);

    const cohortParticipantsRef = app.firestore()
      .collection('experiments')
      .doc(event.params.experimentId)
      .collection('participants')
      .where('currentCohortId', '==', event.params.cohortId);

    await app.firestore().runTransaction(async (transaction) => {
      const stage = (await stageDoc.get()).data() as StageConfig;
      if (stage.kind !== StageKind.CHIP) {
        return;
      }

      // Check all cohort participants for offer
      // TODO: Only check active participants
      // (see isActiveParticipant frontend util)
      const participants: ParticipantProfile = [];
      (await cohortParticipantsRef.get()).forEach(doc => {
        participants.push(doc.data());
      });

      const round = stage.currentRound;
      for (const participant of participants) {
        if (
          !stage.participantOfferMap[round] ||
          !stage.participantOfferMap[round][participant.publicId]
        ) {
          return false;
        }
      }

      // TODO: If all participants have submitted an offer, clear transactions
      // TODO: Increment current round
    }); // end transaction
  }
)