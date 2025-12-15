import {
  CohortConfig,
  CohortDefinition,
  CohortParticipantConfig,
  Experiment,
  MediatorProfileExtended,
  ParticipantStatus,
  StageConfig,
  VariableConfig,
  VariableConfigType,
  createCohortConfig,
  createMetadataConfig,
  createPublicDataFromStageConfigs,
  generateId,
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
 *
 * Note: The experiment must already exist in Firestore before calling this function.
 *
 * @param transaction - Firestore transaction
 * @param experimentId - The experiment ID
 * @param cohortConfig - The cohort configuration
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

  // Transform cohortValues keys if this cohort has an alias
  let variableConfigs = experiment.variableConfigs ?? [];
  if (cohortConfig.alias) {
    variableConfigs = transformCohortValuesKeys(
      variableConfigs,
      cohortConfig.alias,
      cohortConfig.id,
    );
  }

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
  cohortConfig.variableMap = await generateVariablesForScope(variableConfigs, {
    scope: VariableScope.COHORT,
    experimentId,
    cohortId: cohortConfig.id,
  });

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

/**
 * Transform cohortValues keys from alias to cohortId.
 *
 * This function creates a copy of the variable configs where STATIC variables
 * with cohortValues have their keys transformed from alias to cohortId.
 * This allows generateStaticVariables to look up values by cohortId.
 *
 * @param variableConfigs - Original variable configs with alias keys
 * @param alias - The cohort alias to match
 * @param cohortId - The cohort ID to use as the new key
 * @returns New array of variable configs with transformed cohortValues
 */
export function transformCohortValuesKeys(
  variableConfigs: VariableConfig[],
  alias: string,
  cohortId: string,
): VariableConfig[] {
  return variableConfigs.map((config) => {
    if (
      config.type === VariableConfigType.STATIC &&
      config.cohortValues?.[alias]
    ) {
      return {
        ...config,
        cohortValues: {[cohortId]: config.cohortValues[alias]},
      };
    }
    return config;
  });
}

/**
 * Find a cohort by its alias.
 *
 * @param experimentId - The experiment ID
 * @param alias - The cohort alias to find
 * @returns The cohort config if found, null otherwise
 */
export async function findCohortByAlias(
  experimentId: string,
  alias: string,
): Promise<CohortConfig | null> {
  const firestore = app.firestore();
  const snapshot = await firestore
    .collection(`experiments/${experimentId}/cohorts`)
    .where('alias', '==', alias)
    .limit(1)
    .get();

  return snapshot.empty ? null : (snapshot.docs[0].data() as CohortConfig);
}

/**
 * Create a cohort from a cohort definition.
 *
 * This function creates a new cohort config with a generated UUID and the
 * definition's alias, then calls createCohortInternal which handles variable
 * transformation based on the alias.
 *
 * Note: The experiment must already exist in Firestore before calling this function.
 *
 * @param transaction - Firestore transaction
 * @param experimentId - The experiment ID
 * @param definition - The cohort definition to create from
 * @param defaultCohortConfig - Default participant config for the cohort
 * @returns The created cohort config
 */
export async function createCohortFromDefinition(
  transaction: FirebaseFirestore.Transaction,
  experimentId: string,
  definition: CohortDefinition,
  defaultCohortConfig: CohortParticipantConfig,
): Promise<CohortConfig> {
  // Create cohort config with generated UUID and alias
  const cohortConfig = createCohortConfig({
    id: generateId(true), // Alphanumeric for sorting
    alias: definition.alias,
    metadata: createMetadataConfig({name: definition.name}),
    participantConfig: defaultCohortConfig,
  });

  // Create the cohort - createCohortInternal handles variable transformation
  await createCohortInternal(transaction, experimentId, cohortConfig);

  return cohortConfig;
}
