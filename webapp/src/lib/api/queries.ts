/** Tanstack angular queries.
 * They are defined here in order to make the query structure more apparent.
 */

import { Signal } from '@angular/core';
import { ExperimentExtended } from '@llm-mediation-experiments/utils';
import { injectQuery } from '@tanstack/angular-query-experimental';
import {
  experimentCallable,
  experimentsCallable,
  participantCallable,
  templatesCallable,
} from './callables';

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
export const templatesQuery = () =>
  injectQuery(() => ({
    queryKey: ['templates'],
    queryFn: () => templatesCallable(),
  }));

/** Fetch a specific participant. Can be used to verify that a participant ID is valid */
export const participantQuery = (participantUid?: string, isForAuth?: boolean) =>
  injectQuery(() => ({
    queryKey: ['participant', participantUid],
    queryFn: () => participantCallable({ participantUid: participantUid! }),
    disabled: participantUid === undefined,
    retry: isForAuth ? 0 : undefined,
  }));
