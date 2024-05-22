/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/
import { Component, ElementRef, ViewChild, computed, effect } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { routeParamSignal, routeQueryStringSignal } from 'src/lib/utils/angular.utils';
import { ParticipantService } from '../services/participant.service';
import { ParticipantStageViewComponent } from './participant-stage-view/participant-stage-view.component';

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
    const stage = routeQueryStringSignal(route, 'stage');

    participantService.initialize(
      routeParamSignal(route, 'experimentId'),
      routeParamSignal(route, 'participantId'),
      stage,
    );

    this.participantProfile = computed(
      () => participantService.participant()?.profile() ?? undefined,
    );

    // Navigation effect: if the route query parameter signal points to a wrong route or is undefined,
    // navigate to the correct route
    effect(() => {
      const stageName = stage();
      const stages = participantService.experiment()?.stageNames() ?? [];
      if (stages.length === 0) return;

      if (stages.includes(stageName!)) return;

      // Navigate to the first stage
      router.navigate(
        ['/participant', participantService.experimentId()!, participantService.participantId()!],
        { queryParams: { stage: stages[0] } },
      );
    });
  }

  logout() {
    // Navigate back to the login page
    this.router.navigate(['/']);
  }
}
