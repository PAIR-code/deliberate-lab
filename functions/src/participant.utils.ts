import {Timestamp} from 'firebase-admin/firestore';
import {
  Experiment,
  ParticipantProfileExtended,
  ParticipantStatus,
  TransferStageConfig,
  StageConfig,
  CohortConfig,
} from '@deliberation-lab/utils';
import {completeStageAsAgentParticipant} from './agent.utils';
import {getFirestoreActiveParticipants} from './utils/firestore';
import {generateId} from '@deliberation-lab/utils';

import {app} from './app';

/** Update participant's current stage to next stage (or end experiment). */
export async function updateParticipantNextStage(
  experimentId: string,
  participant: ParticipantProfileExtended,
  stageIds: string[],
) {
  const response = {currentStageId: null as (string | null), endExperiment: false};

  const currentStageId = participant.currentStageId;
  const currentStageIndex = stageIds.indexOf(currentStageId);

  // Mark current stage as completed
  const timestamp = Timestamp.now();
  participant.timestamps.completedStages[currentStageId] = timestamp;

  // If at end of experiment
  if (currentStageIndex + 1 === stageIds.length) {
    // Update end of experiment fields
    participant.timestamps.endExperiment = timestamp;
    participant.currentStatus = ParticipantStatus.SUCCESS;
    response.endExperiment = true;
  } else {
    // Else, progress to next stage
    const nextStageId = stageIds[currentStageIndex + 1];
    participant.currentStageId = nextStageId;
    response.currentStageId = nextStageId;

    // Mark next stage as reached
    participant.timestamps.readyStages[nextStageId] = timestamp;

    // If all active participants have reached the next stage,
    // unlock that stage in CohortConfig
    await updateCohortStageUnlocked(
      experimentId,
      participant.currentCohortId,
      participant.currentStageId,
      participant.privateId,
    );
  }

  return response;
}

/** If given stage in a cohort can be unlocked (all active participants
 *  are ready to start), set the stage as unlocked in CohortConfig.
 */
// TODO: Move to cohort.utils file?
export async function updateCohortStageUnlocked(
  experimentId: string,
  cohortId: string,
  stageId: string,
  currentParticipantId: string,
) {
  await app.firestore().runTransaction(async (transaction) => {
    // Get active participants for given cohort
    const activeParticipants = await getFirestoreActiveParticipants(
      experimentId,
      cohortId,
    );

    // Get participant pending transfer into current cohort
    const transferParticipants = (
      await app
        .firestore()
        .collection('experiments')
        .doc(experimentId)
        .collection('participants')
        .where('transferCohortId', '==', cohortId)
        .get()
    ).docs
      .map((doc) => doc.data() as ParticipantProfileExtended)
      .filter(
        (participant) =>
          participant.currentStatus === ParticipantStatus.TRANSFER_PENDING,
      );

    // Consider both participants actively in cohort and pending transfer
    const participants = [...activeParticipants, ...transferParticipants];

    // Get current stage config
    const stage = (
      await app
        .firestore()
        .collection('experiments')
        .doc(experimentId)
        .collection('stages')
        .doc(stageId)
        .get()
    ).data() as StageConfig;

    // Check if min participants requirement is met
    const hasMinParticipants = () => {
      return stage.progress.minParticipants <= participants.length;
    };

    // If waitForAllParticipants, check if active participants are ready to
    // start stage
    // If not waitForAllParticipants, return true
    const isParticipantsReady = () => {
      let numReady = 0;

      for (const participant of participants) {
        // If current participant, assume completed
        // (Firestore may not have updated yet)
        // Otherwise, check if ready to start / transferring in current stage
        const isTransfer =
          participant.currentStageId === stageId &&
          participant.currentStatus === ParticipantStatus.TRANSFER_PENDING;
        const isReadyToStart =
          participant.timestamps.startExperiment &&
          participant.timestamps.readyStages[stageId];
        const isCurrent = participant.privateId === currentParticipantId;
        if ((!isTransfer && isReadyToStart) || isCurrent) {
          numReady += 1;
        }
      }

      if (stage.progress.waitForAllParticipants) {
        return numReady >= participants.length;
      }
      return numReady >= stage.progress.minParticipants;
    };

    // If all active participants are ready to start
    // AND min participants requirement is met, unlock cohort
    if (!hasMinParticipants() || !isParticipantsReady()) {
      return;
    }

    const cohortDoc = app
      .firestore()
      .collection('experiments')
      .doc(experimentId)
      .collection('cohorts')
      .doc(cohortId);

    const cohortConfig = (await cohortDoc.get()).data() as CohortConfig;
    if (cohortConfig.stageUnlockMap[stageId]) {
      return; // already marked as true
    }

    cohortConfig.stageUnlockMap[stageId] = true;
    transaction.set(cohortDoc, cohortConfig);

    // Now that the given stage is unlocked, active any agent
    // participants that are ready to start (and have not yet completed)
    // the current stage
    const experiment = (
      await app.firestore().collection('experiments').doc(experimentId).get()
    ).data() as Experiment;
    for (const participant of participants) {
      if (participant.agentConfig && participant.currentStageId === stageId) {
        completeStageAsAgentParticipant(experiment, participant);
      } // end agent participant if
    } // end participant loop
  });
}

