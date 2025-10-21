import {
  onDocumentCreated,
  onDocumentUpdated,
} from 'firebase-functions/v2/firestore';

import {
  ParticipantProfileExtended,
  StageConfig,
  StageKind,
} from '@deliberation-lab/utils';
import {startAgentParticipant} from '../agent_participant.utils';
import {
  handleAutomaticTransfer,
  getParticipantRecord,
  initializeParticipantStageAnswers,
} from '../participant.utils';
import {getFirestoreParticipant} from '../utils/firestore';

import {app} from '../app';

/** When participant is created, set participant stage answers. */
export const onParticipantCreation = onDocumentCreated(
  {document: 'experiments/{experimentId}/participants/{participantId}'},
  async (event) => {
    const participant = await getFirestoreParticipant(
      event.params.experimentId,
      event.params.participantId,
    );
    if (!participant) return;

    // Set up participant stage answers
    initializeParticipantStageAnswers(event.params.experimentId, participant);

    // Start making agent calls for participants with agent configs
    startAgentParticipant(event.params.experimentId, participant);
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
      // Fetch the participant's current stage config (outside transaction)
      const stageDocPrecheck = firestore
        .collection('experiments')
        .doc(experimentId)
        .collection('stages')
        .doc(after.currentStageId);
      const stageConfigPrecheck = (
        await stageDocPrecheck.get()
      ).data() as StageConfig;

      if (stageConfigPrecheck?.kind === StageKind.TRANSFER) {
        // Wait 10 seconds before running the transaction, to make sure user's connection is
        // relatively stable
        await new Promise((resolve) => setTimeout(resolve, 10000));
        await firestore.runTransaction(async (transaction) => {
          // Fetch the participant's current stage config again (inside transaction)
          const stageDoc = firestore
            .collection('experiments')
            .doc(experimentId)
            .collection('stages')
            .doc(after.currentStageId);
          const stageConfig = (
            await transaction.get(stageDoc)
          ).data() as StageConfig;

          if (stageConfig?.kind === StageKind.TRANSFER) {
            const participant = await getParticipantRecord(
              transaction,
              experimentId,
              participantId,
            );

            if (!participant) {
              throw new Error('Participant not found');
            }

            // Ensure participant is still connected after the delay
            if (!participant.connected) {
              console.log(
                `Participant ${participantId} is no longer connected after delay, skipping transfer.`,
              );
              return;
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
    }
  },
);
