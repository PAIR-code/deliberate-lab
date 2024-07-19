
/** Firebase cloud function callables */

import {
  CreationResponse,
  ExperimentCreationData,
  ExperimentDeletionData,
  ParticipantCreationData,
  MessageData,
  SimpleResponse,
  StageAnswerData,
} from '@llm-mediation-experiments/utils';
import { Functions, httpsCallable } from 'firebase/functions';

/** Generic endpoint to create messages */
export const createMessageCallable = async (functions: Functions, message: MessageData) => {
  const { data } = await httpsCallable<MessageData, SimpleResponse<string>>(functions, 'message')(message);
  return data;
}


/** Generic endpoint to create experiments or experiment templates */
export const createExperimentCallable = async (functions: Functions, experiment: ExperimentCreationData) => {
  const { data } = await httpsCallable<ExperimentCreationData, CreationResponse>(functions, 'createExperiment')(experiment);
  return data;
}

/** Generic endpoint to create a participant. */
export const createParticipantCallable = async (functions: Functions, participant: ParticipantCreationData) => {
  const { data } = await httpsCallable<ParticipantCreationData, never>(functions, 'createParticipant')(participant);
  return data;
}

/** Generic endpoint to update any participant stage */
export const updateStageCallable = async (functions: Functions, stage: StageAnswerData) => {
  const { data } = await httpsCallable<StageAnswerData, SimpleResponse<string>>(functions, 'updateStage')(stage);
  return data;
}

/** Generic endpoint to delete experiments or experiment templates */
export const deleteExperimentCallable = async (functions: Functions, deletion: ExperimentDeletionData) => {
  const { data } = await httpsCallable<ExperimentDeletionData, never>(functions, 'deleteExperiment')(deletion);
  return data;
}
