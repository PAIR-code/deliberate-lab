/** Util functions to manipulate Angular constructs */

import { Signal, WritableSignal, effect, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  CheckQuestion,
  Question,
  RatingQuestion,
  ScaleQuestion,
  SurveyQuestionKind,
  TextQuestion,
} from '@llm-mediation-experiments/utils';
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

// ********************************************************************************************* //
//                                         FORM BUILDER                                          //
// ********************************************************************************************* //

export const buildTextQuestionForm = (fb: FormBuilder, question: TextQuestion) =>
  fb.group({
    answerText: [question.answerText ?? '', Validators.required],
  });

export const buildCheckQuestionForm = (fb: FormBuilder, question: CheckQuestion) =>
  fb.group({
    checkMark: [question.checkMark ?? false],
  });

export const buildRatingQuestionForm = (fb: FormBuilder, question: RatingQuestion) =>
  fb.group({
    choice: [question.choice, Validators.required],
    confidence: [
      question.confidence ?? 0,
      [Validators.required, Validators.min(0), Validators.max(1)],
    ],
  });

export const buildScaleQuestionForm = (fb: FormBuilder, question: ScaleQuestion) =>
  fb.group({
    score: [question.score ?? 0, [Validators.required, Validators.min(0), Validators.max(10)]],
  });

export const buildQuestionForm = (fb: FormBuilder, question: Question) => {
  switch (question.kind) {
    case SurveyQuestionKind.Text:
      return buildTextQuestionForm(fb, question);
    case SurveyQuestionKind.Check:
      return buildCheckQuestionForm(fb, question);
    case SurveyQuestionKind.Rating:
      return buildRatingQuestionForm(fb, question);
    case SurveyQuestionKind.Scale:
      return buildScaleQuestionForm(fb, question);
  }
};

// ********************************************************************************************* //
//                                           VALIDATORS                                          //
// ********************************************************************************************* //

/** Validator that interprets a value as forbidden (useful for string enum forms with a default) */
export function forbiddenValueValidator(forbiddenValue: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === forbiddenValue) {
      // Return an error if the value is the forbidden value
      return { forbiddenValue: { value: control.value } };
    }
    return null; // Return null if there is no error
  };
}
