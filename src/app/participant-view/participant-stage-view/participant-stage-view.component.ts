/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { StageKinds } from 'src/lib/staged-exp/data-model';

import { Component, computed, Signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { ExpChatComponent } from './exp-chat/exp-chat.component';
import { ExpLeaderRevealComponent } from './exp-leader-reveal/exp-leader-reveal.component';
import { ExpLeaderVoteComponent } from './exp-leader-vote/exp-leader-vote.component';
import { ExpProfileComponent } from './exp-profile/exp-profile.component';
//import { ExpRatingComponent } from '../exp-rating/exp-rating.component';
import { ExpSurveyComponent } from './exp-survey/exp-survey.component';
import { ExpTosAndProfileComponent } from './exp-tos-and-profile/exp-tos-and-profile.component';
import { ExpTosComponent } from './exp-tos/exp-tos.component';
import { AppStateService } from '../../services/app-state.service';
import { AppStateEnum } from 'src/lib/staged-exp/app';
import { Participant } from 'src/lib/staged-exp/participant';
import { assertCast } from 'src/lib/albebraic-data';

@Component({
  selector: 'app-participant-stage-view',
  standalone: true,
  imports: [
    ExpChatComponent,
    ExpLeaderVoteComponent,
    ExpProfileComponent,
    ExpSurveyComponent,
    ExpTosAndProfileComponent,
    ExpLeaderRevealComponent,
    ExpTosComponent,
    MatButtonModule,
  ],
  templateUrl: './participant-stage-view.component.html',
  styleUrl: './participant-stage-view.component.scss',
})
export class ParticipantStageViewComponent {
  public participant: Participant;
  readonly StageKinds = StageKinds;

  constructor(stateService: AppStateService) {
    const appState = assertCast(stateService.state(), AppStateEnum.Participant);
    this.participant = appState.particpant;
  }

  shouldShowNextStep() {
    const userData = this.participant.userData();
    return userData.allowedStageProgressionMap[userData.workingOnStageName];
  }

  nextStep() {
    this.participant.nextStep();
  }
}

