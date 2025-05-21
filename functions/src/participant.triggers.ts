import {onDocumentCreated} from 'firebase-functions/v2/firestore';

import {
  ChipPublicStageData,
  ParticipantProfileExtended,
  StageConfig,
  StageKind,
  createChipStageParticipantAnswer,
  createPayoutStageParticipantAnswer,
} from '@deliberation-lab/utils';

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

      const getRandomChipValue = (chip) => {
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
            const chipMap = {};
            const chipValueMap = {};
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
            ).data() as ChipPublicStageData;
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
