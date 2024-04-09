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
import { StageKinds } from 'src/lib/staged-exp/data-model';
import { MutationType } from 'src/lib/types/api.types';
import { ProfileTOSData } from 'src/lib/types/experiments.types';

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

  constructor(participantProvider: ProviderService<Participant>) {
    this.participant = participantProvider.get();
    this.profileMutation = updateProfileAndTOSMutation(
      this.http,
      this.queryClient,
      this.participant.navigateToNextStage,
    );

    // TODO: prefill the form in an async way ? Test this by directly logging into the first stage from a URL / the login form
    const data = this.participant.userData();
    if (data) {
      this.profileFormControl.setValue({
        name: data.name,
        pronouns: data.pronouns,
        avatarUrl: data.avatarUrl,
        acceptTosTimestamp: null,
      });
    }

    // Extract the TOS lines and make them available for the template
    const tosLines = this.participant.assertViewingStageCast(StageKinds.acceptTosAndSetProfile);
    this.tosLines = tosLines?.config.tosLines;
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
    // TODO: mutate and send the correct data
    // this.profileMutation.mutate(this.profileFormControl.value);
  }
}
