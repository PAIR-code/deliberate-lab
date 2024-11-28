import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import {
  ParticipantProfile,
  StageConfig,
  StageKind,
} from '@deliberation-lab/utils';

import { app } from '../app';
import {
  getChipParticipantIds
} from './chip.utils';


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

    await app.firestore().runTransaction(async (transaction) => {
      const stage = (await stageDoc.get()).data() as StageConfig;
      if (stage.kind !== StageKind.CHIP) {
        return;
      }

      // Check all cohort participants for offer
      // TODO: Update based on new experiment design
      const participantIds = await getChipParticipantIds(
        event.params.experimentId,
        event.params.cohortId
      );

      const round = stage.currentRound;
      for (const participantId of participantIds) {
        if (
          !stage.participantOfferMap[round] ||
          !stage.participantOfferMap[round][participantId]
        ) {
          return false;
        }
      }

      // TODO: If all participants have submitted an offer, clear transactions
      // TODO: Increment current round
    }); // end transaction
  }
)