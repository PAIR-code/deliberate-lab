import { Timestamp } from 'firebase-admin/firestore';
import {
  onDocumentCreated,
  onDocumentUpdated
} from 'firebase-functions/v2/firestore';
import {
  ChipStageParticipantAnswer,
  ChipStagePublicData,
  ChipTransaction,
  ParticipantProfileExtended,
  StageConfig,
  StageKind,
  StagePublicData,
  createChipInfoLogEntry,
  createChipOfferDeclinedLogEntry,
  createChipRoundLogEntry,
  createChipTransactionLogEntry,
  createChipTurnLogEntry,
} from '@deliberation-lab/utils';

import { app } from '../app';
import {
  getChipParticipantIds,
  updateChipCurrentTurn,
  updateParticipantChipQuantities,
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

    // Define log entry collection reference
    const logCollection = app.firestore()
      .collection('experiments')
      .doc(event.params.experimentId)
      .collection('cohorts')
      .doc(event.params.cohortId)
      .collection('publicStageData')
      .doc(event.params.stageId)
      .collection('logs');

    // Define chip transaction collection reference
    const transactionCollection = app.firestore()
      .collection('experiments')
      .doc(event.params.experimentId)
      .collection('cohorts')
      .doc(event.params.cohortId)
      .collection('publicStageData')
      .doc(event.params.stageId)
      .collection('transactions');

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
      const senderId = publicStage.currentTurn.participantId;
      const recipientId = acceptedOffer.length > 0 ?
        acceptedOffer[Math.floor(Math.random() * acceptedOffer.length)] : null;

      // Run chip offer transaction and write relevant logs
      if (recipientId !== null) {
        const chipTransaction: ChipTransaction = {
          offer: publicStage.currentTurn.offer,
          recipientId,
          timestamp: Timestamp.now()
        };
        // Sender/recipient chips will be updated on chip transaction trigger
        transaction.set(transactionCollection.doc(), chipTransaction);
      } else {
        transaction.set(
          logCollection.doc(),
          createChipOfferDeclinedLogEntry(
            publicStage.currentTurn.offer, Timestamp.now()
          )
        );
      }

      // Then, update current turn
      publicStage.currentTurn = null;
      const oldCurrentRound = publicStage.currentRound;
      const newData = updateChipCurrentTurn(
        publicStage, participantIds, numRounds
      );

      // Write logs
      if (newData.isGameOver) {
        transaction.set(
          logCollection.doc(),
          createChipInfoLogEntry('Game over', Timestamp.now())
        );
      } else {
        // Write new round log entry if applicable
        if (oldCurrentRound !== newData.currentRound) {
          transaction.set(
            logCollection.doc(),
            createChipRoundLogEntry(newData.currentRound, Timestamp.now())
          );
        }
        // Write new turn entry
        transaction.set(
          logCollection.doc(),
          createChipTurnLogEntry(
            newData.currentRound,
            newData.currentTurn.participantId,
            Timestamp.now()
          )
        );
      }

      // Update public stage data
      transaction.set(publicDoc, newData);
    }); // end transaction

    return true;
  }
);

/**
  * When chip transaction doc is written,
  * update sender/recipient chip quantities and write log
  */
export const completeChipTransaction = onDocumentCreated(
  {
    document:
    'experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}/transactions/{transactionId}'
  },
  async (event) => {
    const publicDoc = app.firestore()
      .collection('experiments')
      .doc(event.params.experimentId)
      .collection('cohorts')
      .doc(event.params.cohortId)
      .collection('publicStageData')
      .doc(event.params.stageId);

    const transactionDoc = app.firestore()
      .collection('experiments')
      .doc(event.params.experimentId)
      .collection('cohorts')
      .doc(event.params.cohortId)
      .collection('publicStageData')
      .doc(event.params.stageId)
      .collection('transactions')
      .doc(event.params.transactionId);

    // Define log entry collection reference
    const logCollection = app.firestore()
      .collection('experiments')
      .doc(event.params.experimentId)
      .collection('cohorts')
      .doc(event.params.cohortId)
      .collection('publicStageData')
      .doc(event.params.stageId)
      .collection('logs');

    await app.firestore().runTransaction(async (transaction) => {
      const chipTransaction = (await transactionDoc.get()).data() as ChipTransaction;
      const senderId = chipTransaction.offer.senderId;
      const recipientId = chipTransaction.recipientId;
      const buyMap = chipTransaction.offer.buy;
      const sellMap = chipTransaction.offer.sell;

      // Get public stage data
      const publicStageData = (await publicDoc.get()).data() as ChipStagePublicData;

      // Update sender chip quantities
      const senderResult = await updateParticipantChipQuantities(
        event.params.experimentId,
        event.params.stageId,
        senderId,
        buyMap,
        sellMap,
        publicStageData,
        transaction
      );
      if (senderResult) {
        transaction.set(senderResult.answerDoc, senderResult.answer);
      }

      // Update recipient chip quantities
      const recipientResult = await updateParticipantChipQuantities(
        event.params.experimentId,
        event.params.stageId,
        recipientId,
        sellMap,
        buyMap,
        publicStageData,
        transaction
      );
      if (recipientResult) {
        transaction.set(recipientResult.answerDoc, recipientResult.answer);
      }

      // Write success log
      transaction.set(
        logCollection.doc(),
        createChipTransactionLogEntry(
          chipTransaction.offer, recipientId, Timestamp.now()
        )
      );

      // Update public stage data
      transaction.set(publicDoc, publicStageData);
    }); // end transaction

    return true;
  }
);