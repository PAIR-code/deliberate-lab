/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/
import { Component, ElementRef, ViewChild, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { routeParamSignal, routeQueryStringSignal } from 'src/lib/utils/angular.utils';
import { ParticipantService } from '../services/participant.service';
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
  providers: [ParticipantService],
  templateUrl: './participant-view.component.html',
  styleUrl: './participant-view.component.scss',
})
export class ParticipantViewComponent {
  @ViewChild('googleButton') googleButton!: ElementRef<HTMLElement>;

  // Extract some participant data for ease of use in html
  participantProfile;

  constructor(
    public readonly participantService: ParticipantService,
    route: ActivatedRoute,
    private router: Router,
  ) {
    // Initialize the participant service
    participantService.initialize(
      routeParamSignal(route, 'experimentId'),
      routeParamSignal(route, 'participantId'),
      routeQueryStringSignal(route, 'stage'),
    );

    this.participantProfile = computed(
      () => participantService.participant()?.profile() ?? undefined,
    );
  }

  logout() {
    // Navigate back to the login page
    this.router.navigate(['/']);
  }
}
