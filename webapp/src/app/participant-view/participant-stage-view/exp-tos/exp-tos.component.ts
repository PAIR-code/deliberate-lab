/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, Input, effect } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';

import { StageKind, UnifiedTimestamp } from '@llm-mediation-experiments/utils';
import { Timestamp } from 'firebase/firestore';
import { CastViewingStage, ParticipantService } from 'src/app/services/participant.service';

@Component({
  selector: 'app-exp-tos',
  standalone: true,
  imports: [
    MatCheckboxModule,
    MatRadioModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatButtonModule,
  ],
  templateUrl: './exp-tos.component.html',
  styleUrl: './exp-tos.component.scss',
})
export class ExpTosComponent {
  // Reload the internal logic dynamically when the stage changes
  @Input({ required: true }) stage!: CastViewingStage<StageKind.TermsOfService>;

  tosLines: string[] = [];

  tosFormControl = new FormGroup({
    acceptTosTimestamp: new FormControl<UnifiedTimestamp | null>(null, Validators.required),
  });

  constructor(private participantService: ParticipantService) {
    // Refresh the form data when the participant profile changes
    effect(() => {
      const profile = participantService.participant()?.profile();

      if (!profile) return;

      this.tosFormControl.setValue({
        acceptTosTimestamp: profile.acceptTosTimestamp,
      });
    });
  }

  updateCheckboxValue(updatedValue: MatCheckboxChange) {
    this.tosFormControl.patchValue({
      acceptTosTimestamp: updatedValue.checked ? Timestamp.now() : null,
    });
  }

  async nextStep() {
    const { acceptTosTimestamp } = this.tosFormControl.value;

    await this.participantService.participant()?.updateProfile({ acceptTosTimestamp });
    await this.participantService.workOnNextStage();
  }
}
