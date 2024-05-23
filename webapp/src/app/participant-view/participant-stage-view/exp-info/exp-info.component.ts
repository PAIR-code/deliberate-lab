/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { StageKind } from '@llm-mediation-experiments/utils';
import { CastViewingStage, ParticipantService } from 'src/app/services/participant.service';

@Component({
  selector: 'app-exp-info',
  standalone: true,
  imports: [
    MatButtonModule,
  ],
  templateUrl: './exp-info.component.html',
  styleUrl: './exp-info.component.scss',
})
export class ExpInfoComponent {
  // Reload the internal logic dynamically when the stage changes
  @Input({ required: true }) stage!: CastViewingStage<StageKind.Info>;

  html: string = '';

  constructor(private participantService: ParticipantService) {
  }


  async nextStep() {
    await this.participantService.workOnNextStage();
  }
}
