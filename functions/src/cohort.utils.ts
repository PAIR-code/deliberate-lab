import {
  CohortConfig,
  Experiment,
  MediatorProfileExtended,
  StageConfig,
  createPublicDataFromStageConfigs,
  VariableScope,
} from '@deliberation-lab/utils';
import {generateVariablesForScope} from './variables.utils';
import {createMediatorsForCohort} from './mediator.utils';
import {app} from './app';

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
