import {
  onDocumentCreated,
  onDocumentUpdated,
} from 'firebase-functions/v2/firestore';
import {Timestamp} from 'firebase-admin/firestore';
import {Experiment, ParticipantProfileExtended} from '@deliberation-lab/utils';
import {updateParticipantNextStage} from './participant.utils';

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
      transaction.set(participantDoc, participant);
    }); // end transaction
  },
);

/** If agent participant is updated, try completing next stage. */
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

      // TODO: If transfer pending, accept transfer
      // TODO: Track intended next move for agent participant?
      // TODO: Don't move to next stage if unlocked?

      // Try updating next stage
      const experiment = (await experimentDoc.get()).data() as Experiment;
      await updateParticipantNextStage(
        event.params.experimentId,
        participant,
        experiment.stageIds,
      );
      transaction.set(participantDoc, participant);
    }); // end transaction
  },
);
