import {Timestamp} from 'firebase-admin/firestore';
import {
  AutoTransferType,
  ChipItem,
  ConditionAutoTransferConfig,
  Experiment,
  ParticipantProfileExtended,
  ParticipantStatus,
  TransferStageConfig,
  TransferGroup,
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
  RoleStagePublicData,
  evaluateCondition,
  extractMultipleConditionDependencies,
  getConditionTargetKey,
  extractAnswerValue,
} from '@deliberation-lab/utils';
import {completeStageAsAgentParticipant} from './agent_participant.utils';
import {
  getFirestoreActiveParticipants,
  getFirestoreExperiment,
  getFirestoreStage,
} from './utils/firestore';
import {generateId} from '@deliberation-lab/utils';
import {createCohortInternal} from './cohort.utils';
import {sendSystemChatMessage} from './chat/chat.utils';

import {app} from './app';

/**
 * Instructions for executing direct transfers after a transaction commits.
 * Used for sequential transfer pattern (matching TRANSFER_PENDING behavior).
 */
export interface DirectTransferInstructions {
  experimentId: string;
  targetCohortId: string;
  stageIds: string[];
  participantPrivateIds: string[];
}

/**
 * Result from handleAutomaticTransfer that may include pending direct transfers.
 */
export interface AutomaticTransferResult {
  response: {currentStageId: string; endExperiment: boolean} | null;
  directTransferInstructions: DirectTransferInstructions | null;
}

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
        .where('currentStatus', '==', ParticipantStatus.TRANSFER_PENDING)
        .get()
    ).docs.map((doc) => doc.data() as ParticipantProfileExtended);

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

/** Automatically transfer participants based on config type. */
export async function handleAutomaticTransfer(
  transaction: FirebaseFirestore.Transaction,
  experimentId: string,
  stageConfig: TransferStageConfig,
  participant: ParticipantProfileExtended,
): Promise<AutomaticTransferResult> {
  const emptyResult: AutomaticTransferResult = {
    response: null,
    directTransferInstructions: null,
  };

  if (!stageConfig.autoTransferConfig) {
    return emptyResult;
  }

  switch (stageConfig.autoTransferConfig.type) {
    case AutoTransferType.SURVEY:
      return {
        response: await handleSurveyAutoTransfer(
          transaction,
          experimentId,
          stageConfig,
          participant,
        ),
        directTransferInstructions: null,
      };
    case AutoTransferType.CONDITION:
      return handleConditionAutoTransfer(
        transaction,
        experimentId,
        stageConfig,
        participant,
      );
    case AutoTransferType.DEFAULT:
    default:
      // DEFAULT type not yet implemented
      return emptyResult;
  }
}

