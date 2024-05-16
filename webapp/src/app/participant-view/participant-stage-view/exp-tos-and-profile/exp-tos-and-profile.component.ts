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
import { updateTOSAndProfile } from 'src/lib/api/mutations';

enum Pronouns {
  HeHim = 'He/Him',
  SheHer = 'She/Her',
  TheyThem = 'They/Them',
}

@Component({
  selector: 'app-exp-tos-and-profile',
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
  templateUrl: './exp-tos-and-profile.component.html',
  styleUrl: './exp-tos-and-profile.component.scss',
})
export class ExpTosAndProfileComponent {
  // Reload the internal logic dynamically when the stage changes
  @Input({ required: true }) stage!: CastViewingStage<StageKind.AcceptTosAndSetProfile>;

  readonly Pronouns = Pronouns;
  tosLines: string[] = [];

  profileFormControl = new FormGroup({
    name: new FormControl('', Validators.required),
    pronouns: new FormControl('', Validators.required),
    avatarUrl: new FormControl('', Validators.required),
    acceptTosTimestamp: new FormControl<UnifiedTimestamp | null>(null, Validators.required),
  });

  value = ''; // Custom pronouns input value

  constructor(public participantService: ParticipantService) {
    // Refresh the form data when the participant profile changes
    effect(() => {
      const profile = participantService.participant()?.profile();

      if (!profile) return;

      this.profileFormControl.setValue({
        name: profile.name,
        pronouns: profile.pronouns,
        avatarUrl: profile.avatarUrl,
        acceptTosTimestamp: profile.acceptTosTimestamp,
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

  updateCheckboxValue(updatedValue: MatCheckboxChange) {
    this.profileFormControl.patchValue({
      acceptTosTimestamp: updatedValue.checked ? Timestamp.now() : null,
    });
  }

  nextStep() {
    updateTOSAndProfile(
      this.participantService.experimentId()!,
      this.participantService.participantId()!,
      this.profileFormControl.value,
    );

    // TODO: naviguate to next stage on success, after editing "viewing stage", on success of it
  }
}
