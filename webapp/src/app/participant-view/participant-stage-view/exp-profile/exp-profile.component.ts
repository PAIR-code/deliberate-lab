/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, Signal, computed } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioChange, MatRadioModule } from '@angular/material/radio';

import { StageKinds, UserProfile } from '../../../../lib/staged-exp/data-model';
import { AppStateService } from '../../../services/app-state.service';
import { Participant } from 'src/lib/staged-exp/participant';

@Component({
  selector: 'app-exp-profile',
  standalone: true,
  imports: [
    MatRadioModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './exp-profile.component.html',
  styleUrl: './exp-profile.component.scss',
})
export class ExpProfileComponent {
  public participant: Participant;

  public profile: Signal<UserProfile>;

  constructor(private stateService: AppStateService) {
    const { participant, stageData } = this.stateService.getParticipantAndStage(
      StageKinds.setProfile,
    );
    this.profile = computed(() => {
      console.log('ExpProfileComponent stage data: ', stageData());
      return stageData();
    });
    this.participant = participant;
  }

  isComplete(): boolean {
    return (
      this.profile().avatarUrl !== '' &&
      this.profile().name !== '' &&
      this.profile().pronouns !== ''
    );
  }

  updateName(updatedValue: string) {
    this.participant.editStageData<UserProfile>((p) => {
      p.name = updatedValue;
      this.participant.setProfile(p);
    });
    this.updateStageProgression();
  }

  updatePronouns(updatedValue: MatRadioChange) {
    if (updatedValue.value !== this.participant.userData().profile.pronouns) {
      this.participant.editStageData<UserProfile>((p) => {
        p.pronouns = updatedValue.value;
        this.participant.setProfile(p);
      });
    }
    this.updateStageProgression();
  }

  updateAvatarUrl(updatedValue: MatRadioChange) {
    this.participant.editStageData<UserProfile>((p) => {
      p.avatarUrl = updatedValue.value;
      this.participant.setProfile(p);
    });
    this.updateStageProgression();
  }

  updateStageProgression() {
    this.participant.edit((user) => {
      user.allowedStageProgressionMap[user.workingOnStageName] = this.isComplete();
    });
  }
}
