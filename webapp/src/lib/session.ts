/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/
import * as _ from 'underscore';

import { computed, effect, Signal, signal, untracked, WritableSignal } from '@angular/core';

export class Session<T> {
  public toUrlParams: WritableSignal<Partial<T>>;
  public defaultSession: WritableSignal<T>;
  public state: WritableSignal<T>;

  constructor(
    // fromRouteParams corresponds to URL parts: /foo/:id/bar/:name
    //  will set the variable: `name` and `id`
    private fromUrlParams: Signal<Partial<T>>,
    private defaultSessionData: T,
  ) {
    // The current URL params data.
    // Update this to have default data if/as needed.
    this.defaultSession = signal(this.defaultSessionData);
    const initSessionData: T = { ...this.defaultSessionData };
    Object.assign(initSessionData as Partial<T>, fromUrlParams()) as T;
    // Object.assign({ ...DEFAULT_SESSION }, { stage: this.user().workingOnStageName }));
    this.state = signal(initSessionData, { equal: _.isEqual });

    // This is a rather delicate bit of logic that corelates session parameters to URL parameters.
    // It ensures that all and only non-default session parameters are always
    // represented in the URL.
    const lastSession = signal<T>(initSessionData);
    this.toUrlParams = signal<Partial<T>>(fromUrlParams());

    // let firstEmptyParams = true;
    effect(
      () => {
        const urlParams = this.fromUrlParams();
        // Don't update on the very first value, which is always {} even if URL params are provided.
        // if (firstEmptyParams) {
        //   firstEmptyParams = false;
        //   return;
        // }
        const oldSession = untracked(this.state);
        const fullUrlSession: T = Object.assign(
          { ...this.defaultSession() } as object,
          urlParams,
        ) as T;
        lastSession.set(fullUrlSession);
        if (!_.isEqual(oldSession, fullUrlSession)) {
          this.state.set(fullUrlSession);
        }
      },
      { allowSignalWrites: true },
    );

    // let firstSessionUpdate = true;
    effect(
      () => {
        // Don't update on the very first value, which is restored from user saved default session.
        // if (firstSessionUpdate) {
        //   firstSessionUpdate = false;
        //   return;
        // }
        // Remove any entries that are the default value: keep the URL minimal.
        const trimmedNewSession: Partial<T> = { ...this.state() };
        for (const k of Object.keys(trimmedNewSession)) {
          const key = k as keyof Partial<T>;
          if (_.isEqual(trimmedNewSession[key], this.defaultSession()[key])) {
            delete trimmedNewSession[key];
          }
        }
        if (!_.isEqual(untracked(lastSession), this.state())) {
          this.toUrlParams.set(trimmedNewSession);
        }
      },
      { allowSignalWrites: true },
    );
  }

  // Support functional, or in-place editing.
  edit(f: (session: T) => T | void): void {
    const curSession = this.state();
    let newSession = { ...curSession };
    const maybeFreshSession = f(newSession);
    if (maybeFreshSession) {
      newSession = { ...maybeFreshSession };
    }
    this.state.set(newSession);
  }
}

// function parseSessionParam(str: string | null): AppSessionParamState {
//   if (!str) {
//     return { session: DEFAULT_SESSION, errors: [] };
//   }
//   try {
//     const session = JSON.parse(str) as AppSession;
//     return { session, errors: [] };
//   } catch (err) {
//     return { session: DEFAULT_SESSION, errors: ['URL state param is not valid JSON'] };
//   }
// }

// function prepareSessionParam(session: AppSession): string {
//   return JSON.stringify(session);
// }
