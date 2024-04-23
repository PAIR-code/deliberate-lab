/** Tanstack angular queries.
 * They are defined here in order to make the query structure more apparent.
 */

import { HttpClient } from '@angular/common/http';
import { Signal } from '@angular/core';
import { injectQuery } from '@tanstack/angular-query-experimental';
import { lastValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SimpleResponse } from '../types/api.types';
import { ExperimentExtended, Template } from '../types/experiments.types';
import { experimentCallable, experimentsCallable, participantCallable } from './callables';

/** Fetch all experiments stored in database (without pagination) */
export const experimentsQuery = () =>
  injectQuery(() => ({
    queryKey: ['experiments'],
    queryFn: () => experimentsCallable(),
  }));

/** Fetch data about a specific experiment (will fetch its participant's data too) */
export const experimentQuery = (experimentId: Signal<string | null>) => {
  return injectQuery(() => ({
    queryKey: ['experiment', experimentId()],
    queryFn: () => {
      const experimentUid = experimentId();
      if (!experimentUid) return {} as ExperimentExtended;
      return experimentCallable({ experimentUid });
    },
    disabled: experimentId() === null,
  }));
};

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
export const participantQuery = (participantUid?: string) =>
  injectQuery(() => ({
    queryKey: ['participant', participantUid],
    queryFn: () => participantCallable({ participantUid: participantUid! }),
    disabled: participantUid === undefined,
  }));
