import {
  onDocumentCreated,
  onDocumentUpdated,
} from 'firebase-functions/v2/firestore';
import {Timestamp} from 'firebase-admin/firestore';
import {
  CohortConfig,
  Experiment,
  ParticipantProfileExtended,
  ParticipantStatus,
  StageKind,
} from '@deliberation-lab/utils';
import {completeStageAsAgentParticipant} from '../agent_participant.utils';
import {updateCohortStageUnlocked} from '../participant.utils';
import {
  getFirestoreCohort,
  getFirestoreParticipant,
  getFirestoreParticipantRef,
} from '../utils/firestore';
import {app} from '../app';

/** If agent participant is updated, try making a single move
 * (e.g., accepting transfer or moving to next stage).
 */
export const updateAgentParticipant = onDocumentUpdated(
  {document: 'experiments/{experimentId}/participants/{participantId}'},
  async (event) => {
    const experimentDoc = app
      .firestore()
      .collection('experiments')
      .doc(event.params.experimentId);

    await app.firestore().runTransaction(async (transaction) => {
      // Get participant config
      const participant = await getFirestoreParticipant(
        event.params.experimentId,
        event.params.participantId,
      );

      // If participant is NOT agent or if experiment over, do nothing
      if (!participant?.agentConfig || participant?.timestamps.endExperiment) {
        return;
      }

      // Get cohort config
      const cohort = await getFirestoreCohort(
        event.params.experimentId,
        participant.currentCohortId,
      );

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
        const participantDoc = getFirestoreParticipantRef(
          event.params.experimentId,
          participant.privateId,
        );
        transaction.set(participantDoc, participant);
      } else if (!cohort.stageUnlockMap[participant.currentStageId]) {
        // If stage is locked, do nothing
        // TODO: Write log about stage being locked
      } else {
        // Otherwise, try completing the current stage
        const experiment = (await experimentDoc.get()).data() as Experiment;
        await completeStageAsAgentParticipant(experiment, participant);
      }
    }); // end transaction
  },
);
