import {Timestamp} from 'firebase-admin/firestore';
import {
  AutoTransferType,
  ChipItem,
  Experiment,
  ParticipantProfileExtended,
  ParticipantStatus,
  TransferStageConfig,
  StageConfig,
  StageKind,
  CohortConfig,
  createCohortConfig,
  createMetadataConfig,
  SurveyStagePublicData,
  SurveyQuestionKind,
  createChipStageParticipantAnswer,
  createPayoutStageParticipantAnswer,
  ChipStagePublicData,
} from '@deliberation-lab/utils';
import {completeStageAsAgentParticipant} from './agent_participant.utils';
import {
  getFirestoreActiveParticipants,
  getFirestoreStage,
} from './utils/firestore';
import {generateId} from '@deliberation-lab/utils';
import {createCohortInternal} from './cohort.utils';
import {sendSystemChatMessage} from './chat/chat.utils';

import {app} from './app';

/** Update participant's current stage to next stage (or end experiment). */
export async function updateParticipantNextStage(
  experimentId: string,
  participant: ParticipantProfileExtended,
  stageIds: string[],
) {
  const response = {
    currentStageId: null as string | null,
    endExperiment: false,
  };

  const currentStageId = participant.currentStageId;
  const currentStageIndex = stageIds.indexOf(currentStageId);

  // Check if current stage is a group chat stage and send system message if so
  // NOTE: Only do this if the chat has not already been completed
  const currentStage = await getFirestoreStage(experimentId, currentStageId);
  if (
    currentStage?.kind === StageKind.CHAT &&
    !participant.timestamps.completedStages[currentStageId]
  ) {
    await sendSystemChatMessage(
      experimentId,
      participant.currentCohortId,
      currentStageId,
      // TODO(#867): Check to see if the participant's name should be overridden
      // by a different profile (e.g., "Animals 2" instead of "Animals 1")
      // based on any alternate profile information hardcoded into the stage ID
      `${participant.name ?? 'A participant'} has left the chat.`,
      // Include sender ID if the system message is related to an agent
      // participant moving on. This allows us to prevent the system message
      // from triggering an API query from that same participant.
      participant.publicId,
    );
  }

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

/** Automatically transfer participants based on survey answers. */
export async function handleAutomaticTransfer(
  transaction: FirebaseFirestore.Transaction,
  experimentId: string,
  stageConfig: TransferStageConfig,
  participant: ParticipantProfileExtended,
): Promise<{currentStageId: string; endExperiment: boolean} | null> {
  const firestore = app.firestore();

  // If stage config does not have an auto-transfer config, ignore
  // TODO: Remove temporary ignore of "default" transfer type
  if (
    !stageConfig.autoTransferConfig ||
    stageConfig.autoTransferConfig.type !== AutoTransferType.SURVEY
  ) {
    return null;
  }

  // Auto-transfer config
  // TODO: Add switch statement depending on transfer type
  const autoTransferConfig = stageConfig.autoTransferConfig;

  // Do a read to lock the current participant's document for this transaction
  // The data itself might be outdated, so we discard it
  const participantDocRef = firestore
    .collection('experiments')
    .doc(experimentId)
    .collection('participants')
    .doc(participant.privateId);
  await transaction.get(participantDocRef);

  // Fetch participants waiting at this stage and in the same cohort as the current participant
  const waitingParticipants = (
    await transaction.get(
      firestore
        .collection('experiments')
        .doc(experimentId)
        .collection('participants')
        .where('currentStageId', '==', stageConfig.id)
        .where('currentStatus', '==', ParticipantStatus.IN_PROGRESS)
        .where('currentCohortId', '==', participant.currentCohortId)
        .where('transferCohortId', '==', null),
    )
  ).docs.map((doc) => doc.data() as ParticipantProfileExtended);

  // Add the current participant if they're not already present
  // (they might not be, since their currentStageId hasn't been updated in the db yet)
  if (!waitingParticipants.some((p) => p.privateId === participant.privateId)) {
    waitingParticipants.push(participant);
  }

  // Filter connected participants
  const connectedParticipants = waitingParticipants.filter((p) => p.connected);

  console.log(
    `Connected participants for transfer stage ${stageConfig.id}: ${connectedParticipants
      .map((p) => p.publicId)
      .join(', ')}`,
  );

  // Fetch public data for the relevant survey stage
  const surveyStageDoc = firestore
    .collection('experiments')
    .doc(experimentId)
    .collection('cohorts')
    .doc(participant.currentCohortId)
    .collection('publicStageData')
    .doc(autoTransferConfig.surveyStageId!);

  const surveyStageData = (await transaction.get(surveyStageDoc)).data() as
    | SurveyStagePublicData
    | undefined;

  if (!surveyStageData) {
    throw new Error('Survey stage data not found');
  }

  // Update requiredCounts to be treated as a Firebase map type
  const requiredCounts = autoTransferConfig.participantCounts || {};

  // Group participants by survey answers
  const answerGroups: Record<string, ParticipantProfileExtended[]> = {};
  for (const connectedParticipant of connectedParticipants) {
    const surveyAnswers =
      surveyStageData.participantAnswerMap[connectedParticipant.publicId];
    if (!surveyAnswers) {
      console.log(
        `Participant ${connectedParticipant.publicId} has no survey answers`,
      );
      continue;
    }

    const surveyAnswer = surveyAnswers[autoTransferConfig.surveyQuestionId];
    if (!surveyAnswer) {
      console.log(
        `Participant ${connectedParticipant.publicId} has no survey answer matching ${autoTransferConfig.surveyQuestionId}`,
      );
      continue;
    }

    // Only support multiple-choice questions for now
    if (surveyAnswer.kind !== SurveyQuestionKind.MULTIPLE_CHOICE) {
      throw new Error(
        `Selected survey answer is not of kind ${SurveyQuestionKind.MULTIPLE_CHOICE}`,
      );
    }

    const key = surveyAnswer.choiceId;
    if (!answerGroups[key]) {
      answerGroups[key] = [];
    }
    answerGroups[key].push(connectedParticipant);
    console.log(
      `Participant ${connectedParticipant.publicId} has answer ${key}`,
    );
  }

  // Check if a cohort can be formed
  const cohortParticipants: ParticipantProfileExtended[] = [];

  for (const [key, requiredCount] of Object.entries(requiredCounts)) {
    let matchingParticipants = answerGroups[key] || [];

    // Sort by waiting time (oldest first)
    matchingParticipants = matchingParticipants.sort((a, b) => {
      const aTime =
        a.timestamps.readyStages?.[stageConfig.id]?.toMillis?.() ?? 0;
      const bTime =
        b.timestamps.readyStages?.[stageConfig.id]?.toMillis?.() ?? 0;
      return aTime - bTime;
    });

    // Move the current participant to the front if present
    matchingParticipants = matchingParticipants
      .filter((p) => p.privateId === participant.privateId)
      .concat(
        matchingParticipants.filter(
          (p) => p.privateId !== participant.privateId,
        ),
      );

    // If not enough participants to form a cohort, return null
    if (matchingParticipants.length < requiredCount) {
      console.log(
        `Not enough participants for answer group ${key}: expected ${requiredCount}, found ${matchingParticipants.length}, not transferring`,
      );
      return null;
    }

    cohortParticipants.push(...matchingParticipants.slice(0, requiredCount));
  }

  // nb: for transaction purposes, writes begin here and there can be no more reads.

  // Create a new cohort and transfer participants
  const cohortConfig = createCohortConfig({
    id: generateId(),
    metadata: createMetadataConfig({
      creator: 'system',
      dateCreated: Timestamp.now(),
      dateModified: Timestamp.now(),
    }),
    participantConfig: autoTransferConfig.autoCohortParticipantConfig,
  });

  console.log(
    `Creating cohort ${cohortConfig.id} for participants: ${cohortParticipants.map((p) => p.publicId).join(', ')}`,
  );

  await createCohortInternal(transaction, experimentId, cohortConfig);

  for (const participant of cohortParticipants) {
    const participantDoc = firestore
      .collection('experiments')
      .doc(experimentId)
      .collection('participants')
      .doc(participant.privateId);

    transaction.update(participantDoc, {
      transferCohortId: cohortConfig.id,
      currentStatus: ParticipantStatus.TRANSFER_PENDING,
    });

    console.log(
      `Transferring participant ${participant.publicId} to cohort ${cohortConfig.id}`,
    );
  }

  // Update the passed-in participant as a side-effect, since this is how we merge all the changes
  // from the updateParticipantToNextStage endpoint
  participant.currentStatus = ParticipantStatus.TRANSFER_PENDING;
  participant.transferCohortId = cohortConfig.id;

  return {currentStageId: stageConfig.id, endExperiment: false};
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

/** Set up participant stage answers. */
export async function initializeParticipantStageAnswers(
  experimentId: string,
  participantConfig: ParticipantProfileExtended,
) {
  await app.firestore().runTransaction(async (transaction) => {
    const participantId = participantConfig.privateId;

    // Get all stage configs
    const stageConfigs = (
      await app
        .firestore()
        .collection(`experiments/${experimentId}/stages`)
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
        .doc(experimentId)
        .collection('participants')
        .doc(participantId)
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
            .doc(experimentId)
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
}
