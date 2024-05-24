/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, Inject, effect } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';

import { StageKind } from '@llm-mediation-experiments/utils';
import { CastViewingStage, ParticipantService } from 'src/app/services/participant.service';

enum Pronouns {
  HeHim = 'He/Him',
  SheHer = 'She/Her',
  TheyThem = 'They/Them',
}

@Component({
  selector: 'app-exp-profile',
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
  templateUrl: './exp-profile.component.html',
  styleUrl: './exp-profile.component.scss',
})
export class ExpProfileComponent {
  readonly Pronouns = Pronouns;

  profileFormControl = new FormGroup({
    name: new FormControl('', Validators.required),
    pronouns: new FormControl('', Validators.required),
    avatarUrl: new FormControl('', Validators.required),
  });

  value = ''; // Custom pronouns input value

  constructor(
    @Inject('stage') public stage: CastViewingStage<StageKind.SetProfile>,
    private participantService: ParticipantService,
  ) {
    // Refresh the form data when the participant profile changes
    effect(() => {
      const profile = participantService.participant()?.profile();

      if (!profile) return;

      this.profileFormControl.setValue({
        name: profile.name,
        pronouns: profile.pronouns,
        avatarUrl: profile.avatarUrl,
      });
    });
  }

  isOtherPronoun(s: string) {
    return s !== Pronouns.HeHim && s !== Pronouns.SheHer && s !== Pronouns.TheyThem;
  }

  updateOtherPronounsValue(event: Event) {
    const pronouns = (event.target as HTMLInputElement).value;

    this.profileFormControl.patchValue({
      pronouns,
    });
  }

  async nextStep() {
    const { name, pronouns, avatarUrl } = this.profileFormControl.value;

    await this.participantService.participant()?.updateProfile({ name, pronouns, avatarUrl });
    await this.participantService.workOnNextStage();
  }
}
