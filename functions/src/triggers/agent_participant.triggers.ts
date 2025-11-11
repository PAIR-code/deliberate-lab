import {onDocumentUpdated} from 'firebase-functions/v2/firestore';
import {
  Experiment,
  ParticipantProfileExtended,
  ParticipantStatus,
} from '@deliberation-lab/utils';
import {completeStageAsAgentParticipant} from '../agent_participant.utils';
import {sendInitialChatMessages} from '../chat/chat.agent';
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
    if (!event.data) return;

    const experimentId = event.params.experimentId;

    // Check if participant moved to a new stage (for initial message sending)
    const before = event.data.before.data() as ParticipantProfileExtended;
    const after = event.data.after.data() as ParticipantProfileExtended;

    if (before.currentStageId !== after.currentStageId) {
      // Only send initial messages if the stage is unlocked
      const cohort = await getFirestoreCohort(
        experimentId,
        after.currentCohortId,
      );

      // Check if the stage is unlocked before sending initial messages
      // This prevents sending messages for stages that are gated by "waiting"
      // where all participants must be on the current stage first
      if (cohort?.stageUnlockMap[after.currentStageId]) {
        await sendInitialChatMessages(
          experimentId,
          after.currentCohortId,
          after.currentStageId,
          after.privateId,
        );
      }
    }

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
      if (participant.currentStatus === ParticipantStatus.ATTENTION_CHECK) {
        // Resolve attention check
        // TODO: Move logic into completeStageAsAgentParticipant
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
      } else if (!cohort?.stageUnlockMap[participant.currentStageId]) {
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
