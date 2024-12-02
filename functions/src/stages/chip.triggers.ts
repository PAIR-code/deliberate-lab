import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import {
  ParticipantProfile,
  StageConfig,
  StageKind,
  StagePublicData
} from '@deliberation-lab/utils';

import { app } from '../app';
import {
  getChipParticipantIds,
  updateChipCurrentTurn
} from './chip.utils';


/**
  * When chip negotiation public data is updated,
  * update current turn/round if all participants have responded to current
  * offer
  */
export const completeChipTurn = onDocumentUpdated(
  {
    document:
    'experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}'
  },
  async (event) => {
    const publicDoc = app.firestore()
      .collection('experiments')
      .doc(event.params.experimentId)
      .collection('cohorts')
      .doc(event.params.cohortId)
      .collection('publicStageData')
      .doc(event.params.stageId);

    const stageDoc = app.firestore()
      .collection('experiments')
      .doc(event.params.experimentId)
      .collection('stages')
      .doc(event.params.stageId);

    await app.firestore().runTransaction(async (transaction) => {
      const publicStage = (await publicDoc.get()).data() as StagePublicData;
      if (publicStage.kind !== StageKind.CHIP) {
        return false;
      }

      const stageConfig = (await stageDoc.get()).data() as ChipStageConfig;
      const numRounds = stageConfig.numRounds;

      // If no offer, no need to update
      if (!publicStage.currentTurn) {
        return false;
      }

      // Check all cohort participants for response to offer
      const participantIds = await getChipParticipantIds(
        event.params.experimentId,
        event.params.cohortId
      );

      const currentRound = publicStage.currentRound;
      const acceptedOffer: string[] = [];
      for (const participantId of participantIds) {
        if (
          participantId !== publicStage.currentTurn.participantId &&
          !(participantId in publicStage.currentTurn.responseMap)
        ) {
          // If an active participant (not the current sender) has not
          // responded. do not proceed
          return false;
        } else if (
          participantId !== publicStage.currentTurn.participantId &&
          publicStage.currentTurn.responseMap[participantId]
        ) {
          // Track participants who accepted the current offer
          acceptedOffer.push(participantId);
        }
      }

      // If all (non-offer) participants have responded to the offer,
      // execute chip transaction
      const sender = publicStage.currentTurn.participantId;
      const recipient = acceptedOffer.length > 0 ?
        acceptedOffer[Math.floor(Math.random() * acceptedOffer.length)] : null;

      // TODO: Run chip offer transaction, i.e., update sender and receipient
      // chip amounts and write relevant logs
      console.log('Chip transaction', sender, recipient);

      // Then, update current turn
      publicStage.currentTurn = null;
      const newData = updateChipCurrentTurn(
        publicStage, participantIds, numRounds
      );
      transaction.set(publicDoc, newData);
    }); // end transaction

    return true;
  }
)