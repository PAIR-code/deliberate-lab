/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/
import { computed, effect, EffectRef, signal } from '@angular/core';
import * as _ from 'underscore';
import { Subscription } from 'rxjs';
import { Session } from 'src/lib/session';
import { ActivatedRoute, Params, Router } from '@angular/router';

// Idea to handle different state kinds of classes...
//
// Combines routeParams and queryParams into a single Session, and sets them appropriately.
export class RouteSessionBinding<RouteParamData, QueryParamData> {
  // type Session = RouteParamData & QueryParamData;
  public session: Session<RouteParamData & QueryParamData>;
  private paramsSubscription: Subscription;
  private queryParamsSubscription: Subscription;
  private sessionToRouterEffectRef: EffectRef;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    // The subset of top level session variables
    private routeParamNames: Set<keyof RouteParamData>,
    private defaultSessionData: RouteParamData & QueryParamData,
  ) {
    const routeParamsSignal = signal<Partial<RouteParamData>>(
      route.snapshot.params as RouteParamData,
      { equal: _.isEqual },
    );
    this.paramsSubscription = this.route.params.subscribe((params) => {
      // console.log(JSON.stringify(params));
      routeParamsSignal.set(params as Partial<RouteParamData>);
    });

    const queryParamsSignal = signal<Partial<QueryParamData>>(
      route.snapshot.queryParams as QueryParamData,
      { equal: _.isEqual },
    );
    this.queryParamsSubscription = this.route.queryParams.subscribe((params) =>
      queryParamsSignal.set(params as Partial<QueryParamData>),
    );

    const allParamsSignal = computed(() => {
      return { ...routeParamsSignal(), ...queryParamsSignal() } as Partial<
        RouteParamData & QueryParamData
      >;
    });

    this.session = new Session(allParamsSignal, this.defaultSessionData);
    this.sessionToRouterEffectRef = effect(() => {
      const routeParams = {} as RouteParamData;
      const queryParams = {} as Params;
      const urlParams = this.session.toUrlParams();
      Object.keys(urlParams).forEach((k) => {
        // const key = k as keyof (RouteParamData & QueryParamData);
        if (this.routeParamNames.has(k as keyof RouteParamData)) {
          const routeKey = k as keyof RouteParamData;
          routeParams[routeKey] = urlParams[routeKey] as RouteParamData[keyof RouteParamData];
        } else {
          const queryKey = k as keyof QueryParamData;
          queryParams[k] = urlParams[queryKey] as Params[keyof Params];
        }
      });
      // TODO: set navigate route params too...
      this.router.navigate([], { relativeTo: this.route, queryParams });
    });
  }

  public destroy() {
    this.paramsSubscription.unsubscribe();
    this.queryParamsSubscription.unsubscribe();
    this.sessionToRouterEffectRef.destroy();
  }
}