/** Check and transfer participants based on survey answers. */
export async function handleAutomaticTransfer(
  transaction: FirebaseFirestore.Transaction,
  experimentId: string,
  stageConfig: TransferStageConfig,
  participantId: string,
) {
  const firestore = app.firestore();

  // Fetch participants waiting at this stage
  const waitingParticipants = (
    await transaction.get(
      firestore
        .collection('experiments')
        .doc(experimentId)
        .collection('participants')
        .where('currentStageId', '==', stageConfig.id)
        .where('currentStatus', '==', ParticipantStatus.TRANSFER_PENDING),
    )
  ).docs.map((doc) => doc.data() as ParticipantProfileExtended);

  // Filter connected participants
  const connectedParticipants = waitingParticipants.filter(
    (participant) => participant.connected,
  );

  const participant = await getParticipantRecord(transaction, experimentId, participantId);

  if (!participant) {
    throw new Error('Participant not found');
  }

  // Fetch public data for the relevant survey stage
  const surveyStageDoc = firestore
    .collection('experiments')
    .doc(experimentId)
    .collection('cohorts')
    .doc(participant.currentCohortId)
    .collection('publicStageData')
    .doc(stageConfig.surveyStageId!);

  const surveyStageData = (
    await transaction.get(surveyStageDoc)
  ).data() as { participantAnswerMap: Record<string, string[]> } | undefined;

  if (!surveyStageData) {
    throw new Error('Survey stage data not found');
  }

  // Group participants by survey answers
  const answerGroups: Record<string, ParticipantProfileExtended[]> = {};
  for (const participant of connectedParticipants) {
    const surveyAnswer = surveyStageData.participantAnswerMap[participant.publicId];
    if (!surveyAnswer) continue;

    const key = JSON.stringify(surveyAnswer);
    if (!answerGroups[key]) {
      answerGroups[key] = [];
    }
    answerGroups[key].push(participant);
  }

  // Check if a cohort can be formed
  const requiredCounts = stageConfig.participantCounts || {};
  const cohortParticipants: ParticipantProfileExtended[] = [];

  for (const [key, requiredCount] of Object.entries(requiredCounts)) {
    const groupedAnswers = JSON.parse(key) as string[];
    const matchingParticipants = groupedAnswers.flatMap(
      (answer) => answerGroups[JSON.stringify(answer)] || [],
    );

    if (matchingParticipants.length < requiredCount) {
      return; // Not enough participants to form a cohort
    }

    cohortParticipants.push(...matchingParticipants.slice(0, requiredCount));
  }

  // Create a new cohort and transfer participants
  const cohortId = generateId();
  const cohortDoc = firestore
    .collection('experiments')
    .doc(experimentId)
    .collection('cohorts')
    .doc(cohortId);

  transaction.set(cohortDoc, { stageId: stageConfig.id, participants: cohortParticipants.map((p) => p.privateId) });

  for (const participant of cohortParticipants) {
    const participantDoc = firestore
      .collection('experiments')
      .doc(experimentId)
      .collection('participants')
      .doc(participant.privateId);

    transaction.update(participantDoc, {
      currentCohortId: cohortId,
      currentStatus: ParticipantStatus.IN_PROGRESS,
    });
  }
}

/** Fetch a participant record by experimentId and participantId. */
export async function getParticipantRecord(
  transaction: FirebaseFirestore.Transaction,
  experimentId: string,
  participantId: string,
): Promise<ParticipantProfileExtended | null> {
  const participantDoc = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('participants')
    .doc(participantId);

  const participantSnapshot = await transaction.get(participantDoc);
  return participantSnapshot.exists
    ? (participantSnapshot.data() as ParticipantProfileExtended)
    : null;
}
