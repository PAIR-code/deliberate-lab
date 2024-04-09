/** Tanstack angular queries.
 * They are defined here in order to make the query structure more apparent.
 */

import { HttpClient } from '@angular/common/http';
import { Signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SimpleResponse } from '../types/api.types';
import { Experiment, ExperimentExtended, Template } from '../types/experiments.types';
import { ParticipantExtended } from '../types/participants.types';

/** Fetch all experiments stored in database (without pagination) */
export const experimentsQuery = (http: HttpClient) =>
  injectQuery(() => ({
    queryKey: ['experiments'],
    queryFn: () =>
      lastValueFrom(
        http.get<SimpleResponse<Experiment[]>>(`${environment.cloudFunctionsUrl}/experiments`),
      ),
  }));

/** Fetch data about a specific experiment (will fetch its participant's data too) */
export const experimentQuery = (http: HttpClient, experimentId: Signal<string | null>) =>
  injectQuery(() => ({
    queryKey: ['experiment', experimentId()],
    queryFn: () =>
      lastValueFrom(
        http.get<ExperimentExtended>(
          `${environment.cloudFunctionsUrl}/experiment/${experimentId()}`,
        ),
      ),
    disabled: experimentId() === null,
  }));

/** Fetch all templates */
export const templatesQuery = (http: HttpClient) =>
  injectQuery(() => ({
    queryKey: ['templates'],
    queryFn: () =>
      lastValueFrom(
        http.get<SimpleResponse<Template[]>>(`${environment.cloudFunctionsUrl}/templates`),
      ),
  }));

/** Fetch a specific participant. Can be used to verify that a participant ID is valid */
export const participantQuery = (http: HttpClient, participantId?: string) =>
  injectQuery(() => ({
    queryKey: ['participant', participantId],
    queryFn: () =>
      lastValueFrom(
        http.get<SimpleResponse<ParticipantExtended>>(
          `${environment.cloudFunctionsUrl}/participant/${participantId}`,
        ),
      ),
    retry: 0, // Avoid background refetches when the participant ID is invalid
    disabled: participantId === undefined,
  }));
