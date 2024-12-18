import {
  CreateChatMessageData,
  CohortCreationData,
  CohortDeletionData,
  CreateParticipantData,
  CreationResponse,
  ExperimentCreationData,
  ExperimentDeletionData,
  ExperimentDownloadResponse,
  ParticipantProfileExtendedData,
  SendChipOfferData,
  SendChipResponseData,
  SetChipTurnData,
  SimpleResponse,
  SuccessResponse,
  UpdateChatMediatorsData,
  UpdateChatStageParticipantAnswerData,
  UpdateRankingStageParticipantAnswerData,
  UpdateSurveyPerParticipantStageParticipantAnswerData,
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
  const { data } = await httpsCallable<ExperimentDeletionData, SuccessResponse>(functions, 'deleteExperiment')(deletion);
  return data;
}

/** Generic endpoint to create new cohorts */
export const createCohortCallable = async (functions: Functions, cohort: CohortCreationData) => {
  const { data } = await httpsCallable<CohortCreationData, CreationResponse>(functions, 'createCohort')(cohort);
  return data;
}

/** Generic endpoint to update existing cohorts */
export const updateCohortCallable = async (functions: Functions, cohort: CohortCreationData) => {
  const { data } = await httpsCallable<CohortCreationData, CreationResponse>(functions, 'updateCohort')(cohort);
  return data;
}

/** Generic endpoint to delete cohorts */
export const deleteCohortCallable = async (functions: Functions, cohort: CohortDeletionData) => {
  const { data } = await httpsCallable<CohortDeletionData, SuccessResponse>(functions, 'deleteCohort')(cohort);
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

/** Generic endpoint to update chat stage participant answers */
export const updateChatStageParticipantAnswerCallable = async(
  functions: Functions, config: UpdateChatStageParticipantAnswerData
) => {
  const { data } = await httpsCallable<UpdateChatStageParticipantAnswerData, CreationResponse>(functions, 'updateChatStageParticipantAnswer')(config);
  return data;
}

/** Generic endpoint to update chat stage mediators */
export const updateChatMediatorsCallable = async(
  functions: Functions, config: UpdateChatMediatorsData
) => {
  const { data } = await httpsCallable<UpdateChatMediatorsData, SuccessResponse>(functions, 'updateChatMediators')(config);
  return data;
}

/** Generic endpoint to update survey stage participant answers */
export const updateSurveyStageParticipantAnswerCallable = async(
  functions: Functions, config: UpdateSurveyStageParticipantAnswerData
) => {
  const { data } = await httpsCallable<UpdateSurveyStageParticipantAnswerData, CreationResponse>(functions, 'updateSurveyStageParticipantAnswer')(config);
  return data;
}

/** Generic endpoint to update survey-per-participant stage participant answers */
export const updateSurveyPerParticipantStageParticipantAnswerCallable = async(
  functions: Functions, config: UpdateSurveyPerParticipantStageParticipantAnswerData
) => {
  const { data } = await httpsCallable<UpdateSurveyPerParticipantStageParticipantAnswerData, CreationResponse>(functions, 'updateSurveyPerParticipantStageParticipantAnswer')(config);
  return data;
}

/** Generic endpoint to update ranking stage participant answers */
export const updateRankingStageParticipantAnswerCallable = async(
  functions: Functions, config: UpdateRankingStageParticipantAnswerData
) => {
  const { data } = await httpsCallable<UpdateRankingStageParticipantAnswerData, CreationResponse>(functions, 'updateRankingStageParticipantAnswer')(config);
  return data;
}

/** Generic endpoint to write chat message. */
export const createChatMessageCallable = async(functions: Functions, config: CreateChatMessageData) => {
  const { data } = await httpsCallable<CreateChatMessageData, CreationResponse>(functions, 'createChatMessage')(config);
  return data;
}

/** Generic endpoint for sending chip negotiation offer. */
export const sendChipOfferCallable = async(
  functions: Functions, config: SendChipOfferData
) => {
  const { data } = await httpsCallable<SendChipOfferData, SuccessResponse>(functions, 'sendChipOffer')(config);
  return data;
}

/** Generic endpoint for sending chip negotiation response. */
export const sendChipResponseCallable = async(
  functions: Functions, config: SendChipResponseData
) => {
  const { data } = await httpsCallable<SendChipResponseData, SuccessResponse>(functions, 'sendChipResponse')(config);
  return data;
}

/** Generic endpoint for setting chip turn. */
export const setChipTurnCallable = async(
  functions: Functions, config: SetChipTurnData
) => {
  const { data } = await httpsCallable<SetChipTurnData, SuccessResponse>(functions, 'setChipTurn')(config);
  return data;
}