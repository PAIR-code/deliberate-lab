/** Firebase cloud function callables */

import {
  CreationResponse,
  DiscussItemsMessageMutationData,
  Experiment,
  ExperimentCreationData,
  ExperimentTemplate,
  GenericStageUpdate,
  MediatorMessageMutationData,
  ParticipantProfile,
  SimpleResponse,
  TemplateCreationData,
  UserMessageMutationData,
} from '@llm-mediation-experiments/utils';
import { HttpsCallableResult, httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

/** Wrapper to extract the data attribute from all callable cloud functions */
const data =
  <TArgs, TReturn>(f: (args?: TArgs) => Promise<HttpsCallableResult<TReturn>>) =>
  (args?: TArgs) =>
    f(args).then((r) => r.data);

export const experimentsCallable = data(
  httpsCallable<never, SimpleResponse<Experiment[]>>(functions, 'experiments'),
);

export const experimentCallable = data(
  httpsCallable<{ experimentUid: string }, Experiment>(functions, 'experiment'),
);

export const deleteExperimentCallable = data(
  httpsCallable<{ experimentId: string }, SimpleResponse<string>>(functions, 'deleteExperiment'),
);

export const createExperimentCallable = data(
  httpsCallable<ExperimentCreationData, CreationResponse>(functions, 'createExperiment'),
);

export const userMessageCallable = data(
  httpsCallable<UserMessageMutationData, CreationResponse>(functions, 'userMessage'),
);

export const discussItemsMessageCallable = data(
  httpsCallable<DiscussItemsMessageMutationData, CreationResponse>(
    functions,
    'discussItemsMessage',
  ),
);

export const mediatorMessageCallable = data(
  httpsCallable<MediatorMessageMutationData, CreationResponse>(functions, 'mediatorMessage'),
);

export const participantCallable = data(
  httpsCallable<{ participantUid: string }, ParticipantProfile>(functions, 'participant'),
);

export const updateStageCallable = data(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  httpsCallable<GenericStageUpdate<any>, CreationResponse>(functions, 'updateStage'),
);

export const templatesCallable = data(
  httpsCallable<never, SimpleResponse<ExperimentTemplate[]>>(functions, 'templates'),
);

export const createTemplateCallable = data(
  httpsCallable<TemplateCreationData, CreationResponse>(functions, 'createTemplate'),
);

// TODO : create callables for the 3 new cloud functions, and remove the declarations for the old ones
