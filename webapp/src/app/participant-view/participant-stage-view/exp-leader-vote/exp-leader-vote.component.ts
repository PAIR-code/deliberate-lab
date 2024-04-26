/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, computed, Inject, Input, Signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { injectQueryClient } from '@tanstack/angular-query-experimental';
import { ProviderService } from 'src/app/services/provider.service';
import { updateLeaderVoteStageMutation } from 'src/lib/api/mutations';
import { Participant } from 'src/lib/participant';
import {
  EXPERIMENT_PROVIDER_TOKEN,
  ExperimentProvider,
  PARTICIPANT_PROVIDER_TOKEN,
} from 'src/lib/provider-tokens';

import { ParticipantExtended } from 'src/lib/types/participants.types';
import { ExpStageVotes } from 'src/lib/types/stages.types';
import { Vote, Votes } from 'src/lib/types/votes.types';
import { forbiddenValueValidator } from 'src/lib/utils/validators.utils';

@Component({
  selector: 'app-exp-leader-vote',
  templateUrl: './exp-leader-vote.component.html',
  styleUrl: './exp-leader-vote.component.scss',
  standalone: true,
  imports: [MatRadioModule, MatButtonModule, FormsModule, ReactiveFormsModule],
})
export class ExpLeaderVoteComponent {
  // Reload the internal logic dynamically when the stage changes
  @Input({ required: true })
  set stage(value: ExpStageVotes) {
    this._stage = value;
    this.voteConfig = this.stage.config;

    this.initializeForm();
  }

  get stage(): ExpStageVotes {
    return this._stage as ExpStageVotes;
  }

  private _stage?: ExpStageVotes;

  public otherParticipants: Signal<ParticipantExtended[]>;

  readonly Vote = Vote;

  public participant: Participant;
  public voteConfig: Votes;

  public votesForm: FormGroup;

  private client = injectQueryClient();

  // Vote completion mutation
  public voteMutation = updateLeaderVoteStageMutation(this.client, () =>
    this.participant.navigateToNextStage(),
  );

  constructor(
    @Inject(PARTICIPANT_PROVIDER_TOKEN) participantProvider: ProviderService<Participant>,
    @Inject(EXPERIMENT_PROVIDER_TOKEN) experimentProvider: ExperimentProvider,
    fb: FormBuilder,
  ) {
    this.participant = participantProvider.get();
    this.voteConfig = this.stage?.config;

    this.votesForm = fb.group({
      votes: fb.group({}),
    });

    this.otherParticipants = computed(
      () =>
        experimentProvider
          .get()()
          ?.participants.filter(({ uid }) => uid !== this.participant.userData()?.uid) ?? [],
    );

    toObservable(this.otherParticipants).subscribe(() => this.initializeForm());
  }

  get votes() {
    return this.votesForm.get('votes') as FormGroup;
  }

  get controls() {
    return this.votes.controls as Record<string, FormControl>;
  }

  resetVote(userId: string) {
    this.votes.controls[userId].setValue(Vote.NotRated);
  }

  /** Clear the form in order to replace its contents */
  clearForm() {
    Object.keys(this.votes.controls).forEach((key) => {
      this.votes.removeControl(key);
    });
  }

  nextStep() {
    this.voteMutation.mutate({
      data: this.votesForm.value.votes,
      name: this.stage.name,
      uid: this.participant.userData()!.uid,
      ...this.participant.getStageProgression(),
    });
  }

  /** Call this when the input or the other participants signal change in order to stay up to date */
  initializeForm() {
    this.clearForm();
    for (const p of this.otherParticipants()) {
      this.votes.addControl(
        p.uid,
        new FormControl(
          this.voteConfig[p.uid] || Vote.NotRated,
          forbiddenValueValidator(Vote.NotRated),
        ),
      );
    }
  }
}
