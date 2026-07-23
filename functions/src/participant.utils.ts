import {Timestamp} from 'firebase-admin/firestore';
import {
  AssetAllocationStageParticipantAnswer,
  AssetAllocationStagePublicData,
  AutoTransferType,
  ChipItem,
  ChipStageParticipantAnswer,
  ChipStagePublicData,
  CohortConfig,
  ConditionAutoTransferConfig,
  createChipStageParticipantAnswer,
  createCohortConfig,
  createMetadataConfig,
  createPayoutStageParticipantAnswer,
  createSurveyStagePublicData,
  evaluateCondition,
  Experiment,
  extractAnswerValue,
  extractMultipleConditionDependencies,
  FlipCardStageParticipantAnswer,
  FlipCardStagePublicData,
  getConditionTargetKey,
  MultiAssetAllocationStageParticipantAnswer,
  MultiAssetAllocationStagePublicData,
  ParticipantProfileExtended,
  ParticipantStatus,
  RankingStageParticipantAnswer,
  RankingStagePublicData,
  RoleStagePublicData,
  StageConfig,
  SYSTEM_VARIABLE_NAMESPACE,
  STAGE_KIND_REQUIRES_TRANSFER_MIGRATION,
  StageKind,
  StageParticipantAnswer,
  StagePublicData,
  SurveyQuestionKind,
  SurveyStageParticipantAnswer,
  SurveyStagePublicData,
  TransferGroup,
  TransferStageConfig,
  createParticipantProfileExtended,
  getRepresentativeProfile,
  createProgressTimestamps,
  setProfile,
  ProfileType,
  ProfileStageConfig,
  AgentPersonaConfig,
  MediatorProfileExtended,
  DEFAULT_AGENT_MODEL_SETTINGS,
  RESERVED_TREATMENT_VARIABLE_KEYS,
  MEDIATOR_OBSERVER_COLOR,
} from '@deliberation-lab/utils';
import {completeStageAsAgentParticipant} from './agent_participant.utils';
import {
  getFirestoreActiveParticipants,
  getFirestoreCohortParticipants,
  getFirestoreExperiment,
  getFirestoreParticipantAnswerRef,
  getFirestoreStage,
  getFirestoreStagePublicDataRef,
} from './utils/firestore';
import {generateId, UnifiedTimestamp} from '@deliberation-lab/utils';
import {createCohortInternal} from './cohort.utils';
import {sendSystemChatMessage} from './chat/chat.utils';
import {
  getRoundTreatmentIndex,
  treatmentAtIndexSkipsPrivateChats,
  treatmentSkipsPrivateChats,
} from './treatment.utils';
import {createMediatorProfileForPersona} from './mediator.utils';
import {computeRoundVariableMap, personaMatchHash} from './persona_bank.utils';

import {app} from './app';

/**
 * Migration handlers for transferring participant public data between cohorts.
 * Each handler mutates the target cohort's public data to include the
 * transferring participant's answers.
 *
 * TODO: Consider standardizing all stage public data to use `participantAnswerMap`
 * instead of varying field names (participantAllocations, participantFlipHistory, etc.)
 * This would allow a more generic migration approach.
 *
 * To add a new migratable stage kind, mark it `true` in
 * STAGE_KIND_REQUIRES_TRANSFER_MIGRATION in utils/src/stages/stage.ts and
 * add a handler here. A test verifies these stay in sync.
 */
export const TRANSFER_MIGRATION_HANDLERS = {
  [StageKind.SURVEY]: (
    publicData: SurveyStagePublicData,
    stage: SurveyStageParticipantAnswer,
    publicId: string,
  ) => {
    publicData.participantAnswerMap[publicId] = stage.answerMap;
  },
  [StageKind.CHIP]: (
    publicData: ChipStagePublicData,
    stage: ChipStageParticipantAnswer,
    publicId: string,
  ) => {
    publicData.participantChipMap[publicId] = stage.chipMap;
    publicData.participantChipValueMap[publicId] = stage.chipValueMap;
  },
  [StageKind.RANKING]: (
    publicData: RankingStagePublicData,
    stage: RankingStageParticipantAnswer,
    publicId: string,
  ) => {
    publicData.participantAnswerMap[publicId] = stage.rankingList;
  },
  [StageKind.ASSET_ALLOCATION]: (
    publicData: AssetAllocationStagePublicData,
    stage: AssetAllocationStageParticipantAnswer,
    publicId: string,
  ) => {
    publicData.participantAllocations[publicId] = stage.allocation;
  },
  [StageKind.MULTI_ASSET_ALLOCATION]: (
    publicData: MultiAssetAllocationStagePublicData,
    stage: MultiAssetAllocationStageParticipantAnswer,
    publicId: string,
  ) => {
    publicData.participantAnswerMap[publicId] = {
      kind: StageKind.MULTI_ASSET_ALLOCATION,
      id: stage.id,
      allocationMap: stage.allocationMap,
      isConfirmed: stage.isConfirmed,
      confirmedTimestamp: stage.confirmedTimestamp,
    };
  },
  [StageKind.FLIPCARD]: (
    publicData: FlipCardStagePublicData,
    stage: FlipCardStageParticipantAnswer,
    publicId: string,
  ) => {
    publicData.participantFlipHistory[publicId] = stage.flipHistory ?? [];
    publicData.participantSelections[publicId] = stage.selectedCardIds ?? [];
  },
  [StageKind.ROLE]: (_publicData: RoleStagePublicData) => {
    // TODO: Assign new role to participant (or move role over)
  },
} as Partial<
  Record<
    StageKind,
    (
      publicData: StagePublicData,
      stage: StageParticipantAnswer,
      publicId: string,
    ) => void
  >
