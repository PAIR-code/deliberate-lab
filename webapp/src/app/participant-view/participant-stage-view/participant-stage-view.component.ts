/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { StageKind } from '@llm-mediation-experiments/utils';
import { ParticipantService, assertCastStageSignals } from 'src/app/services/participant.service';
import { ExpChatComponent } from './exp-chat/exp-chat.component';
import { ExpLeaderRevealComponent } from './exp-leader-reveal/exp-leader-reveal.component';
import { ExpLeaderVoteComponent } from './exp-leader-vote/exp-leader-vote.component';
import { ExpProfileComponent } from './exp-profile/exp-profile.component';
import { ExpSurveyComponent } from './exp-survey/exp-survey.component';
import { ExpTosComponent } from './exp-tos/exp-tos.component';

@Component({
  selector: 'app-participant-stage-view',
  standalone: true,
  imports: [
    ExpChatComponent,
    ExpLeaderVoteComponent,
    ExpSurveyComponent,
    ExpTosComponent,
    ExpProfileComponent,
    ExpLeaderRevealComponent,
    MatButtonModule,
  ],
  templateUrl: './participant-stage-view.component.html',
  styleUrl: './participant-stage-view.component.scss',
})
export class ParticipantStageViewComponent {
  readonly StageKind = StageKind;
  readonly assertCast = assertCastStageSignals;

  constructor(public readonly participantService: ParticipantService) {}
}
