/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { ExpChatComponent } from './exp-chat/exp-chat.component';
import { ExpLeaderRevealComponent } from './exp-leader-reveal/exp-leader-reveal.component';
import { ExpLeaderVoteComponent } from './exp-leader-vote/exp-leader-vote.component';
//import { ExpRatingComponent } from '../exp-rating/exp-rating.component';
import { ProviderService } from 'src/app/services/provider.service';
import { Participant } from 'src/lib/participant';
import { PARTICIPANT_PROVIDER_TOKEN } from 'src/lib/provider-tokens';
import { StageKind } from 'src/lib/types/stages.types';
import { ExpSurveyComponent } from './exp-survey/exp-survey.component';
import { ExpTosAndProfileComponent } from './exp-tos-and-profile/exp-tos-and-profile.component';

@Component({
  selector: 'app-participant-stage-view',
  standalone: true,
  imports: [
    ExpChatComponent,
    ExpLeaderVoteComponent,
    ExpSurveyComponent,
    ExpTosAndProfileComponent,
    ExpLeaderRevealComponent,
    MatButtonModule,
  ],
  templateUrl: './participant-stage-view.component.html',
  styleUrl: './participant-stage-view.component.scss',
})
export class ParticipantStageViewComponent {
  public participant: Participant;
  readonly StageKind = StageKind;

  constructor(
    @Inject(PARTICIPANT_PROVIDER_TOKEN) participantProvider: ProviderService<Participant>,
  ) {
    this.participant = participantProvider.get();
  }

  shouldShowNextStep() {
    const userData = this.participant.userData();
    const workingOnStage = this.participant.workingOnStage();

    if (!userData || !workingOnStage) {
      return false;
    }

    return userData.allowedStageProgressionMap[workingOnStage.name];
  }
}
