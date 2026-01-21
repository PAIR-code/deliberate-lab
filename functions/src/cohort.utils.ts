import {
  CohortConfig,
  Experiment,
  MediatorProfileExtended,
  ParticipantStatus,
  StageConfig,
  createPublicDataFromStageConfigs,
  VariableScope,
} from '@deliberation-lab/utils';
import {generateVariablesForScope} from './variables.utils';
import {createMediatorsForCohort} from './mediator.utils';
import {app} from './app';

/**
 * Mark all participants in a cohort as deleted.
 * Queries by both currentCohortId and transferCohortId to catch all related participants.
 */
export async function markCohortParticipantsAsDeleted(
  experimentId: string,
  cohortId: string,
): Promise<{updatedCount: number}> {
  const firestore = app.firestore();
  const participantsCollection = firestore
    .collection('experiments')
    .doc(experimentId)
    .collection('participants');

  // Query participants by currentCohortId and transferCohortId separately
  // (Firestore doesn't support OR across different fields)
  const [currentCohortDocs, transferCohortDocs] = await Promise.all([
    participantsCollection.where('currentCohortId', '==', cohortId).get(),
    participantsCollection.where('transferCohortId', '==', cohortId).get(),
  ]);

  // Combine results, avoiding duplicates using Map
  const participantMap = new Map<string, FirebaseFirestore.DocumentSnapshot>();
  for (const doc of currentCohortDocs.docs) {
    participantMap.set(doc.id, doc);
  }
  for (const doc of transferCohortDocs.docs) {
    participantMap.set(doc.id, doc);
  }

  // Batch updates for efficiency
  const batch = firestore.batch();
  for (const doc of participantMap.values()) {
    const participant = doc.data();
    batch.set(doc.ref, {
      ...participant,
      currentStatus: ParticipantStatus.DELETED,
    });
  }
  await batch.commit();

  return {updatedCount: participantMap.size};
}

/**
 * Creates a cohort with the given configuration.
 * This function initializes public stage data, unlocks relevant stages,
 * and adds mediators to the cohort.
 */
export async function createCohortInternal(
  transaction: FirebaseFirestore.Transaction,
  experimentId: string,
  cohortConfig: CohortConfig,
): Promise<void> {
  const firestore = app.firestore();

  // Define document reference
  const document = firestore
    .collection('experiments')
    .doc(experimentId)
    .collection('cohorts')
    .doc(cohortConfig.id);

  // For relevant stages, initialize public stage data documents
  const stageDocs = await firestore
    .collection(`experiments/${experimentId}/stages`)
    .get();
  const stages = stageDocs.docs.map((stageDoc) =>
    stageDoc.data(),
  ) as StageConfig[];

  // Fetch experiment in order to get variable configs
  const experiment = (
    await transaction.get(firestore.collection('experiments').doc(experimentId))
  ).data() as Experiment;

  const publicData = createPublicDataFromStageConfigs(stages);

  for (const dataItem of publicData) {
    const dataDoc = firestore
      .collection('experiments')
      .doc(experimentId)
      .collection('cohorts')
      .doc(cohortConfig.id)
      .collection('publicStageData')
      .doc(dataItem.id);
    transaction.set(dataDoc, dataItem);
  }

  // Set relevant stages (e.g., with no min participants and no wait for all
  // participants) as unlocked
  for (const stage of stages) {
    if (
      stage.progress.minParticipants === 0 &&
      !stage.progress.waitForAllParticipants
    ) {
      cohortConfig.stageUnlockMap[stage.id] = true;
    }
  }

  // Add variable values at the cohort level
  cohortConfig.variableMap = await generateVariablesForScope(
    experiment.variableConfigs ?? [],
    {scope: VariableScope.COHORT, experimentId, cohortId: cohortConfig.id},
  );

  // Write cohort config
  transaction.set(document, cohortConfig);

  // Add relevant mediators to cohort
  const mediators: MediatorProfileExtended[] = await createMediatorsForCohort(
    experimentId,
    cohortConfig.id,
  );
  for (const mediator of mediators) {
    const mediatorDoc = firestore
      .collection('experiments')
      .doc(experimentId)
      .collection('mediators')
      .doc(mediator.privateId);
    transaction.set(mediatorDoc, mediator);
  }
}
