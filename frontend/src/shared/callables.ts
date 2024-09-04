import {
  CohortCreationData,
  CreationResponse,
  ExperimentCreationData,
  ExperimentDeletionData,
  SimpleResponse
} from '@deliberation-lab/utils';

import { Functions, httpsCallable } from 'firebase/functions';

/** Firebase cloud function callables */

/** Generic endpoint to write experiments or experiment templates */
export const writeExperimentCallable = async (functions: Functions, experiment: ExperimentCreationData) => {
  const { data } = await httpsCallable<ExperimentCreationData, CreationResponse>(functions, 'writeExperiment')(experiment);
  return data;
}

/** Generic endpoint to delete experiments or experiment templates */
export const deleteExperimentCallable = async (functions: Functions, deletion: ExperimentDeletionData) => {
  const { data } = await httpsCallable<ExperimentDeletionData, never>(functions, 'deleteExperiment')(deletion);
  return data;
}

/** Generic endpoint to write cohorts */
export const writeCohortCallable = async (functions: Functions, cohort: CohortCreationData) => {
  const { data } = await httpsCallable<CohortCreationData, CreationResponse>(functions, 'writeCohort')(cohort);
  return data;
}