/** Handle SURVEY type auto-transfer (legacy - multiple choice only). */
async function handleSurveyAutoTransfer(
  transaction: FirebaseFirestore.Transaction,
  experimentId: string,
  stageConfig: TransferStageConfig,
  participant: ParticipantProfileExtended,
): Promise<{currentStageId: string; endExperiment: boolean} | null> {
  const firestore = app.firestore();
  const autoTransferConfig = stageConfig.autoTransferConfig!;

  if (autoTransferConfig.type !== AutoTransferType.SURVEY) {
    return null;
  }

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

/**
 * Handle CONDITION type auto-transfer.
 * Uses the Condition system for flexible routing based on any survey question type.
 *
 * Supports mixed-composition cohorts: each TransferGroup can have multiple composition entries,
 * and a cohort is formed when ALL composition entries in the group have met their minCount.
 *
 * For direct transfers (targetCohortAlias set), returns transfer instructions
 * to be executed after the transaction commits (sequential pattern).
 * For TRANSFER_PENDING (new cohort), sets status and returns response.
 */
async function handleConditionAutoTransfer(
  transaction: FirebaseFirestore.Transaction,
  experimentId: string,
  stageConfig: TransferStageConfig,
  participant: ParticipantProfileExtended,
): Promise<AutomaticTransferResult> {
  const emptyResult: AutomaticTransferResult = {
    response: null,
    directTransferInstructions: null,
  };
  const firestore = app.firestore();
  const autoTransferConfig =
    stageConfig.autoTransferConfig as ConditionAutoTransferConfig;

  // Do a read to lock the current participant's document for this transaction
  const participantDocRef = firestore
    .collection('experiments')
    .doc(experimentId)
    .collection('participants')
    .doc(participant.privateId);
  await transaction.get(participantDocRef);

  // Fetch participants waiting at this stage and in the same cohort
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

  // Add the current participant if not already present
  if (!waitingParticipants.some((p) => p.privateId === participant.privateId)) {
    waitingParticipants.push(participant);
  }

  // Filter connected participants
  const connectedParticipants = waitingParticipants.filter((p) => p.connected);

  console.log(
    `[CONDITION] Connected participants for transfer stage ${stageConfig.id}: ${connectedParticipants
      .map((p) => p.publicId)
      .join(', ')}`,
  );

  // Extract all stage IDs we need survey data from (from all conditions in all composition entries)
  const allConditions = autoTransferConfig.transferGroups.flatMap((g) =>
    g.composition.map((entry) => entry.condition),
  );
  const dependencies = extractMultipleConditionDependencies(allConditions);
  const stageIds = [...new Set(dependencies.map((d) => d.stageId))];

  // Fetch survey data for all referenced stages
  const surveyDataMap: Record<string, SurveyStagePublicData> = {};
  for (const stageId of stageIds) {
    const surveyStageDoc = firestore
      .collection('experiments')
      .doc(experimentId)
      .collection('cohorts')
      .doc(participant.currentCohortId)
      .collection('publicStageData')
      .doc(stageId);

    const surveyStageData = (await transaction.get(surveyStageDoc)).data() as
      | SurveyStagePublicData
      | undefined;

    if (surveyStageData) {
      surveyDataMap[stageId] = surveyStageData;
    }
  }

  // Build target values for each participant
  const participantTargetValues = new Map<string, Record<string, unknown>>();
  for (const p of connectedParticipants) {
    participantTargetValues.set(
      p.privateId,
      buildTargetValuesForParticipant(p, surveyDataMap),
    );
  }

  // For each TransferGroup, categorize participants by which composition entry they satisfy
  // Structure: { groupId: { compositionEntryId: [participants] } }
  type GroupBuckets = Record<string, ParticipantProfileExtended[]>;
  const groupCompositionBuckets: Record<string, GroupBuckets> = {};

  for (const group of autoTransferConfig.transferGroups) {
    groupCompositionBuckets[group.id] = {};
    for (const entry of group.composition) {
      groupCompositionBuckets[group.id][entry.id] = [];
    }
  }

  // Categorize each participant into buckets
  // A participant goes into the first composition entry they satisfy within each group
  for (const p of connectedParticipants) {
    const targetValues = participantTargetValues.get(p.privateId) || {};

    for (const group of autoTransferConfig.transferGroups) {
      // Find first matching composition entry in this group
      for (const entry of group.composition) {
        if (evaluateCondition(entry.condition, targetValues)) {
          groupCompositionBuckets[group.id][entry.id].push(p);
          console.log(
            `[CONDITION] Participant ${p.publicId} matched composition "${entry.id}" in group "${group.name}"`,
          );
          break; // Only match one composition entry per group per participant
        }
      }
    }
  }

  // Find a group that can form a complete cohort (all composition entries have minCount)
  // and includes the current participant
  let readyGroup: TransferGroup | null = null;
  let readyGroupBuckets: GroupBuckets | null = null;

  for (const group of autoTransferConfig.transferGroups) {
    const buckets = groupCompositionBuckets[group.id];

    // Check if current participant is in any bucket for this group
    const currentParticipantComposition = group.composition.find((entry) =>
      buckets[entry.id].some((p) => p.privateId === participant.privateId),
    );

    if (!currentParticipantComposition) {
      continue; // Current participant not in this group
    }

    // Check if ALL composition entries have enough participants
    const allConditionsMet = group.composition.every(
      (entry) => buckets[entry.id].length >= entry.minCount,
    );

    if (allConditionsMet) {
      readyGroup = group;
      readyGroupBuckets = buckets;
      console.log(
        `[CONDITION] Group "${group.name}" is ready to form a cohort`,
      );
      break;
    } else {
      // Log which composition entries are not yet met
      for (const entry of group.composition) {
        if (buckets[entry.id].length < entry.minCount) {
          console.log(
            `[CONDITION] Group "${group.name}" waiting: composition "${entry.id}" has ${buckets[entry.id].length}/${entry.minCount} participants`,
          );
        }
      }
    }
  }

  if (!readyGroup || !readyGroupBuckets) {
    console.log(
      `[CONDITION] No group ready to form cohort with current participant ${participant.publicId}`,
    );
    return emptyResult;
  }

  // Build cohort participants from each composition entry bucket
  const cohortParticipants: ParticipantProfileExtended[] = [];

  for (const entry of readyGroup.composition) {
    let bucketParticipants = readyGroupBuckets[entry.id];

    // Sort by waiting time (oldest first)
    bucketParticipants = bucketParticipants.sort((a, b) => {
      const aTime =
        a.timestamps.readyStages?.[stageConfig.id]?.toMillis?.() ?? 0;
      const bTime =
        b.timestamps.readyStages?.[stageConfig.id]?.toMillis?.() ?? 0;
      return aTime - bTime;
    });

    // Move the current participant to the front if present in this bucket
    bucketParticipants = bucketParticipants
      .filter((p) => p.privateId === participant.privateId)
      .concat(
        bucketParticipants.filter((p) => p.privateId !== participant.privateId),
      );

    // Take up to maxCount from this bucket
    const selected = bucketParticipants.slice(0, entry.maxCount);
    cohortParticipants.push(...selected);

    console.log(
      `[CONDITION] Selected ${selected.length} participants from composition "${entry.id}": ${selected.map((p) => p.publicId).join(', ')}`,
    );
  }

  // Check if routing to existing cohort or creating new one
  if (readyGroup.targetCohortAlias) {
    // Route to existing cohort - return instructions for sequential transfers
    const experiment = await getFirestoreExperiment(experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    const definition = experiment.cohortDefinitions?.find(
      (d) => d.alias === readyGroup!.targetCohortAlias,
    );
    if (!definition?.generatedCohortId) {
      const availableAliases =
        experiment.cohortDefinitions?.map((d) => d.alias).join(', ') || 'none';
      throw new Error(
        `No cohort found for alias "${readyGroup.targetCohortAlias}" in experiment ${experimentId}. ` +
          `Available aliases: ${availableAliases}`,
      );
    }
    const targetCohortId = definition.generatedCohortId;

    console.log(
      `[CONDITION] Preparing direct transfer to cohort ${targetCohortId} (alias: ${readyGroup.targetCohortAlias}) ` +
        `for group "${readyGroup.name}" ` +
        `with participants: ${cohortParticipants.map((p) => p.publicId).join(', ')}`,
    );

    return {
      response: {currentStageId: stageConfig.id, endExperiment: false},
      directTransferInstructions: {
        experimentId,
        targetCohortId,
        stageIds: experiment.stageIds,
        participantPrivateIds: cohortParticipants.map((p) => p.privateId),
      },
    };
  } else {
    // Create a new cohort and transfer participants (TRANSFER_PENDING behavior)
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
      `[CONDITION] Creating cohort ${cohortConfig.id} for group "${readyGroup.name}" ` +
        `with participants: ${cohortParticipants.map((p) => p.publicId).join(', ')}`,
    );

    await createCohortInternal(transaction, experimentId, cohortConfig);

    // Set TRANSFER_PENDING for all participants
    for (const p of cohortParticipants) {
      const participantDoc = firestore
        .collection('experiments')
        .doc(experimentId)
        .collection('participants')
        .doc(p.privateId);

      transaction.update(participantDoc, {
        transferCohortId: cohortConfig.id,
        currentStatus: ParticipantStatus.TRANSFER_PENDING,
      });

      console.log(
        `[CONDITION] Transferring participant ${p.publicId} to cohort ${cohortConfig.id}`,
      );
    }

    // Update the passed-in participant as a side-effect
    participant.currentStatus = ParticipantStatus.TRANSFER_PENDING;
    participant.transferCohortId = cohortConfig.id;

    return {
      response: {currentStageId: stageConfig.id, endExperiment: false},
      directTransferInstructions: null,
    };
  }
}

/**
 * Execute direct transfers sequentially after the main transaction commits.
 * Each participant is transferred in their own transaction, matching TRANSFER_PENDING behavior.
 * Returns the response from the first participant (the triggering participant).
 */
export async function executeDirectTransfers(
  instructions: DirectTransferInstructions,
): Promise<{currentStageId: string | null; endExperiment: boolean}> {
  const firestore = app.firestore();
  let triggerResponse: {currentStageId: string | null; endExperiment: boolean} =
    {
      currentStageId: null,
      endExperiment: false,
    };

  for (const participantPrivateId of instructions.participantPrivateIds) {
    console.log(
      `[DIRECT_TRANSFER] Starting transfer for participant ${participantPrivateId} to cohort ${instructions.targetCohortId}`,
    );

    // Each participant gets their own transaction (matches TRANSFER_PENDING pattern)
    await firestore.runTransaction(async (transaction) => {
      const participantDoc = firestore
        .collection('experiments')
        .doc(instructions.experimentId)
        .collection('participants')
        .doc(participantPrivateId);

      const participant = (
        await transaction.get(participantDoc)
      ).data() as ParticipantProfileExtended;

      if (!participant) {
        console.error(
          `[DIRECT_TRANSFER] Participant ${participantPrivateId} not found, skipping`,
        );
        return;
      }

      // Skip if participant is already in target cohort (e.g., concurrent transfer completed first)
      if (participant.currentCohortId === instructions.targetCohortId) {
        console.log(
          `[DIRECT_TRANSFER] Participant ${participantPrivateId} already in target cohort, skipping`,
        );
        return;
      }

      const result = await completeParticipantTransfer(
        transaction,
        firestore,
        instructions.experimentId,
        participantDoc,
        participant,
        instructions.targetCohortId,
        instructions.stageIds,
      );

      // Capture response from first participant (the trigger)
      if (participantPrivateId === instructions.participantPrivateIds[0]) {
        triggerResponse = result;
      }

      console.log(
        `[DIRECT_TRANSFER] Completed transfer for participant ${participant.publicId} to cohort ${instructions.targetCohortId}`,
      );
    });
  }

  return triggerResponse;
}

/**
 * Complete a participant's transfer to a new cohort.
 * This is the shared logic used by both:
 * - acceptParticipantTransfer endpoint (user-initiated via popup)
 * - executeDirectTransfers (backend-initiated, sequential)
 *
 * Handles: timestamp recording, cohort update, status update, stage progression,
 * participant save, and stage data migration.
 */
export async function completeParticipantTransfer(
  transaction: FirebaseFirestore.Transaction,
  firestore: FirebaseFirestore.Firestore,
  experimentId: string,
  participantDoc: FirebaseFirestore.DocumentReference,
  participant: ParticipantProfileExtended,
  targetCohortId: string,
  stageIds: string[],
): Promise<{currentStageId: string | null; endExperiment: boolean}> {
  let response: {currentStageId: string | null; endExperiment: boolean} = {
    currentStageId: null,
    endExperiment: false,
  };

  // 1. Record transfer timestamp
  const timestamp = Timestamp.now();
  participant.timestamps.cohortTransfers[participant.currentCohortId] =
    timestamp;

  // 2. Update cohort ID
  participant.currentCohortId = targetCohortId;

  // 3. Clear transfer cohort ID (if it was set)
  participant.transferCohortId = null;

  // 4. Set status to IN_PROGRESS
  participant.currentStatus = ParticipantStatus.IN_PROGRESS;

  // 5. If on a transfer stage, proceed to next stage
  const currentStage = await getFirestoreStage(
    experimentId,
    participant.currentStageId,
  );
  if (currentStage?.kind === StageKind.TRANSFER) {
    response = await updateParticipantNextStage(
      experimentId,
      participant,
      stageIds,
    );
  }

  // 6. Migrate stage data to new cohort's publicStageData
  // (must happen before writes since it uses transaction.get())
  await migrateParticipantStageData(
    transaction,
    firestore,
    experimentId,
    participant,
    targetCohortId,
  );

  // 7. Save participant
  transaction.set(participantDoc, participant);

  return response;
}

/**
 * Migrate participant's stage data to a new cohort's publicStageData.
 * This copies the participant's answers (survey, chip, role) to the target cohort.
 */
async function migrateParticipantStageData(
  transaction: FirebaseFirestore.Transaction,
  firestore: FirebaseFirestore.Firestore,
  experimentId: string,
  participant: ParticipantProfileExtended,
  targetCohortId: string,
): Promise<void> {
  const publicId = participant.publicId;

  // Get participant's stage data
  const stageData = await firestore
    .collection(
      `experiments/${experimentId}/participants/${participant.privateId}/stageData`,
    )
    .get();

  const stageAnswers = stageData.docs.map((stage) => stage.data());

  // For each relevant answer, add to target cohort's public stage data
  for (const stage of stageAnswers) {
    const publicDocument = firestore
      .collection('experiments')
      .doc(experimentId)
      .collection('cohorts')
      .doc(targetCohortId)
      .collection('publicStageData')
      .doc(stage.id);

    switch (stage.kind) {
      case StageKind.SURVEY:
        const publicSurveyData = (
          await transaction.get(publicDocument)
        ).data() as SurveyStagePublicData;
        if (publicSurveyData) {
          publicSurveyData.participantAnswerMap[publicId] = stage.answerMap;
          transaction.set(publicDocument, publicSurveyData);
        }
        break;
      case StageKind.CHIP:
        const publicChipData = (
          await transaction.get(publicDocument)
        ).data() as ChipStagePublicData;
        if (publicChipData) {
          publicChipData.participantChipMap[publicId] = stage.chipMap;
          publicChipData.participantChipValueMap[publicId] = stage.chipValueMap;
          transaction.set(publicDocument, publicChipData);
        }
        break;
      case StageKind.ROLE:
        const publicRoleData = (
          await transaction.get(publicDocument)
        ).data() as RoleStagePublicData;
        if (publicRoleData) {
          // TODO: Assign new role to participant (or move role over)
          transaction.set(publicDocument, publicRoleData);
        }
        break;
      default:
        break;
    }
  }
}

/**
 * Build target values map for condition evaluation from participant's survey answers.
 * Returns a map with keys in format "stageId::questionId" and values from survey answers.
 */
function buildTargetValuesForParticipant(
  participant: ParticipantProfileExtended,
  surveyDataMap: Record<string, SurveyStagePublicData>,
): Record<string, unknown> {
  const targetValues: Record<string, unknown> = {};

  for (const [stageId, surveyData] of Object.entries(surveyDataMap)) {
    const participantAnswers =
      surveyData.participantAnswerMap[participant.publicId];
    if (!participantAnswers) continue;

    for (const [questionId, answer] of Object.entries(participantAnswers)) {
      const key = getConditionTargetKey({stageId, questionId});
      targetValues[key] = extractAnswerValue(answer);
    }
  }

  return targetValues;
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