>;

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

/**
 * Create a comparator function that sorts participants by waiting time (oldest first).
 * Used to ensure fair ordering when selecting participants for transfers.
 */
function createWaitingTimeComparator(stageId: string) {
  return (a: ParticipantProfileExtended, b: ParticipantProfileExtended) => {
    const aTime = a.timestamps.readyStages?.[stageId]?.toMillis?.() ?? 0;
    const bTime = b.timestamps.readyStages?.[stageId]?.toMillis?.() ?? 0;
    return aTime - bTime;
  };
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
    // Else, progress to the next stage, skipping a private chat only when the
    // treatment for that round sets `_skipPrivateChats`. In a within-subjects
    // design, a round that skips its own private chat must not also skip
    // another round's. The round is attributed via the following
    // transfer's treatmentIndex; if a private chat can't be attributed to a
    // round, fall back to the round-independent flag. Read directly from the
    // treatment (not a hoisted field) because a private chat can precede the
    // transfer stage where treatment is hoisted.
    let nextStageIndex = currentStageIndex + 1;
    while (nextStageIndex < stageIds.length) {
      const candidateId = stageIds[nextStageIndex];
      const candidate = await getFirestoreStage(experimentId, candidateId);
      if (candidate?.kind === StageKind.PRIVATE_CHAT) {
        const roundIndex = await getRoundTreatmentIndex(
          experimentId,
          stageIds,
          nextStageIndex,
        );
        const skip =
          roundIndex !== null
            ? treatmentAtIndexSkipsPrivateChats(
                participant.variableMap,
                roundIndex,
              )
            : treatmentSkipsPrivateChats(participant.variableMap);
        if (skip) {
          // Bypass this private chat entirely: never mark it reached/current.
          nextStageIndex++;
          continue;
        }
      }
      break;
    }

    if (nextStageIndex >= stageIds.length) {
      // Skipping ran past the last stage, so end the experiment.
      participant.timestamps.endExperiment = timestamp;
      participant.currentStatus = ParticipantStatus.SUCCESS;
      response.endExperiment = true;
    } else {
      const nextStageId = stageIds[nextStageIndex];
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
  existingTransaction?: FirebaseFirestore.Transaction,
) {
  const runLogic = async (transaction: FirebaseFirestore.Transaction) => {
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

    // Consider both participants actively in cohort and pending transfer.
    // Inactive personas are excluded: they never chat or take a turn,
    // so they must not count toward (or block) the stage unlock gate.
    const participants = [
      ...activeParticipants,
      ...transferParticipants,
    ].filter((p) => !p.agentConfig?.isInactivePersona);

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

    const cohortConfig = (await cohortDoc.get()).data() as
      | CohortConfig
      | undefined;
    if (!cohortConfig || cohortConfig.stageUnlockMap[stageId]) {
      return; // cohort deleted or already unlocked
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
  };

  if (existingTransaction) {
    await runLogic(existingTransaction);
  } else {
    await app.firestore().runTransaction(runLogic);
  }
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
    matchingParticipants = matchingParticipants.sort(
      createWaitingTimeComparator(stageConfig.id),
    );

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
  const timestamp = Timestamp.now() as UnifiedTimestamp;
  const cohortConfig = createCohortConfig({
    id: generateId(),
    metadata: createMetadataConfig({
      creator: 'system',
      dateCreated: timestamp,
      dateModified: timestamp,
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
 * Find an existing overflow cohort with available capacity, or create a new one.
 *
 * When a pre-defined cohort reaches maxParticipantsPerCohort, this function finds
 * or creates an overflow cohort with the same alias. This allows the overflow cohort
 * to inherit the same cohortValues (variable overrides) as the original.
 *
 * Uses the provided maxParticipants for all capacity checks (from definition or experiment default).
 *
 * @param transaction - Firestore transaction for creating new cohorts
 * @param experimentId - The experiment ID
 * @param alias - The cohort alias to find/create overflow for
 * @param maxParticipants - Maximum participants per cohort (from definition or experiment default)
 * @param newParticipantCount - Number of new participants being added
 * @param participantConfig - Config for new cohort if created
 * @returns The cohort ID to use (either existing overflow or newly created)
 */
async function findOrCreateOverflowCohort(
  transaction: FirebaseFirestore.Transaction,
  experimentId: string,
  alias: string,
  maxParticipants: number,
  newParticipantCount: number,
  participantConfig: CohortConfig['participantConfig'],
): Promise<string> {
  const firestore = app.firestore();

  // Query all cohorts with this alias
  const cohortsSnapshot = await firestore
    .collection(`experiments/${experimentId}/cohorts`)
    .where('alias', '==', alias)
    .get();

  // Check each cohort for available capacity using the definition's limit
  for (const doc of cohortsSnapshot.docs) {
    const cohort = doc.data() as CohortConfig;
    const participants = await getFirestoreCohortParticipants(
      experimentId,
      cohort.id,
    );
    const currentCount = participants.length;

    if (currentCount + newParticipantCount <= maxParticipants) {
      console.log(
        `[OVERFLOW] Found cohort ${cohort.id} with capacity: ${currentCount}/${maxParticipants}`,
      );
      return cohort.id;
    }
  }

  // Warn if transfer group exceeds max capacity (cohort will be over-filled)
  if (newParticipantCount > maxParticipants) {
    console.warn(
      `[OVERFLOW] Transfer group size (${newParticipantCount}) exceeds maxParticipantsPerCohort (${maxParticipants}) for alias "${alias}". ` +
        `Cohort will exceed capacity limit.`,
    );
  }

  // No cohort with capacity found - create new overflow cohort with same alias
  const timestamp = Timestamp.now() as UnifiedTimestamp;
  const newCohort = createCohortConfig({
    id: generateId(true),
    alias, // Same alias for cohortValues inheritance
    metadata: createMetadataConfig({
      creator: 'system',
      name: `${alias} (overflow)`,
      dateCreated: timestamp,
      dateModified: timestamp,
    }),
    participantConfig,
  });

  console.log(
    `[OVERFLOW] Creating new overflow cohort ${newCohort.id} for alias "${alias}"`,
  );

  await createCohortInternal(transaction, experimentId, newCohort);
  return newCohort.id;
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

  // Patch in the triggering participant's private stage data to guarantee
  // freshness. publicStageData is populated by an async trigger
  // (onParticipantStageDataUpdated), which may not have completed yet
  // when this participant saves their survey answer and immediately
  // progresses to this transfer stage in the same request sequence.
  for (const stageId of stageIds) {
    const privateStageDoc = getFirestoreParticipantAnswerRef(
      experimentId,
      participant.privateId,
      stageId,
    );
    const privateData = (await transaction.get(privateStageDoc)).data() as
      | SurveyStageParticipantAnswer
      | undefined;
    if (privateData?.answerMap) {
      if (!surveyDataMap[stageId]) {
        surveyDataMap[stageId] = createSurveyStagePublicData(stageId);
      }
      surveyDataMap[stageId].participantAnswerMap[participant.publicId] =
        privateData.answerMap;
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

  // Find group(s) that can form a complete cohort (all composition entries have minCount)
  // and include the current participant.
  // When enableGroupBalancing is true, collect ALL ready groups and pick the one
  // whose target cohort has the fewest participants (balanced assignment).
  // When false (default), first matching ready group wins.
  const enableBalancing = autoTransferConfig.enableGroupBalancing ?? false;
  const readyGroupCandidates: Array<{
    group: TransferGroup;
    buckets: GroupBuckets;
  }> = [];

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
      console.log(
        `[CONDITION] Group "${group.name}" is ready to form a cohort`,
      );
      readyGroupCandidates.push({group, buckets});
      if (!enableBalancing) break; // first match wins (existing behavior)
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

  // Select the best group from candidates
  let readyGroup: TransferGroup | null = null;
  let readyGroupBuckets: GroupBuckets | null = null;

  if (readyGroupCandidates.length === 1 || !enableBalancing) {
    // Single candidate or balancing disabled: use first match
    if (readyGroupCandidates.length > 0) {
      readyGroup = readyGroupCandidates[0].group;
      readyGroupBuckets = readyGroupCandidates[0].buckets;
    }
  } else if (readyGroupCandidates.length > 1) {
    // Balanced selection: pick group whose target cohort has fewest participants
    const experiment = await getFirestoreExperiment(experimentId);

    let minCohortSize = Infinity;
    for (const candidate of readyGroupCandidates) {
      let cohortSize = Infinity; // Default for groups without targetCohortAlias

      if (candidate.group.targetCohortAlias && experiment) {
        const definition = experiment.cohortDefinitions?.find(
          (d) => d.alias === candidate.group.targetCohortAlias,
        );
        if (definition?.generatedCohortId) {
          const cohortParticipants = await getFirestoreCohortParticipants(
            experimentId,
            definition.generatedCohortId,
          );
          cohortSize = cohortParticipants.length;
        }
      }

      console.log(
        `[CONDITION] Balanced selection: group "${candidate.group.name}" ` +
          `(target: ${candidate.group.targetCohortAlias}) has ${cohortSize} participants`,
      );

      // Use strictly less-than for tie-breaking: first match wins on ties
      if (cohortSize < minCohortSize) {
        minCohortSize = cohortSize;
        readyGroup = candidate.group;
        readyGroupBuckets = candidate.buckets;
      }
    }

    console.log(
      `[CONDITION] Balanced selection chose group "${readyGroup?.name}"`,
    );
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
    bucketParticipants = bucketParticipants.sort(
      createWaitingTimeComparator(stageConfig.id),
    );

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
    // Route to existing cohort (or overflow cohort if at capacity)
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

    let targetCohortId = definition.generatedCohortId;

    // Check capacity if maxParticipantsPerCohort is configured.
    // Use definition override if set, otherwise fall back to experiment default.
    // If null (no limit configured), skip capacity check entirely - no extra queries.
    const maxParticipants =
      definition.maxParticipantsPerCohort !== undefined
        ? definition.maxParticipantsPerCohort
        : experiment.defaultCohortConfig.maxParticipantsPerCohort;

    const participants = await getFirestoreCohortParticipants(
      experimentId,
      targetCohortId,
    );
    if (
      (maxParticipants !== null &&
        participants.length + cohortParticipants.length > maxParticipants) ||
      (participants.some((p) => !p.agentConfig && p.isObserver) &&
        cohortParticipants.some((p) => !p.agentConfig && !p.isObserver))
    ) {
      console.log(
        `[CONDITION] Cohort ${targetCohortId} full/observer conflict, finding overflow`,
      );
      targetCohortId = await findOrCreateOverflowCohort(
        transaction,
        experimentId,
        readyGroup.targetCohortAlias,
        maxParticipants || 1,
        cohortParticipants.length,
        autoTransferConfig.autoCohortParticipantConfig,
      );
    }

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
    const timestamp = Timestamp.now() as UnifiedTimestamp;
    const cohortConfig = createCohortConfig({
      id: generateId(),
      metadata: createMetadataConfig({
        creator: 'system',
        dateCreated: timestamp,
        dateModified: timestamp,
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
 * Reserved (underscore-prefixed) treatment keys mapped to the participant field
 * each is hoisted onto and the type its raw value is coerced to. These are a
 * subset of RESERVED_TREATMENT_VARIABLE_KEYS in @deliberation-lab/utils (the
 * variable editor warns on that full set); keys read directly rather than
 * hoisted, e.g. _skipPrivateChats, intentionally do not appear here.
 */
const TREATMENT_HOIST_FIELDS: Record<
  string,
  {field: string; type: 'boolean' | 'number' | 'string'}
> = {
  _isObserver: {field: 'isObserver', type: 'boolean'},
  _hasRepresentative: {field: 'hasRepresentative', type: 'boolean'},
  _numOtherAgents: {field: 'numOtherAgents', type: 'number'},
  _numInactivePersonas: {
    field: 'numInactivePersonas',
    type: 'number',
  },
  _swapMediator: {field: 'swapMediator', type: 'string'},
};

/**
 * Coerce a raw treatment value to its declared type. The type is driven by the
 * key's entry in TREATMENT_HOIST_FIELDS rather than by whatever value is already
 * on the target, so a missing field on the target can't silently turn a boolean
 * into a (truthy) string.
 */
function coerceTreatmentValue(
  value: unknown,
  type: 'boolean' | 'number' | 'string',
): boolean | number | string {
  switch (type) {
    case 'boolean':
      return String(value) === 'true' || value === true;
    case 'number':
      return Number(value);
    default:
      return String(value);
  }
}

/** Apply one coerced reserved-key value onto the participant target. */
function applyTreatmentField(
  target: Record<string, unknown>,
  field: string,
  type: 'boolean' | 'number' | 'string',
  raw: unknown,
): void {
  const value = coerceTreatmentValue(raw, type);
  if (field === 'numOtherAgents' || field === 'numInactivePersonas') {
    if (!target['otherAgentGeneration']) {
      target['otherAgentGeneration'] = {numOtherAgents: 0};
    }
    const gen = target['otherAgentGeneration'] as {
      numOtherAgents: number;
      numInactivePersonas?: number;
    };
    (gen as Record<string, number>)[field] = value as number;
  } else {
    target[field] = value;
  }
}

/**
 * Collect every hoist-managed reserved key that appears anywhere in a value
 * (across all rounds of a treatment variable). Used to decide which target
 * fields to reset before re-hoisting.
 */
function collectHoistFieldKeys(value: unknown, into: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectHoistFieldKeys(item, into);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (key in TREATMENT_HOIST_FIELDS) into.add(key);
    collectHoistFieldKeys(nested, into);
  }
}

/**
 * Recursively hoist reserved treatment keys found anywhere in a treatment value
 * (top level or any level of nesting) onto the participant target.
 */
function hoistTreatmentObject(
  target: Record<string, unknown>,
  value: unknown,
): void {
  if (Array.isArray(value)) {
    for (const item of value) hoistTreatmentObject(target, item);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const spec = TREATMENT_HOIST_FIELDS[key];
    if (spec) {
      applyTreatmentField(target, spec.field, spec.type, raw);
    } else if (raw && typeof raw === 'object') {
      hoistTreatmentObject(target, raw);
    }
  }
}

/**
 * Apply (hoist) a treatment bundle's fields onto a participant-like target,
 * selecting the treatment for round `index` (0-based). Supports both multi-value
 * variable formats produced by RandomPermutation/BalancedAssignment:
 *
 *  - Array form (expandListToSeparateVariables = false): a single variable holds
 *    an array [t0, t1, ...]; element [index] is selected.
 *  - Expanded form (expandListToSeparateVariables = true): separate variables
 *    name_1, name_2, ...; the one whose 1-based suffix equals index + 1 is
 *    selected (others skipped).
 *  - A plain (non-indexed) object value is always applied.
 *
 * At creation the experiment hoists round 0; re-running with a different index
 * at a transfer stage lets a participant rotate through multiple treatments
 * across repeated deliberations. An out-of-range index is a safe no-op.
 */
export function applyHoistedTreatment(
  target: Record<string, unknown>,
  variableMap: Record<string, string>,
  index: number,
): void {
  // Reset every hoist field the treatment scheme uses to its "off" default
  // before applying the selected round. Otherwise, when a participant is
  // re-hoisted at a transfer (within-subjects rotation), a round whose
  // treatment omits a key would silently inherit the previous round's value
  // (e.g. stay an observer / keep swapping the mediator). Only keys the scheme
  // actually defines are reset, so experiments that set these fields outside
  // of treatment hoisting are left untouched.
  const managedKeys = new Set<string>();
  for (const value of Object.values(variableMap)) {
    try {
      collectHoistFieldKeys(JSON.parse(value), managedKeys);
    } catch {
      continue; // Not JSON, skip
    }
  }
  for (const key of managedKeys) {
    const spec = TREATMENT_HOIST_FIELDS[key];
    const def =
      spec.type === 'boolean' ? false : spec.type === 'number' ? 0 : '';
    applyTreatmentField(target, spec.field, spec.type, def);
  }

  for (const [name, value] of Object.entries(variableMap)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      continue; // Not JSON, skip
    }

    let treatment: unknown;
    if (Array.isArray(parsed)) {
      treatment = parsed[index]; // array form
    } else if (parsed && typeof parsed === 'object') {
      const suffix = name.match(/_(\d+)$/); // expanded form: name_1, name_2, ...
      if (suffix && Number(suffix[1]) !== index + 1) continue;
      treatment = parsed;
    } else {
      continue;
    }

    if (treatment && typeof treatment === 'object') {
      hoistTreatmentObject(target, treatment as Record<string, unknown>);
    }
  }
}

/** True if a parsed variable value contains a reserved treatment key anywhere. */
function valueContainsReservedTreatmentKey(value: unknown): boolean {
  const reserved: readonly string[] = RESERVED_TREATMENT_VARIABLE_KEYS;
  if (Array.isArray(value)) {
    return value.some(valueContainsReservedTreatmentKey);
  }
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (reserved.includes(key)) return true;
      if (valueContainsReservedTreatmentKey(nested)) return true;
    }
  }
  return false;
}

/** Remove reserved treatment keys from a parsed variable value, recursively. */
function stripReservedTreatmentKeys(value: unknown): unknown {
  const reserved: readonly string[] = RESERVED_TREATMENT_VARIABLE_KEYS;
  if (Array.isArray(value)) {
    return value.map(stripReservedTreatmentKeys);
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (reserved.includes(key)) continue;
      result[key] = stripReservedTreatmentKeys(nested);
    }
    return result;
  }
  return value;
}

/**
 * Variables a spawned agent inherits from the participant it is spawned
 * alongside. Reserved treatment keys are removed from the copied values so
 * none of their effects apply to the agent; display names still resolve.
 */
function inheritSpawnedAgentVariables(
  variableMap: Record<string, string> | undefined,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [name, value] of Object.entries(variableMap ?? {})) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      result[name] = value; // non-JSON can't hold reserved keys; keep as-is
      continue;
    }
    result[name] = valueContainsReservedTreatmentKey(parsed)
      ? JSON.stringify(stripReservedTreatmentKeys(parsed))
      : value;
  }
  return result;
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
    experimentId,
    participant,
    targetCohortId,
  );

  // Re-apply this round's treatment bundle (observer role, spawned-agent count,
  // mediator name, etc.) when the transfer stage names a treatment index. This
  // lets a participant rotate through multiple treatments across repeated
  // deliberations; the spawn + mediator-swap logic below then operates on the
  // round's values. No-op (existing behavior) when treatmentIndex is unset.
  if (
    currentStage?.kind === StageKind.TRANSFER &&
    typeof (currentStage as TransferStageConfig).treatmentIndex === 'number' &&
    participant.variableMap
  ) {
    applyHoistedTreatment(
      participant as unknown as Record<string, unknown>,
      participant.variableMap,
      (currentStage as TransferStageConfig).treatmentIndex as number,
    );
  }

  // Persona bank match key for this round, applied below to the spawned
  // other-agents and inactive personas (not the representative, which
  // draws on its principal's own persona content). Undefined when the transfer names
  // no treatment index (those agents then fall back to standard generation).
  let personaHash: string | undefined;
  if (
    currentStage?.kind === StageKind.TRANSFER &&
    typeof (currentStage as TransferStageConfig).treatmentIndex === 'number' &&
    participant.variableMap
  ) {
    const roundVariables = computeRoundVariableMap(
      participant.variableMap,
      (currentStage as TransferStageConfig).treatmentIndex as number,
    );
    personaHash = personaMatchHash(roundVariables);
  }

  const otherAgentGeneration = participant.otherAgentGeneration;
  const numOtherAgents = otherAgentGeneration?.numOtherAgents ?? 0;
  const numInactivePersonas = otherAgentGeneration?.numInactivePersonas ?? 0;

  const hasSpawningRequirement =
    (participant.isObserver && participant.hasRepresentative) ||
    numOtherAgents > 0 ||
    numInactivePersonas > 0;

  if (hasSpawningRequirement) {
    const experiment = await getFirestoreExperiment(experimentId);
    if (!experiment) return response;

    const stages = (
      await app
        .firestore()
        .collection(`experiments/${experimentId}/stages`)
        .get()
    ).docs.map((doc) => doc.data());

    const profileStage = stages.find(
      (stage) => (stage as StageConfig).kind === StageKind.PROFILE,
    ) as ProfileStageConfig | undefined;
    const profileType =
      profileStage?.profileType || ProfileType.ANONYMOUS_ANIMAL;
    // Spawned agents avoid the human's color, and the reserved mediator color
    // in observer-capable experiments (key presence mirrors the frontend check).
    const spawnedProfileExcludeColors = [
      (participant.publicId ?? '').split('-')[1] ?? '',
      ...(Object.values(participant.variableMap ?? {}).some((value) =>
        value.includes('_isObserver'),
      )
        ? [MEDIATOR_OBSERVER_COLOR]
        : []),
    ].filter((c) => c);

    const isAnonymousCohort = !!profileStage;

    const now = Timestamp.now();

    // Fetch total experiment-wide participants count for setProfile indexing
    const numParticipants = (
      await app
        .firestore()
        .collection(`experiments/${experimentId}/participants`)
        .count()
        .get()
    ).data().count;

    // When an observer is present in the target cohort, all AI participants
    // get a "'s Agent" suffix, like the observer's own representative below;
    // the frontend marks that one "(yours)" for its observer only. Count an
    // observer being transferred in now,
    // plus any non-agent observer already in the cohort.
    const cohortHasObserver =
      participant.isObserver ||
      (
        await app
          .firestore()
          .collection(`experiments/${experimentId}/participants`)
          .where('currentCohortId', '==', targetCohortId)
          .get()
      ).docs.some((doc) => {
        const p = doc.data() as ParticipantProfileExtended;
        return (
          !p.agentConfig &&
          p.isObserver &&
          p.currentStatus !== ParticipantStatus.DELETED
        );
      });

    const nextStageId = response.currentStageId || participant.currentStageId;

    const getParticipantRef = (id: string) =>
      app.firestore().doc(`experiments/${experimentId}/participants/${id}`);

    // Spawn the observer's representative agent (strictly for observer cohorts)
    if (participant.isObserver && participant.hasRepresentative) {
      const repAgentId = generateId();
      const repAgentTimestamps = createProgressTimestamps();
      repAgentTimestamps.startExperiment = now;
      repAgentTimestamps.acceptedTOS = now;
      repAgentTimestamps.readyStages[stageIds[0]] = now;
      repAgentTimestamps.readyStages[nextStageId] = now; // Mark nextStageId as ready so it doesn't block the stage unlock

      const observerName = String(participant.name || participant.publicId);
      const repProfile = getRepresentativeProfile(
        observerName,
        participant.avatar ?? '🤖',
      );
      const repAgentProfile = createParticipantProfileExtended({
        currentCohortId: targetCohortId,
        name: repProfile.name,
        avatar: repProfile.avatar,
        agentConfig: {
          agentId: repAgentId,
          promptContext: `You are ${observerName}'s representative in this discussion. Speak and advocate on ${observerName}'s behalf, representing their perspective from their earlier responses rather than expressing your own independent opinions. Ensure you properly separate every paragraph with one empty line in between.`,
          modelSettings:
            experiment.spawnedAgentModelSettings ??
            DEFAULT_AGENT_MODEL_SETTINGS,
          // Claim a persona from the representative bank at creation (the
          // trigger is a no-op when the experiment stores no bank).
          repPersonaBank: true,
        },
        timestamps: repAgentTimestamps,
        publicId: `${participant.publicId}-agent`,
        privateId: repAgentId,
        currentStageId: nextStageId,
        connected: true,
        currentStatus: ParticipantStatus.IN_PROGRESS,
        isObserver: false,
      });

      // The representative deliberates on the observer's behalf, so it shares
      // the observer's content variables (e.g. topic) but not the treatment.
      repAgentProfile.variableMap = inheritSpawnedAgentVariables(
        participant.variableMap,
      );
      transaction.set(getParticipantRef(repAgentId), repAgentProfile);
    }

    // Spawn the other virtual AI agents directly inside targetCohortId
    const agentParticipantsQuery = await app
      .firestore()
      .collection('experiments')
      .doc(experimentId)
      .collection('agentParticipants')
      .get();

    const personas = agentParticipantsQuery.docs.map(
      (doc) => doc.data() as AgentPersonaConfig,
    );

    for (let i = 0; i < numOtherAgents; i++) {
      const agentId = generateId();
      const agentTimestamps = createProgressTimestamps();
      agentTimestamps.startExperiment = now;
      agentTimestamps.acceptedTOS = now;
      agentTimestamps.readyStages[stageIds[0]] = now;
      agentTimestamps.readyStages[nextStageId] = now;

      const persona = personas[i % personas.length];

      const agentProfile = createParticipantProfileExtended({
        currentCohortId: targetCohortId,
        agentConfig: {
          agentId: persona?.id ?? '',
          // Spawned agents always get a generated persona; start from an empty
          // context so the generated text (appended by onParticipantCreation)
          // becomes the agent's persona.
          promptContext: '',
          modelSettings:
            persona?.defaultModelSettings ??
            experiment.spawnedAgentModelSettings ??
            DEFAULT_AGENT_MODEL_SETTINGS,
          needsPersonaGeneration: true,
          personaSlotKey: `other-${i}`,
        },
        timestamps: agentTimestamps,
        privateId: agentId,
        currentStageId: nextStageId,
        connected: false,
        currentStatus: ParticipantStatus.IN_PROGRESS,
        isObserver: false,
      });

      // Draw standard anonymous profile using a unique index offset and the
      // cohort anonymity setting.
      setProfile(
        numParticipants + i + 10,
        agentProfile,
        isAnonymousCohort,
        profileType,
        spawnedProfileExcludeColors,
      );

      // When an observer is present, suffix every AI participant with
      // "'s Agent" so the observer can distinguish them from humans (their
      // own representative is marked "(yours)" at display time). Without
      // an observer, agents keep their drawn profile name.
      if (cohortHasObserver) {
        const drawnName = agentProfile.name;
        agentProfile.name = drawnName
          ? `${drawnName}'s Agent`
          : `Agent ${agentProfile.publicId.substring(0, 8)}`;
        for (const profileSetId of Object.keys(
          agentProfile.anonymousProfiles,
        )) {
          if (agentProfile.anonymousProfiles[profileSetId].name) {
            agentProfile.anonymousProfiles[profileSetId].name += "'s Agent";
          }
        }
        // A "'s Agent" participant is a representative: it advocates for the
        // person it stands in for rather than voicing its own independent
        // opinions, like the observer's representative.
        if (agentProfile.agentConfig) {
          const representedName = drawnName || agentProfile.name;
          // onParticipantCreation appends the stored bank persona to this
          // framing.
          agentProfile.agentConfig.promptContext = `You are ${representedName}'s representative in this discussion. You are a separate agent, not ${representedName} yourself. Speak and advocate on ${representedName}'s behalf, representing their perspective from their materials below, rather than expressing your own independent opinions or adopting their persona as your own identity. The materials below may use a different name for ${representedName}; that is the same person, and you should call them ${representedName} here. Ensure you properly separate every paragraph with one empty line in between.\n\n${representedName}'s materials:`;
          // Bank persona, not a slot-based one.
          delete agentProfile.agentConfig.personaSlotKey;
          if (personaHash) {
            agentProfile.agentConfig.personaHash = personaHash;
          }
        }
      } else if (!agentProfile.name) {
        agentProfile.name = `Agent ${agentProfile.publicId.substring(0, 8)}`;
      }

      // Direct-participation (no-observer) agents draw a PLAIN persona (a
      // character sketch) from the bank instead of generating one live at
      // spawn, so group-chat setup is fast. The round's persona-bank match key
      // is set too, so when the bank has personas for this round's variables
      // (persona plus a position on the round's topic), those are claimed
      // first; the plain sketch keyed to the HUMAN (so a participant never
      // gets the same persona twice across their rounds) is the fallback, and
      // live generation the last resort.
      if (!cohortHasObserver && agentProfile.agentConfig) {
        if (personaHash) {
          agentProfile.agentConfig.personaHash = personaHash;
        }
        agentProfile.agentConfig.personaSketchForHumanId =
          participant.privateId;
        delete agentProfile.agentConfig.personaSlotKey;
      }

      // Share the transferring participant's content variables (e.g. the
      // deliberation topic) so the round is coherent, minus the treatment.
      agentProfile.variableMap = inheritSpawnedAgentVariables(
        participant.variableMap,
      );
      transaction.set(getParticipantRef(agentId), agentProfile);
    }

    // Spawn inactive personas. These generate a persona just like
    // the agents above, but are flagged so they never chat, never take a turn,
    // and are not counted for stage unlock. They exist solely so a mediator can
    // reason over real generated personas via OTHER_PROFILE_CONTEXTS.
    for (let i = 0; i < numInactivePersonas; i++) {
      const agentId = generateId();
      const agentTimestamps = createProgressTimestamps();
      agentTimestamps.startExperiment = now;
      agentTimestamps.acceptedTOS = now;
      agentTimestamps.readyStages[stageIds[0]] = now;
      agentTimestamps.readyStages[nextStageId] = now;

      const persona = personas[i % personas.length];

      const agentProfile = createParticipantProfileExtended({
        currentCohortId: targetCohortId,
        agentConfig: {
          agentId: persona?.id ?? '',
          promptContext: '',
          modelSettings:
            persona?.defaultModelSettings ??
            experiment.spawnedAgentModelSettings ??
            DEFAULT_AGENT_MODEL_SETTINGS,
          needsPersonaGeneration: true,
          isInactivePersona: true,
        },
        timestamps: agentTimestamps,
        privateId: agentId,
        currentStageId: nextStageId,
        connected: false,
        currentStatus: ParticipantStatus.IN_PROGRESS,
        isObserver: false,
      });

      setProfile(
        numParticipants + numOtherAgents + i + 10,
        agentProfile,
        isAnonymousCohort,
        profileType,
        spawnedProfileExcludeColors,
      );

      if (!agentProfile.name) {
        agentProfile.name = `Agent ${agentProfile.publicId.substring(0, 8)}`;
      }

      // Inactive personas draw a persona from the bank.
      if (personaHash && agentProfile.agentConfig) {
        agentProfile.agentConfig.personaHash = personaHash;
      }

      agentProfile.variableMap = inheritSpawnedAgentVariables(
        participant.variableMap,
      );
      transaction.set(getParticipantRef(agentId), agentProfile);
    }
  }

  // Dynamically swap the mediator in the cohort if specified
  if (participant.swapMediator && participant.swapMediator.trim() !== '') {
    const targetMediatorIdentifier = participant.swapMediator;

    const agentMediators = await app
      .firestore()
      .collection('experiments')
      .doc(experimentId)
      .collection('agentMediators')
      .get();

    const matchingDoc = agentMediators.docs.find((doc) => {
      const persona = doc.data() as AgentPersonaConfig;
      return (
        persona.id === targetMediatorIdentifier ||
        persona.name === targetMediatorIdentifier ||
        persona.defaultProfile?.name === targetMediatorIdentifier
      );
    });

    if (matchingDoc) {
      const matchingPersona = matchingDoc.data() as AgentPersonaConfig;
      const existingMediatorsQuery = await app
        .firestore()
        .collection('experiments')
        .doc(experimentId)
        .collection('mediators')
        .where('currentCohortId', '==', targetCohortId)
        .get();

      // Build the swapped mediator so we know which stages it covers (its
      // configured prompt stages).
      const newMediator = await createMediatorProfileForPersona(
        experimentId,
        targetCohortId,
        matchingPersona,
      );
      newMediator.privateId = `mediator-${targetCohortId}-${matchingPersona.id}`;
      newMediator.publicId = matchingPersona.id.substring(0, 8);
      const swappedStageIds = Object.entries(newMediator.activeStageMap ?? {})
        .filter(([, active]) => active)
        .map(([stageId]) => stageId);

      // The swap should only take over the group chat(s) the swapped persona
      // covers; private-chat stages must keep using the default
      // mediator. So rather than deleting the cohort's existing mediators,
      // deactivate them only for the stages the swapped mediator covers and
      // leave them active elsewhere (e.g. private chats).
      let swappedAlreadyPresent = false;
      for (const doc of existingMediatorsQuery.docs) {
        const existing = doc.data() as MediatorProfileExtended;
        if (existing.agentConfig?.agentId === matchingPersona.id) {
          swappedAlreadyPresent = true;
          continue; // already installed; leave it as-is
        }
        const activeStageMap = {...(existing.activeStageMap ?? {})};
        let changed = false;
        for (const stageId of swappedStageIds) {
          if (activeStageMap[stageId]) {
            activeStageMap[stageId] = false;
            changed = true;
          }
        }
        if (changed) {
          transaction.set(doc.ref, {...existing, activeStageMap});
        }
      }

      if (!swappedAlreadyPresent) {
        const newMediatorDoc = app
          .firestore()
          .collection('experiments')
          .doc(experimentId)
          .collection('mediators')
          .doc(newMediator.privateId);

        transaction.set(newMediatorDoc, newMediator);
      }
    }
  }

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
  experimentId: string,
  participant: ParticipantProfileExtended,
  targetCohortId: string,
): Promise<void> {
  const firestore = app.firestore();
  const publicId = participant.publicId;

  // Get participant's stage data
  const stageData = await firestore
    .collection(
      `experiments/${experimentId}/participants/${participant.privateId}/stageData`,
    )
    .get();

  const stageAnswers = stageData.docs.map((stage) => stage.data());

  // Filter to stages that require public data migration (see TRANSFER_MIGRATION_HANDLERS).
  const migratableStages = stageAnswers
    .filter(
      (stage) =>
        STAGE_KIND_REQUIRES_TRANSFER_MIGRATION[stage.kind as StageKind],
    )
    .map((stage) => ({
      stage,
      publicDocRef: getFirestoreStagePublicDataRef(
        experimentId,
        targetCohortId,
        stage.id,
      ),
    }));

  // Phase 1: Perform ALL reads before any writes.
  // Firestore transactions require all reads to be executed before all writes.
  const migrationEntries = await Promise.all(
    migratableStages.map(async (entry) => ({
      ...entry,
      publicData: (await transaction.get(entry.publicDocRef)).data(),
    })),
  );

  // Phase 2: Apply mutations and write all changes.
  for (const {stage, publicDocRef, publicData} of migrationEntries) {
    if (!publicData) continue;

    const handler = TRANSFER_MIGRATION_HANDLERS[stage.kind as StageKind];
    if (!handler) continue;
    handler(
      publicData as StagePublicData,
      stage as StageParticipantAnswer,
      publicId,
    );
    transaction.set(publicDocRef, publicData);
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

  if (participant.variableMap) {
    for (const [varName, varValue] of Object.entries(participant.variableMap)) {
      try {
        const parsed = JSON.parse(varValue);
        if (typeof parsed === 'object' && parsed !== null) {
          for (const [key, val] of Object.entries(parsed)) {
            const targetKey = getConditionTargetKey({
              stageId: SYSTEM_VARIABLE_NAMESPACE,
              questionId: `${varName}.${key}`,
            });
            targetValues[targetKey] = val;
          }
        }
      } catch (e) {
        const targetKey = getConditionTargetKey({
          stageId: SYSTEM_VARIABLE_NAMESPACE,
          questionId: varName,
        });
        targetValues[targetKey] = varValue;
      }
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
