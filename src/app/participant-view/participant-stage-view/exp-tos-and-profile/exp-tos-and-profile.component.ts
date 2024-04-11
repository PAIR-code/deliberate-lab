/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { injectQueryClient } from '@tanstack/angular-query-experimental';

import { ProviderService } from 'src/app/services/provider.service';
import { updateProfileAndTOSMutation } from 'src/lib/api/mutations';
import { Participant } from 'src/lib/participant';
import { MutationType, ProfileTOSData } from 'src/lib/types/api.types';
import { StageKind } from 'src/lib/types/stages.types';

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
  public participant: Participant;
  public tosLines: string[] | undefined;

  readonly Pronouns = Pronouns;

  profileFormControl = new FormGroup({
    name: new FormControl('', Validators.required),
    pronouns: new FormControl('', Validators.required),
    avatarUrl: new FormControl('', Validators.required),
    acceptTosTimestamp: new FormControl<string | null>(null, Validators.required),
  });

  http = inject(HttpClient);
  queryClient = injectQueryClient();

  profileMutation: MutationType<ProfileTOSData>;
  value = ''; // Custom pronouns input value

  constructor(participantProvider: ProviderService<Participant>) {
    this.participant = participantProvider.get();
    this.profileMutation = updateProfileAndTOSMutation(this.http, this.queryClient, () =>
      this.participant.navigateToNextStage(),
    );

    // This WILL already have been fetched by the backend at this point,
    // because the auth guard ensures that the participant data is available before rendering this component.
    const data = this.participant.userData();

    if (data) {
      this.profileFormControl.setValue({
        name: data.name,
        pronouns: data.pronouns,
        avatarUrl: data.avatarUrl,
        acceptTosTimestamp: data.acceptTosTimestamp,
      });
      if (this.isOtherPronoun(data.pronouns)) {
        this.value = data.pronouns;
      }
    }

    // Extract the TOS lines and make them available for the template
    const stage = this.participant.assertViewingStageCast(StageKind.AcceptTosAndSetProfile);
    this.tosLines = stage?.config.tosLines;
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
      acceptTosTimestamp: updatedValue.checked ? new Date().toISOString() : null,
    });
  }

  nextStep() {
    this.profileMutation.mutate({
      ...this.profileFormControl.value,
      ...this.participant.getStageProgression(),
      uid: this.participant.userData()?.uid,
    } as ProfileTOSData);
  }
}
