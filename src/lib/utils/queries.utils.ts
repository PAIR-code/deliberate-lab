import { toObservable } from '@angular/core/rxjs-interop';
import { QueryType } from 'src/lib/types/api.types';

/** Given an Angular Tanstack Query, returns a promise that resolves to:
 * - `true` if the query was successful
 * - `false` if not.
 *
 * Used for the participant auth guards
 */
export const querySuccessPromise = <T>(query: QueryType<T>): Promise<boolean> => {
  const status = toObservable(query.status);

  return new Promise((resolve) => {
    const subscription = status.subscribe((status) => {
      if (status === 'success') {
        resolve(true);
        subscription.unsubscribe();
      } else if (status === 'error') {
        resolve(false);
        subscription.unsubscribe();
      }
    });
  });
};
