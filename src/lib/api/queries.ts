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
      experimentId() === null
        ? null
        : lastValueFrom(
            http.get<ExperimentExtended>(
              `${environment.cloudFunctionsUrl}/experiment/${experimentId()}`,
            ),
          ),
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
