/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

// -------------------------------------------------------------------------------------
//  Session management: stored in the URL

import { ActivatedRoute, ActivatedRouteSnapshot, Params, Router } from '@angular/router';
import { Participant } from './participant';
import { Session } from '../session';
import {
  ChatAboutItems,
  ExpDataKinds,
  ExpStage,
  Experiment,
  MediatorMessage,
  UserData,
} from './data-model';
import { initialExperimentSetup, makeStages } from './example-experiment';
import { EffectRef, Signal, WritableSignal, computed, effect, signal } from '@angular/core';
import * as _ from 'underscore';
import { Subscription } from 'rxjs';
import { option } from 'yargs';
import { RouteSessionBinding } from '../route-session-binding';

// function getPathArray(route: ActivatedRouteSnapshot) {
//   let array = [];
//   if (route.routeConfig && route.routeConfig.path !== '') {
//     array.push(route.routeConfig.path);
//   }
//   if (route.firstChild) {
//     array = array.concat(getPathArray(route.firstChild));
//   }
//   return array;
// }

// -------------------------------------------------------------------------------------
export interface ParticipantRouteParams {
  user: string;
  experiment: string;
}
export interface ParticipantQueryParams {
  stage: string;
}
export type ParticipantSession = ParticipantRouteParams & ParticipantQueryParams;

// export interface AppSessionParamState {
//   session: Partial<ParticipantSession>;
//   errors: string[];
// }
export const DEFAULT_PARTICIPANT_SESSION: ParticipantSession = {
  user: '',
  experiment: '',
  stage: '',
};

export enum AppStateEnum {
  LandingPage = 'LandingPage',
  Participant = 'Participant',
  Experimenter = 'Experimenter',
}

// export class AppStateParticipant extends GenericAppState<
//   ParticipantRouteParams,
//   ParticipantSession
// > {
//   participant: Participant;

//   constructor(
//     router: Router,
//     route: ActivatedRoute,
//     private appData: WritableSignal<SavedAppData>,
//   ) {
//     super(router, route, participantRouteParams, DEFAULT_PARTICIPANT_SESSION);
//     this.participant = new Participant(this.appData, this.session, () => );
//   }
// }

export function makeRouteLinkedParticipant(
  router: Router,
  route: ActivatedRoute,
  appData: WritableSignal<SavedAppData>,
): Participant {
  const participantRouteParams = new Set<keyof ParticipantRouteParams>(['experiment', 'user']);

  const routeSessionBinding = new RouteSessionBinding<ParticipantRouteParams, ParticipantSession>(
    router,
    route,
    participantRouteParams,
    DEFAULT_PARTICIPANT_SESSION,
  );

  const participant = new Participant(appData, routeSessionBinding.session, () =>
    routeSessionBinding!.destroy(),
  );

  return participant;
}

export interface AppStateLandingPage {
  kind: AppStateEnum.LandingPage;
}
export interface AppStateParticipant {
  kind: AppStateEnum.Participant;
  particpant: Participant;
}
export interface AppStateExperimenter {
  kind: AppStateEnum.Experimenter;
}

export type AppState = AppStateLandingPage | AppStateParticipant | AppStateExperimenter;

export const initAppState: AppState = { kind: AppStateEnum.LandingPage };

// class AppController {
//   state: AppState;

//   constructor(
//     private router: Router,
//     private route: ActivatedRoute,
//   ) {}
// }

// -------------------------------------------------------------------------------------
//  App Settings & Data (saved in local storage / firebase)
// -------------------------------------------------------------------------------------
// App setting and data saved in localstorage/server side.
export interface AppSettings {
  name: string;
  sheetsId: string;
  sheetsRange: string;
}
export interface SavedAppData {
  settings: AppSettings;
  experiments: { [name: string]: Experiment };
}

export function initialAppData(): SavedAppData {
  const initAppData: SavedAppData = {
    settings: {
      name: 'LLM-Experimenter',
      sheetsId: '',
      sheetsRange: '', // e.g.
    },
    experiments: {},
  };
  addExperiment('initial experiment', makeStages(), initAppData);
  return initAppData;
}

