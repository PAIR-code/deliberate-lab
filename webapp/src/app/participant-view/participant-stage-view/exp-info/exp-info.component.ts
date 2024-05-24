/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { StageKind } from '@llm-mediation-experiments/utils';
import { CastViewingStage, ParticipantService } from 'src/app/services/participant.service';

@Component({
  selector: 'app-exp-info',
  standalone: true,
  imports: [MatButtonModule],
  templateUrl: './exp-info.component.html',
  styleUrl: './exp-info.component.scss',
})
export class ExpInfoComponent {
  html: string = '';

  constructor(
    private participantService: ParticipantService,
    @Inject('stage') public stage: CastViewingStage<StageKind.Info>,
  ) {}

  async nextStep() {
    await this.participantService.workOnNextStage();
  }
}
