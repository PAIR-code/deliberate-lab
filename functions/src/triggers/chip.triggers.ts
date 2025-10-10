import {Timestamp} from 'firebase-admin/firestore';
import {onDocumentCreated} from 'firebase-functions/v2/firestore';
import {
  ChipStagePublicData,
  ChipTransaction,
  createChipTransactionLogEntry,
} from '@deliberation-lab/utils';

import {app} from '../app';
import {updateParticipantChipQuantities} from '../stages/chip.utils';

/**
 * When chip transaction doc is written,
 * update sender/recipient chip quantities and write log
 */
export const completeChipTransaction = onDocumentCreated(
  {
    document:
      'experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}/transactions/{transactionId}',
  },
  async (event) => {
    const publicDoc = app
      .firestore()
      .collection('experiments')
      .doc(event.params.experimentId)
      .collection('cohorts')
      .doc(event.params.cohortId)
      .collection('publicStageData')
      .doc(event.params.stageId);

    const transactionDoc = app
      .firestore()
      .collection('experiments')
      .doc(event.params.experimentId)
      .collection('cohorts')
      .doc(event.params.cohortId)
      .collection('publicStageData')
      .doc(event.params.stageId)
      .collection('transactions')
      .doc(event.params.transactionId);

    // Define log entry collection reference
    const logCollection = app
      .firestore()
      .collection('experiments')
      .doc(event.params.experimentId)
      .collection('cohorts')
      .doc(event.params.cohortId)
      .collection('publicStageData')
      .doc(event.params.stageId)
      .collection('logs');

    await app.firestore().runTransaction(async (transaction) => {
      const chipTransaction = (
        await transactionDoc.get()
      ).data() as ChipTransaction;
      const senderId = chipTransaction.offer.senderId;
      const recipientId = chipTransaction.recipientId;
      const buyMap = chipTransaction.offer.buy;
      const sellMap = chipTransaction.offer.sell;

      // Get public stage data
      const publicStageData = (
        await publicDoc.get()
      ).data() as ChipStagePublicData;

      // Update sender chip quantities
      const senderResult = await updateParticipantChipQuantities(
        event.params.experimentId,
        event.params.stageId,
        senderId,
        buyMap,
        sellMap,
        publicStageData,
        transaction,
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
        transaction,
      );
      if (recipientResult) {
        transaction.set(recipientResult.answerDoc, recipientResult.answer);
      }

      // Write success log.
      transaction.set(
        logCollection.doc(),
        createChipTransactionLogEntry(chipTransaction, Timestamp.now()),
      );

      // Update public stage data
      transaction.set(publicDoc, publicStageData);
    }); // end transaction

    return true;
  },
);
