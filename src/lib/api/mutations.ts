/** Tanstack angular mutations.
 */

import { HttpClient } from '@angular/common/http';
import { QueryClient, injectMutation } from '@tanstack/angular-query-experimental';
import { UserCredential, signInWithEmailAndPassword } from 'firebase/auth';
import { lastValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  ChatStageUpdate,
  ChatToggleUpdate,
  CreationResponse,
  OnError,
  OnSuccess,
  ProfileTOSData,
  SimpleResponse,
  SurveyStageUpdate,
  TemplateCreationData,
} from '../types/api.types';
import { ExperimentCreationData } from '../types/experiments.types';
import {
  DiscussItemsMessageMutationData,
  MediatorMessageMutationData,
  UserMessageMutationData,
} from '../types/messages.types';
import { auth } from './firebase';

export const deleteExperimentMutation = (http: HttpClient, client: QueryClient) =>
  injectMutation(() => ({
    mutationFn: (experimentId: string) =>
      lastValueFrom(
        http.delete<SimpleResponse<string>>(
          `${environment.cloudFunctionsUrl}/deleteExperiment/${experimentId}`,
        ),
      ),
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
    mutationFn: (data: ExperimentCreationData) =>
      lastValueFrom(
        http.post<CreationResponse>(`${environment.cloudFunctionsUrl}/createExperiment`, data),
      ),
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
  http: HttpClient,
  client: QueryClient,
  onSuccess?: OnSuccess<ProfileTOSData>,
) => {
  return injectMutation(() => ({
    mutationFn: ({ uid, ...data }: ProfileTOSData) =>
      lastValueFrom(
        http.post<ProfileTOSData>(
          `${environment.cloudFunctionsUrl}/updateProfileAndTOS/${uid}`,
          data,
        ),
      ),
    onSuccess: (data) => {
      client.refetchQueries({ queryKey: ['participant', data.uid] });
      onSuccess?.(data);
    },
  }));
};

export const updateSurveyStageMutation = (
  http: HttpClient,
  client: QueryClient,
  onSuccess?: OnSuccess<{ uid: string }>,
) => {
  return injectMutation(() => ({
    mutationFn: ({ uid, ...data }: SurveyStageUpdate) =>
      lastValueFrom(
        http.post<{ uid: string }>(`${environment.cloudFunctionsUrl}/updateStage/${uid}`, data),
      ),
    onSuccess: (data) => {
      client.refetchQueries({ queryKey: ['participant', data.uid] });
      onSuccess?.(data);
    },
  }));
};

export const updateChatStageMutation = (
  http: HttpClient,
  client: QueryClient,
  onSuccess?: OnSuccess<{ uid: string }>,
) => {
  return injectMutation(() => ({
    mutationFn: ({ uid, ...data }: ChatStageUpdate) =>
      lastValueFrom(
        http.post<{ uid: string }>(`${environment.cloudFunctionsUrl}/updateStage/${uid}`, data),
      ),
    onSuccess: (data) => {
      client.refetchQueries({ queryKey: ['participant', data.uid] });
      onSuccess?.(data);
    },
  }));
};

// ********************************************************************************************* //
//                                         MESSAGE MUTATIONS                                     //
// ********************************************************************************************* //

export const userMessageMutation = (http: HttpClient) => {
  return injectMutation(() => ({
    mutationFn: (data: UserMessageMutationData) =>
      lastValueFrom(http.post(`${environment.cloudFunctionsUrl}/userMessage`, data)),
  }));
};

export const discussItemMessageMutation = (http: HttpClient) => {
  return injectMutation(() => ({
    mutationFn: (data: DiscussItemsMessageMutationData) =>
      lastValueFrom(http.post(`${environment.cloudFunctionsUrl}/discussItemMessage`, data)),
  }));
};

export const mediatorMessageMutation = (http: HttpClient) => {
  return injectMutation(() => ({
    mutationFn: (data: MediatorMessageMutationData) =>
      lastValueFrom(http.post(`${environment.cloudFunctionsUrl}/mediatorMessage`, data)),
  }));
};

// Chat toggle mutation
export const toggleChatMutation = (http: HttpClient) => {
  return injectMutation(() => ({
    mutationFn: ({ participantId, ...data }: ChatToggleUpdate) =>
      lastValueFrom(
        http.post(`${environment.cloudFunctionsUrl}/toggleReadyToEndChat/${participantId}`, data),
      ),
  }));
};

// ********************************************************************************************* //
//                                          AUTH MUTATIONS                                       //
// ********************************************************************************************* //

// Login mutation
export const loginMutation = (onSuccess?: OnSuccess<UserCredential>, onError?: OnError) => {
  return injectMutation(() => ({
    mutationFn: (code: string) => signInWithEmailAndPassword(auth, `${code}@test`, code),
    onSuccess,
    onError,
  }));
};
