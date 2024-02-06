/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { NgModule } from '@angular/core';
import { RouterModule, Routes, withComponentInputBinding } from '@angular/router';
import { AppHomeComponent as AppHomeComponent } from './app-home/app-home.component';
import { AppSettingsComponent } from './app-settings/app-settings.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { ExpSurveyComponent } from './participant-view/participant-stage-view/exp-survey/exp-survey.component';
import { ExpLeaderVoteComponent } from './participant-view/participant-stage-view/exp-leader-vote/exp-leader-vote.component';
import { ExpTosComponent } from './participant-view/participant-stage-view/exp-tos/exp-tos.component';
import { ParticipantViewComponent } from './participant-view/participant-view.component';
import { ExperimenterViewComponent } from './experimenter-view/experimenter-view.component';
import { ExperimentMonitorComponent } from './experimenter-view/experiment-monitor/experiment-monitor.component';
import { ExperimentSettingsComponent } from './experimenter-view/experiment-settings/experiment-settings.component';
import { experimenterAuthGuard } from './experimenter-auth.guard';
import { validParticipantGuard } from './valid-participant.guard';
import { CreateExperimentComponent } from './experimenter-view/create-experiment/create-experiment.component';

const routes: Routes = [
  {
    path: 'participant/:experiment/:user',
    component: ParticipantViewComponent,
    canActivate: [validParticipantGuard],
    pathMatch: 'full',
  },
  {
    path: 'experimenter',
    component: ExperimenterViewComponent,
    canActivate: [experimenterAuthGuard],
    children: [
      {
        path: 'create-experiment',
        component: CreateExperimentComponent,
        pathMatch: 'full',
      },
      {
        path: 'experiment/:experiment/settings',
        component: ExperimentSettingsComponent,
        pathMatch: 'full',
      },
      {
        path: 'experiment/:experiment',
        component: ExperimentMonitorComponent,
        pathMatch: 'full',
      },
      {
        path: 'settings',
        component: AppSettingsComponent,
        pathMatch: 'full',
      },
    ],
  },
  { path: '', component: AppHomeComponent, pathMatch: 'full' },
  { path: '**', component: PageNotFoundComponent },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      useHash: true,
      bindToComponentInputs: true,
      // enableTracing: true,
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}

// provideRouter(appRoutes, withComponentInputBinding()),
