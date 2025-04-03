import {
  onDocumentCreated,
  onDocumentUpdated,
} from 'firebase-functions/v2/firestore';
import {Timestamp} from 'firebase-admin/firestore';
import {
  Experiment,
  ParticipantProfileExtended,
  ParticipantStatus,
  StageKind,
} from '@deliberation-lab/utils';
import {completeStageAsAgentParticipant} from './agent.utils';
import {app} from './app';

/** If created participant is agent, start experiment. */
export const startAgentParticipant = onDocumentCreated(
  {document: 'experiments/{experimentId}/participants/{participantId}'},
  async (event) => {
    const participantDoc = app
      .firestore()
      .doc(
        `experiments/${event.params.experimentId}/participants/${event.params.participantId}`,
      );

    await app.firestore().runTransaction(async (transaction) => {
      // Get participant config
      const participant = (
        await participantDoc.get()
      ).data() as ParticipantProfileExtended;

      // If participant is NOT agent, do nothing
      if (!participant.agentConfig) {
        return;
      }

      // Otherwise, accept terms of service and start experiment
      if (!participant.timestamps.startExperiment) {
        participant.timestamps.startExperiment = Timestamp.now();
      }
      if (!participant.timestamps.acceptedTOS) {
        participant.timestamps.acceptedTOS = Timestamp.now();
      }
      if (!participant.timestamps.readyStages[participant.currentStageId]) {
        participant.timestamps.readyStages[participant.currentStageId] =
          Timestamp.now();
      }
      transaction.set(participantDoc, participant);
    }); // end transaction
  },
);

/** If agent participant is updated, try making a single move
 * (e.g., accepting transfer or moving to next stage).
 */
export const updateAgentParticipant = onDocumentUpdated(
  {document: 'experiments/{experimentId}/participants/{participantId}'},
  async (event) => {
    const participantDoc = app
      .firestore()
      .doc(
        `experiments/${event.params.experimentId}/participants/${event.params.participantId}`,
      );

    const experimentDoc = app
      .firestore()
      .collection('experiments')
      .doc(event.params.experimentId);

    await app.firestore().runTransaction(async (transaction) => {
      // Get participant config
      const participant = (
        await participantDoc.get()
      ).data() as ParticipantProfileExtended;

      // If participant is NOT agent or if experiment over, do nothing
      if (!participant.agentConfig || participant.timestamps.endExperiment) {
        return;
      }

      // Make ONE update for the agent participant (e.g., alter status
      // OR complete a stage)
      if (participant.status === ParticipantStatus.TRANSFER_PENDING) {
        // TODO: Resolve transfer (same logic as acceptParticipantTransfer)
      } else if (participant.status === ParticipantStatus.ATTENTION_CHECK) {
        // Resolve attention check
        // TODO: Move logic (copied from acceptParticipantCheck) into shared utils
        if (participant.transferCohortId) {
          participant.currentStatus = ParticipantStatus.TRANSFER_PENDING;
        } else {
          participant.currentStatus = ParticipantStatus.IN_PROGRESS;
        }
        transaction.set(participantDoc, participant);
      } else {
        // Otherwise, try completing the current stage
        const experiment = (await experimentDoc.get()).data() as Experiment;
        await completeStageAsAgentParticipant(
          experiment,
          participant,
          transaction,
        );
      }
    }); // end transaction
  },
);
