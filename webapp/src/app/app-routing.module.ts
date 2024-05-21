/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AppHomeComponent } from './app-home/app-home.component';
import { AppSettingsComponent } from './app-settings/app-settings.component';
import { experimenterAuthGuard } from './experimenter-auth.guard';
import { CreateExperimentComponent } from './experimenter-view/create-experiment/create-experiment.component';
import { ExperimentMonitorComponent } from './experimenter-view/experiment-monitor/experiment-monitor.component';
import { ExperimentSettingsComponent } from './experimenter-view/experiment-settings/experiment-settings.component';
import { ExperimenterViewComponent } from './experimenter-view/experimenter-view.component';
import { LlmApiConfigComponent } from './experimenter-view/llm-api-config/llm-api-config.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { ParticipantViewComponent } from './participant-view/participant-view.component';
import { validParticipantGuard } from './valid-participant.guard';

const routes: Routes = [
  {
    path: 'participant/:experimentId/:participantId',
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
        path: 'experiment/:experimentId',
        component: ExperimentMonitorComponent,
        pathMatch: 'full',
      },
      {
        path: 'settings',
        component: AppSettingsComponent,
        pathMatch: 'full',
      },
      { path: 'llm-settings', component: LlmApiConfigComponent, pathMatch: 'full' },
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
