/** Tanstack angular mutations.
 */

import { HttpClient } from '@angular/common/http';
import { QueryClient, injectMutation } from '@tanstack/angular-query-experimental';
import { UserCredential, signInWithEmailAndPassword } from 'firebase/auth';
import { lastValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  ChatStageUpdate,
  CreationResponse,
  OnError,
  OnSuccess,
  ProfileTOSData,
  SurveyStageUpdate,
  TemplateCreationData,
} from '../types/api.types';
import {
  createExperimentCallable,
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
  http: HttpClient,
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
  http: HttpClient,
  client: QueryClient,
  onSuccess?: OnSuccess<CreationResponse>,
) => {
  return injectMutation(() => ({
    mutationFn: (data: TemplateCreationData) =>
      lastValueFrom(
        http.post<CreationResponse>(`${environment.cloudFunctionsUrl}/createTemplate`, data),
      ),
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
    mutationFn: (code: string) => signInWithEmailAndPassword(auth, `${code}@palabrate`, code),
    onSuccess,
    onError,
  }));
};
