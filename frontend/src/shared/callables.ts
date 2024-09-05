import {
  CreateChatMessageData,
  CohortCreationData,
  CreateParticipantData,
  CreationResponse,
  ExperimentCreationData,
  ExperimentDeletionData,
  ParticipantProfileExtendedData,
  SimpleResponse,
  UpdateSurveyStageParticipantAnswerData
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

/** Generic endpoint to create participants */
export const createParticipantCallable = async(functions: Functions, config: CreateParticipantData) => {
  const { data } = await httpsCallable<CreateParticipantData, CreationResponse>(functions, 'createParticipant')(config);
  return data;
}

/** Generic endpoint to update participant profiles */
export const updateParticipantCallable = async(functions: Functions, config: ParticipantProfileExtendedData) => {
  const { data } = await httpsCallable<ParticipantProfileExtendedData, CreationResponse>(functions, 'updateParticipant')(config);
  return data;
}

/** Generic endpoint to update survey stage participant answers */
export const updateSurveyStageParticipantAnswerCallable = async(
  functions: Functions, config: UpdateSurveyStageParticipantAnswerData
) => {
  const { data } = await httpsCallable<UpdateSurveyStageParticipantAnswerData, CreationResponse>(functions, 'updateSurveyStageParticipantAnswer')(config);
  return data;
}

/** Generic endpoint to write chat message. */
export const createChatMessageCallable = async(functions: Functions, config: CreateChatMessageData) => {
  const { data } = await httpsCallable<CreateChatMessageData, CreationResponse>(functions, 'createChatMessage')(config);
  return data;
}