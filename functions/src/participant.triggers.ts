import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import {
  StageConfig,
  StageKind,
  createChipStageParticipantAnswer,
} from '@deliberation-lab/utils';

import { app } from './app';

/** When participant is created, set participant stage answers. */
export const setParticipantStageData = onDocumentCreated(
  { document: 'experiments/{experimentId}/participants/{participantId}' },
  async (event) => {
    // Get all stage configs
    const stageConfigs = (
      await app
        .firestore()
        .collection(
          `experiments/${event.params.experimentId}/stages`,
        )
        .get()
    ).docs.map((doc) => doc.data() as StageConfig);

    await app.firestore().runTransaction(async (transaction) => {
      stageConfigs.forEach((stage) => {
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
            stage.chips.forEach(chip => {
              chipMap[chip.id] = chip.quantity;
            });

            const chipAnswer = createChipStageParticipantAnswer(
              stage.id,
              chipMap 
            );

            transaction.set(stageDoc, chipAnswer);
            break;
          default:
            break;          
        }
      }); // end stage config logic
    }); // end transaction
  }
)