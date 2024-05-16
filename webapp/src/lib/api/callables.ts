/** Firebase cloud function callables */

import {
  CreationResponse,
  ExperimentCreationData,
  MessageData,
  SimpleResponse,
  StageAnswerData,
} from '@llm-mediation-experiments/utils';
import { HttpsCallableResult, httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

/** Wrapper to extract the data attribute from all callable cloud functions */
const data =
  <TArgs, TReturn>(f: (args?: TArgs) => Promise<HttpsCallableResult<TReturn>>) =>
  (args?: TArgs) =>
    f(args).then((r) => r.data);

/** Generic endpoint to create messages */
export const createMessageCallable = data(
  httpsCallable<MessageData, SimpleResponse<string>>(functions, 'message'),
);

/** Generic endpoint to create experiments or experiment templates */
export const createExperimentCallable = data(
  httpsCallable<ExperimentCreationData, CreationResponse>(functions, 'createExperiment'),
);

/** Generic endpoint to update any participant stage */
export const updateStageCallable = data(
  httpsCallable<StageAnswerData, SimpleResponse<string>>(functions, 'updateStage'),
);
