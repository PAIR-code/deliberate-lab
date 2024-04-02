/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, Signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioChange, MatRadioModule } from '@angular/material/radio';

import { StageKinds, TosAndUserProfile, UserData } from '../../../../lib/staged-exp/data-model';
import { AppStateService } from '../../../services/app-state.service';
import { Participant } from 'src/lib/staged-exp/participant';

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
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './exp-tos-and-profile.component.html',
  styleUrl: './exp-tos-and-profile.component.scss',
})
export class ExpTosAndProfileComponent {
  public participant: Participant;
  public stageData: Signal<TosAndUserProfile>;

  readonly Pronouns = Pronouns;

  constructor(stateService: AppStateService) {
    const { participant, stageData } = stateService.getParticipantAndStage(
      StageKinds.acceptTosAndSetProfile,
    );
    this.stageData = stageData;
    this.participant = participant;
  }

  canProceedToNextStep(user: UserData) {
    // TODO(cjqian): Make sure TOS is accepted as well.
    return (user.profile.avatarUrl !== '') && (user.profile.name !== '') && (user.profile.pronouns !== '');
  }

  isOtherPronoun(s: string) {
    return s !== Pronouns.HeHim && s !== Pronouns.SheHer && s !== Pronouns.TheyThem;
  }

  updateCheckboxValue(updatedValue: MatCheckboxChange) {
    this.participant.editStageData<TosAndUserProfile>((d) => {
      d.acceptedTosTimestamp = updatedValue.checked ? new Date() : null;
    });
  }

  updateName(name: string) {
    this.participant.editStageData<TosAndUserProfile>((d) => {
      d.name = name;
    });
    this.updateUserProfile();
  }

  updatePronouns(updatedValue: MatRadioChange) {
    this.participant.editStageData<TosAndUserProfile>((d) => {
      d.pronouns = updatedValue.value;
    });
    this.updateUserProfile();
  }

  updateOtherPronoun(pronoun: string) {
    this.participant.editStageData<TosAndUserProfile>((d) => {
      d.pronouns = pronoun;
    });
    this.updateUserProfile();
  }

  updateAvatarUrl(updatedValue: MatRadioChange) {
    this.participant.editStageData<TosAndUserProfile>((d) => {
      d.avatarUrl = updatedValue.value;
    });
    this.updateUserProfile();
  }

  updateUserProfile() {
    this.participant.edit((user) => {
      user.profile.avatarUrl = this.stageData().avatarUrl;
      user.profile.name = this.stageData().name;
      user.profile.pronouns = this.stageData().pronouns;
      user.allowedStageProgressionMap[user.workingOnStageName] = this.canProceedToNextStep(user);
    });
  }
}
