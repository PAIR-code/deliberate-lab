/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/
import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AppStateService } from '../services/app-state.service';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatMenuModule } from '@angular/material/menu';
import { MatListModule } from '@angular/material/list';
import { RouterModule } from '@angular/router';
import { AppStateEnum, makeRouteLinkedParticipant } from 'src/lib/staged-exp/app';
import { Participant } from 'src/lib/staged-exp/participant';
import { ParticipantStageViewComponent } from './participant-stage-view/participant-stage-view.component';
import { MatButtonModule } from '@angular/material/button';

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
  templateUrl: './participant-view.component.html',
  styleUrl: './participant-view.component.scss',
})
export class ParticipantViewComponent implements OnDestroy {
  @ViewChild('googleButton') googleButton!: ElementRef<HTMLElement>;

  participant: Participant;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    public stateService: AppStateService,
  ) {
    this.participant = makeRouteLinkedParticipant(router, route, stateService.data);
    // if (this.participant.viewingStage())
    if (this.participant) {
      stateService.state.set({ kind: AppStateEnum.Participant, particpant: this.participant });
    }
  }

  updateCurrentStageName(stageName: string) {
    if (this.participant) {
      this.participant.setViewingStage(stageName);
    }
  }

  ngOnDestroy(): void {
    if (this.participant && this.participant.destory) {
      this.participant.destory();
    }
  }
}
