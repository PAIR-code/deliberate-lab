import {Timestamp} from 'firebase-admin/firestore';
import {
  Experiment,
  ParticipantProfileExtended,
  ParticipantStatus,
  StageKind,
} from '@deliberation-lab/utils';
import {app} from './app';
import {
  updateCohortStageUnlocked,
  updateParticipantNextStage,
} from './participant.utils';
import {completeProfile} from './stages/profile.utils';
import {assignRolesToParticipants} from './stages/role.utils';
import {
  getExperimenterData,
  getFirestoreParticipantRef,
  getFirestoreStage,
} from './utils/firestore';

import {Transaction} from 'firebase-admin/firestore';

/** Complete agent participant's current stage. */
export async function completeStageAsAgentParticipant(
  experiment: Experiment,
  participant: ParticipantProfileExtended,
) {
  const experimentId = experiment.id;
  const participantDoc = getFirestoreParticipantRef(
    experimentId,
    participant.privateId,
  );

  // Only update if participant is active, etc.
  const status = participant.currentStatus;
  if (status !== ParticipantStatus.IN_PROGRESS) {
    return;
  }

  // Ensure participants have start experiment, TOS, and current stage
  // ready marked appropriately
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

  const completeStage = async () => {
    await updateParticipantNextStage(
      experimentId,
      participant,
      experiment.stageIds,
    );
  };

  const stage = await getFirestoreStage(
    experimentId,
    participant.currentStageId,
  );

  if (!stage) {
    console.error(
      `Could not find stage ${participant.currentStageId} for experiment ${experimentId}`,
    );
    return;
  }

  // Fetch experiment creator's API key.
  const creatorId = experiment.metadata.creator;
  const experimenterData = await getExperimenterData(creatorId);

  // ParticipantAnswer doc
  const answerDoc = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('participants')
    .doc(participant.privateId)
    .collection('stageData')
    .doc(stage.id);

  switch (stage.kind) {
    case StageKind.CHAT:
      // Do not complete stage as agent participant must chat first.
      // Initial messages are now handled by sendInitialChatMessages in agent_participant.triggers.ts
      // when currentStageId changes, so no action needed here.
      break;
    case StageKind.PRIVATE_CHAT:
      // Do not complete stage as agent participant must chat first.
      // Initial messages are now handled by sendInitialChatMessages in agent_participant.triggers.ts
      // when currentStageId changes, so no action needed here.
      break;
    case StageKind.PROFILE:
      await completeProfile(experimentId, participant, stage);
      await completeStage();
      participantDoc.set(participant);
      break;
    case StageKind.ROLE:
      await assignRolesToParticipants(
        experimentId,
        participant.currentCohortId,
        stage.id,
      );
      await completeStage();
      participantDoc.set(participant);
      break;
    case StageKind.SALESPERSON:
      // Do not complete stage as agent participant must chat first.
      // Initial messages are now handled by sendInitialChatMessages in agent_participant.triggers.ts
      // when currentStageId changes, so no action needed here.
      break;
    case StageKind.RANKING:
      if (!experimenterData) {
        console.log('Could not find experimenter data and API key');
        break;
      }
      // TODO: Add logic to complete ranking stage
      await completeStage();
      participantDoc.set(participant);
      break;
    case StageKind.SURVEY:
      if (!experimenterData) {
        console.log('Could not find experimenter data and API key');
        break;
      }
      // TODO: Add logic to complete survey stage
      answerDoc.set(surveyAnswer);
      await completeStage();
      participantDoc.set(participant);
      break;
    case StageKind.TRANSFER:
      // Do not proceed to next stage. Instead, wait for proposed transfer
      break;
    default:
      console.log(`Move to next stage (${participant.publicId})`);
      await completeStage();
      participantDoc.set(participant);
  }
}

/** Start agent participant. */
export async function startAgentParticipant(
  experimentId: string,
  participant: ParticipantProfileExtended,
) {
  await app.firestore().runTransaction(async (transaction: Transaction) => {
    // If participant is NOT agent, do nothing
    if (!participant?.agentConfig) {
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
    await updateCohortStageUnlocked(
      experimentId,
      participant.currentCohortId,
      participant.currentStageId,
      participant.privateId,
    );
    const participantDoc = getFirestoreParticipantRef(
      experimentId,
      participant.privateId,
    );
    transaction.set(participantDoc, participant);
  }); // end transaction
}