export function addExperiment(name: string, stages: ExpStage[], appData: SavedAppData) {
  const experiment = initialExperimentSetup(name, 3, stages);
  appData.experiments[experiment.name] = experiment;
}

// export function initialAppData(): SavedAppData {
//   const experiment = initialExperimentSetup(3);
//   const experiments: { [name: string]: Experiment } = {};
//   experiments[experiment.name] = experiment;

//   return {
//     settings: {
//       name: 'LLM-Mediators',
//       sheetsId: '',
//       sheetsRange: '', // e.g.
//     },
//     experiments,
//   };
// }

export function editParticipant(
  appData: WritableSignal<SavedAppData>,
  participant: { experiment: string; id: string },
  f: (user: UserData) => UserData | void,
  options?: { skipSetting: boolean },
): void {
  const data = appData();
  const experiment = data.experiments[participant.experiment];
  const userData = experiment.participants[participant.id];
  // We have to force update the user object also, because change tracking for
  // the user Signal is based on reference.
  let user: UserData = { ...userData };
  const maybeNewUser = f(user);
  if (maybeNewUser) {
    user = { ...maybeNewUser };
  }
  if (user.userId !== participant.id) {
    // TODO: we could consider allowing this with an option to the call...
    throw new Error(
      `Editing a user should not their id: new: ${user.userId}, old: ${participant.id}`,
    );
  }
  // TODO...
  // Editing experiment like this means we assume no async changes to the experiment...
  // If we had signals linked to the experiment, tracked by reference, they will not know...
  experiment.participants[user.userId] = user;
  if (options && options.skipSetting) {
    return;
  }
  appData.set({ ...data });
}

// IDEA: every stage has it's kind in it's (indexed) name. That way, we
// can check dynmically for trying to edit the wrong stage kind also.

export function editParticipantStage<T extends ExpDataKinds>(
  appData: WritableSignal<SavedAppData>,
  participant: { experiment: string; id: string },
  stageName: string,
  f: (oldExpStage: T) => T | void,
  options?: { skipSetting: boolean },
) {
  editParticipant(
    appData,
    participant,
    (user) => {
      const maybeNewData = f(user.stageMap[stageName].config as T);
      if (maybeNewData) {
        user.stageMap[stageName].config = maybeNewData;
      }
    },
    options,
  );
}

export function sendParticipantMessage(
  appData: WritableSignal<SavedAppData>,
  fromParticipant: { experiment: string; id: string },
  to: { stageName: string; message: string },
  options?: { withoutSetting: boolean },
): void {
  const experiment = appData().experiments[fromParticipant.experiment];
  const fromProfile =
    appData().experiments[fromParticipant.experiment].participants[fromParticipant.id].profile;

  for (const u of Object.values(experiment.participants)) {
    editParticipantStage<ChatAboutItems>(
      appData,
      { experiment: experiment.name, id: u.userId },
      to.stageName,
      (config) => {
        // console.log(u.userId, config);
        config.messages.push({
          fromUserId: fromParticipant.id,
          messageType: 'userMessage',
          text: to.message,
          fromProfile: fromProfile,
          timestamp: new Date().valueOf(),
        });
      },
      { skipSetting: true },
    );
  }
  if (options && options.withoutSetting) {
    return;
  }
  appData.set({ ...appData() });
}

export function sendMediatorGroupMessage(
  appData: WritableSignal<SavedAppData>,
  experimentName: string,
  to: { stageName: string; message: string },
  options?: { withoutSetting: boolean },
): void {
  const experiment = appData().experiments[experimentName];

  for (const u of Object.values(experiment.participants)) {
    editParticipantStage<ChatAboutItems>(
      appData,
      { experiment: experimentName, id: u.userId },
      to.stageName,
      (stageData) => {
        const mediatorMessage: MediatorMessage = {
          messageType: 'mediatorMessage',
          text: to.message,
          timestamp: new Date().valueOf(),
        };
        stageData.messages.push(mediatorMessage);
      },
      { skipSetting: true },
    );
  }
  if (options && options.withoutSetting) {
    return;
  }
  appData.set({ ...appData() });
}
