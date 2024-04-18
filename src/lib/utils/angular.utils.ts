/** Util functions to manipulate Angular constructs */

import {
  CreateEffectOptions,
  Signal,
  WritableSignal,
  effect,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Observable, map } from 'rxjs';

/** Extract a route parameter as an observable.
 * @param route The activated route
 * @param param The parameter name in the route URL
 */
export const routeParamObservable = (
  route: ActivatedRoute,
  param: string,
): Observable<string | undefined> => route.params.pipe(map((params) => params[param]));

/** Extract a route parameter as a signal.
 * @param route The activated route
 * @param param The parameter name in the route URL
 */
export const routeParamSignal = (
  route: ActivatedRoute,
  param: string,
): Signal<string | undefined> => toSignal(routeParamObservable(route, param));

/** Extract a query string parameter as an observable.
 * @param route The activated route
 * @param param The query string parameter name
 */
export const routeQueryStringObservable = (
  route: ActivatedRoute,
  param: string,
): Observable<string | undefined> => route.queryParams.pipe(map((params) => params[param]));

/** Extract a query string parameter as a signal.
 * @param route The activated route
 * @param param The query string parameter name
 */
export const routeQueryStringSignal = (
  route: ActivatedRoute,
  param: string,
): Signal<string | undefined> => toSignal(routeQueryStringObservable(route, param));

/** Create a WritableSignal instance that will also listen to another signal
 * in order to update itself until its own value is no longer nullish.
 *
 * @param source The source signal to listen to
 * @param create A function to create the value of the writable signal
 */
export const lazyInitWritable = <T, K>(
  source: Signal<T>,
  create: (value: NonNullable<T>) => K,
): WritableSignal<K | undefined> => {
  const result = signal<K | undefined>(undefined);

  const ref = effect(
    () => {
      const value = source();
      const current = untracked(result);

      if (!current && value) {
        result.set(create(value));
        ref.destroy(); // Stop listening after initialization
      }
    },
    { allowSignalWrites: true }, // We write to the `result` signal, which is untracked here
  );

  return result;
};

/** Creates a second-counter timer that is synchronized with the local storage in order to resume ticking when reloading the page */
export const localStorageTimer = (
  key: string,
  defaultStartSeconds: number,
  onFinish: () => void,
) => {
  // Use an object to store the interval reference
  const utils = {
    interval: undefined as ReturnType<typeof setInterval> | undefined,
  };

  const initInterval = () =>
    (utils.interval = setInterval(() => {
      const newValue = timer() - 1;
      if (newValue < 0) {
        onFinish();
        remove();
        return;
      }
      timer.set(newValue);
      localStorage.setItem(key, newValue.toString());
    }, 1000));

  const existingSeconds = localStorage.getItem(key);
  if (existingSeconds) {
    defaultStartSeconds = parseInt(existingSeconds, 10);
  } else {
    localStorage.setItem(key, defaultStartSeconds.toString());
  }
  const timer = signal(defaultStartSeconds);

  const reset = (startSeconds: number) => {
    clearInterval(utils.interval);
    utils.interval = initInterval();
    timer.set(startSeconds);
    localStorage.setItem(key, startSeconds.toString());
  };

  const remove = () => {
    clearInterval(utils.interval);
    localStorage.removeItem(key);
  };

  const start = () => {
    clearInterval(utils.interval);
    utils.interval = initInterval();
  };

  return { timer, start, reset, remove } as const;
};

/** Angular effect that runs util the given callback returns true */
export const onceEffect = (callback: () => boolean, options?: CreateEffectOptions | undefined) => {
  const ref = effect(() => {
    if (callback()) {
      ref.destroy();
    }
  }, options);
};
