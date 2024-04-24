/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/
import { Component, ElementRef, Inject, Signal, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { signOut } from 'firebase/auth';
import { auth } from 'src/lib/api/firebase';
import { experimentQuery } from 'src/lib/api/queries';
import { Participant } from 'src/lib/participant';
import {
  EXPERIMENT_PROVIDER_TOKEN,
  ExperimentProvider,
  PARTICIPANT_PROVIDER_TOKEN,
  ParticipantProvider,
} from 'src/lib/provider-tokens';
import { ExperimentExtended } from 'src/lib/types/experiments.types';
import { routeParamSignal, routeQueryStringSignal } from 'src/lib/utils/angular.utils';
import { ProviderService } from '../services/provider.service';
import { ParticipantStageViewComponent } from './participant-stage-view/participant-stage-view.component';

// NOTE: est-ce qu'on devrait pas provide ici l'expérience ? en tout cas faudra le faire.
// mettre un signal, ou alors balec. mais injecter au bon endroit

@Component({
  selector: 'app-participant-view',
  standalone: true,
  imports: [
    MatIconModule,
    MatSidenavModule,
    MatMenuModule,
    MatListModule,
    MatButtonModule,
    RouterModule,
    ParticipantStageViewComponent,
  ],
  providers: [
    {
      provide: PARTICIPANT_PROVIDER_TOKEN,
      useFactory: () => new ProviderService<Participant>(),
    },
    {
      provide: EXPERIMENT_PROVIDER_TOKEN,
      useFactory: () => new ProviderService<Signal<ExperimentExtended | undefined>>(),
    },
  ],
  templateUrl: './participant-view.component.html',
  styleUrl: './participant-view.component.scss',
})
export class ParticipantViewComponent {
  @ViewChild('googleButton') googleButton!: ElementRef<HTMLElement>;

  participant: Participant;

  constructor(
    @Inject(PARTICIPANT_PROVIDER_TOKEN) participantService: ParticipantProvider,
    @Inject(EXPERIMENT_PROVIDER_TOKEN) experimentService: ExperimentProvider,
    route: ActivatedRoute,
  ) {
    // Create a new participant handler class instance and bind it to this subroute
    this.participant = new Participant(
      routeParamSignal(route, 'participantId'), // Bind the participant ID to the 'participantId' route param
      routeQueryStringSignal(route, 'stage'), // Bind the stage being viewed to the 'stage' query string param
    );

    // Share it to subcomponents via the service (destroy the previous instance)
    participantService.set(this.participant)?.destroy();

    const query = experimentQuery(this.participant.experimentId);
    experimentService.set(query.data);
  }

  logout() {
    signOut(auth);
  }
}
