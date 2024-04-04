/** Tanstack angular mutations.
 */

import { HttpClient } from '@angular/common/http';
import { QueryClient, injectMutation } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CreationResponse, SimpleResponse } from '../types/api.types';
import { ExperimentCreationData, TemplateCreationData } from '../types/experiments.types';

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
  onSuccess?: (data: CreationResponse) => Promise<void> | void,
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
  onSuccess?: (data: CreationResponse) => Promise<void> | void,
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
