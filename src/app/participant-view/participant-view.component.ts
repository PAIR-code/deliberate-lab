/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/
import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Participant } from 'src/lib/participant';
import { routeParamSignal, routeQueryStringSignal } from 'src/lib/utils/angular.utils';
import { ProviderService } from '../services/provider.service';
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
  providers: [ProviderService<Participant>],
  templateUrl: './participant-view.component.html',
  styleUrl: './participant-view.component.scss',
})
export class ParticipantViewComponent implements OnDestroy {
  @ViewChild('googleButton') googleButton!: ElementRef<HTMLElement>;

  participant: Participant;

  constructor(
    private route: ActivatedRoute,
    public participantService: ProviderService<Participant>,
    public router: Router,
  ) {
    // Create a new participant handler class instance and bind it to this subroute
    this.participant = new Participant(
      routeParamSignal(this.route, 'participantId'), // Bind the participant ID to the 'participantId' route param
      routeQueryStringSignal(this.route, 'stage'), // Bind the stage being viewed to the 'stage' query string param
    );

    // Share it to subcomponents via the service
    participantService.apply((p) => p?.destroy()); // Destroy the previous one just in case
    participantService.set(this.participant);
  }

  updateCurrentStageName(_stageName: string) {
    if (this.participant) {
      // this.participant.setViewingStage(stageName);
    }
  }

  ngOnDestroy(): void {
    if (this.participant) {
      //} && this.participant.destory) {
      // this.participant.destory();
    }
  }
}
