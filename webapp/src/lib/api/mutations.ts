/** Tanstack angular mutations.
 */

import { HttpClient } from '@angular/common/http';
import { QueryClient, injectMutation } from '@tanstack/angular-query-experimental';
import { UserCredential, signInWithEmailAndPassword } from 'firebase/auth';
import {
    ChatStageUpdate,
    CreationResponse,
    OnError,
    OnSuccess,
    ProfileTOSData,
    SurveyStageUpdate,
} from '../types/api.types';
import {
    createExperimentCallable,
    createTemplateCallable,
    deleteExperimentCallable,
    discussItemsMessageCallable,
    mediatorMessageCallable,
    toggleReadyToEndChatCallable,
    updateProfileAndTOSCallable,
    updateStageCallable,
    userMessageCallable,
} from './callables';
import { auth } from './firebase';

export const deleteExperimentMutation = (http: HttpClient, client: QueryClient) =>
  injectMutation(() => ({
    mutationFn: (experimentId: string) => deleteExperimentCallable({ experimentId }),
    onSuccess: () => {
      client.refetchQueries({ queryKey: ['experiments'] });
    },
  }));

export const createExperimentMutation = (
  client: QueryClient,
  onSuccess?: OnSuccess<CreationResponse>,
) => {
  return injectMutation(() => ({
    mutationFn: createExperimentCallable,
    onSuccess: (data) => {
      client.refetchQueries({ queryKey: ['experiments'] });
      onSuccess?.(data);
    },
  }));
};

export const createTemplateMutation = (
  client: QueryClient,
  onSuccess?: OnSuccess<CreationResponse>,
) => {
  return injectMutation(() => ({
    mutationFn: createTemplateCallable,
    onSuccess: (data) => {
      client.refetchQueries({ queryKey: ['templates'] });
      onSuccess?.(data);
    },
  }));
};

export const updateProfileAndTOSMutation = (
  client: QueryClient,
  onSuccess?: OnSuccess<ProfileTOSData>,
) => {
  return injectMutation(() => ({
    mutationFn: updateProfileAndTOSCallable,
    onSuccess: (data) => {
      client.refetchQueries({ queryKey: ['participant', data.uid] });
      onSuccess?.(data);
    },
  }));
};

export const updateSurveyStageMutation = (
  client: QueryClient,
  onSuccess?: OnSuccess<{ uid: string }>,
) => {
  return injectMutation(() => ({
    mutationFn: (data: SurveyStageUpdate) => updateStageCallable(data),
    onSuccess: (data) => {
      client.refetchQueries({ queryKey: ['participant', data.uid] });
      onSuccess?.(data);
    },
  }));
};

export const updateChatStageMutation = (
  client: QueryClient,
  onSuccess?: OnSuccess<{ uid: string }>,
) => {
  return injectMutation(() => ({
    mutationFn: (data: ChatStageUpdate) => updateStageCallable(data),
    onSuccess: (data) => {
      client.refetchQueries({ queryKey: ['participant', data.uid] });
      onSuccess?.(data);
    },
  }));
};

// ********************************************************************************************* //
//                                         MESSAGE MUTATIONS                                     //
// ********************************************************************************************* //

export const userMessageMutation = () => {
  return injectMutation(() => ({
    mutationFn: userMessageCallable,
  }));
};

export const discussItemMessageMutation = () => {
  return injectMutation(() => ({
    mutationFn: discussItemsMessageCallable,
  }));
};

export const mediatorMessageMutation = () => {
  return injectMutation(() => ({
    mutationFn: mediatorMessageCallable,
  }));
};

// Chat toggle mutation
export const toggleChatMutation = () => {
  return injectMutation(() => ({
    mutationFn: toggleReadyToEndChatCallable,
  }));
};

// ********************************************************************************************* //
//                                          AUTH MUTATIONS                                       //
// ********************************************************************************************* //

// Login mutation
export const loginMutation = (onSuccess?: OnSuccess<UserCredential>, onError?: OnError) => {
  return injectMutation(() => ({
    mutationFn: (code: string) => signInWithEmailAndPassword(auth, `${code}@palabrate.com`, code),
    onSuccess,
    onError,
  }));
};
