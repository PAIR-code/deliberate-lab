/** Tanstack angular mutations.
 */

import {
  ChatStageUpdate,
  CreationResponse,
  LeaderRevealStageUpdate,
  LeaderVoteStageUpdate,
  OnSuccess,
  ProfileTOSData,
  SurveyStageUpdate,
} from '@llm-mediation-experiments/utils';
import { QueryClient, injectMutation } from '@tanstack/angular-query-experimental';
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

export const deleteExperimentMutation = (client: QueryClient) =>
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

// ********************************************************************************************* //
//                                         STAGE MUTATIONS                                       //
// ********************************************************************************************* //

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

export const updateLeaderVoteStageMutation = (
  client: QueryClient,
  onSuccess?: OnSuccess<{ uid: string }>,
) => {
  return injectMutation(() => ({
    mutationFn: (data: LeaderVoteStageUpdate) => updateStageCallable(data),
    onSuccess: (data) => {
      client.refetchQueries({ queryKey: ['participant', data.uid] });
      onSuccess?.(data);
    },
  }));
};

export const updateLeaderRevealStageMutation = (
  client: QueryClient,
  onSuccess?: OnSuccess<{ uid: string }>,
) => {
  return injectMutation(() => ({
    mutationFn: (data: LeaderRevealStageUpdate) => updateStageCallable(data),
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
