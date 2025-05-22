import {onDocumentCreated, onDocumentUpdated} from 'firebase-functions/v2/firestore';

import {
  ChipItem,
  ChipStagePublicData,
  ParticipantProfileExtended,
  StageConfig,
  StageKind,
  createChipStageParticipantAnswer,
  createPayoutStageParticipantAnswer,
} from '@deliberation-lab/utils';
import {
  handleAutomaticTransfer,
  getParticipantRecord,
} from './participant.utils';

import {app} from './app';

/** When participant is created, set participant stage answers. */
export const setParticipantStageData = onDocumentCreated(
  {document: 'experiments/{experimentId}/participants/{participantId}'},
  async (event) => {
    const participantDoc = app
      .firestore()
      .doc(
        `experiments/${event.params.experimentId}/participants/${event.params.participantId}`,
      );

    await app.firestore().runTransaction(async (transaction) => {
      // Get participant config
      const participantConfig = (
        await participantDoc.get()
      ).data() as ParticipantProfileExtended;

      // Get all stage configs
      const stageConfigs = (
        await app
          .firestore()
          .collection(`experiments/${event.params.experimentId}/stages`)
          .get()
      ).docs.map((doc) => doc.data() as StageConfig);

      const getRandomChipValue = (chip: ChipItem) => {
        const step = 0.1;
        const lower = Math.round(chip.lowerValue / step);
        const upper = Math.round(chip.upperValue / step);
        const randomStep =
          Math.floor(Math.random() * (upper - lower + 1)) + lower;

        return parseFloat((randomStep * step).toFixed(2));
      };

      for (const stage of stageConfigs) {
        // Define doc reference for stage
        const stageDoc = app
          .firestore()
          .collection('experiments')
          .doc(event.params.experimentId)
          .collection('participants')
          .doc(event.params.participantId)
          .collection('stageData')
          .doc(stage.id);

        // Write stage answer if relevant
        switch (stage.kind) {
          case StageKind.CHIP:
            // If chip stage, set default chips for participant based on config
            const chipMap: Record<string, number> = {};
            const chipValueMap: Record<string, number> = {};
            stage.chips.forEach((chip) => {
              chipMap[chip.id] = chip.startingQuantity;
              chipValueMap[chip.id] = getRandomChipValue(chip);
            });

            const chipAnswer = createChipStageParticipantAnswer(
              stage.id,
              chipMap,
              chipValueMap,
            );

            transaction.set(stageDoc, chipAnswer);

            // Set public stage data
            const publicChipDoc = app
              .firestore()
              .collection('experiments')
              .doc(event.params.experimentId)
              .collection('cohorts')
              .doc(participantConfig.currentCohortId)
              .collection('publicStageData')
              .doc(stage.id);

            const publicChipData = (
              await publicChipDoc.get()
            ).data() as ChipStagePublicData;
            const publicId = participantConfig.publicId;

            publicChipData.participantChipMap[publicId] = chipAnswer.chipMap;
            publicChipData.participantChipValueMap[publicId] =
              chipAnswer.chipValueMap;
            transaction.set(publicChipDoc, publicChipData);
            break;
          case StageKind.PAYOUT:
            // If payout stage, set random selection of payout items
            const payoutAnswer = createPayoutStageParticipantAnswer(stage);
            transaction.set(stageDoc, payoutAnswer);
            break;
          default:
            break;
        }
      } // end stage config logic
    }); // end transaction
  },
);

/** Trigger when a disconnected participant reconnects. */
export const onParticipantReconnect = onDocumentUpdated(
  {
    document: 'experiments/{experimentId}/participants/{participantId}',
  },
  async (event) => {
    if (!event.data) return;
    const experimentId = event.params.experimentId;
    const participantId = event.params.participantId;

    const before = event.data.before.data() as ParticipantProfileExtended;
    const after = event.data.after.data() as ParticipantProfileExtended;

    // Check if participant reconnected
    if (!before.connected && after.connected) {
      const firestore = app.firestore();
      await firestore.runTransaction(async (transaction) => {
        // Fetch the participant's current stage config
        const stageDoc = firestore
          .collection('experiments')
          .doc(experimentId)
          .collection('stages')
          .doc(after.currentStageId);

        const stageConfig = (
          await transaction.get(stageDoc)
        ).data() as StageConfig;

        if (stageConfig?.kind === StageKind.TRANSFER) {
          const participant = await getParticipantRecord(transaction, experimentId, participantId);

          if (!participant) {
            throw new Error('Participant not found');
          }

          const transferResult = await handleAutomaticTransfer(
            transaction,
            experimentId,
            stageConfig,
            participant,
          );
          if (transferResult) {
            // Store any updates to participant after transfer
            const participantDoc = app
              .firestore()
              .collection('experiments')
              .doc(experimentId)
              .collection('participants')
              .doc(participant.privateId);
            transaction.set(participantDoc, participant);
          }
        }
      });
    }
  },
);
