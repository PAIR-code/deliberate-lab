/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, Inject, signal, Signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { ProviderService } from 'src/app/services/provider.service';
import { Participant } from 'src/lib/participant';
import { PARTICIPANT_PROVIDER_TOKEN } from 'src/lib/provider-tokens';

import { ParticipantExtended } from 'src/lib/types/participants.types';
import { StageKind } from 'src/lib/types/stages.types';
import { Vote, Votes } from 'src/lib/types/votes.types';

@Component({
  selector: 'app-exp-leader-vote',
  templateUrl: './exp-leader-vote.component.html',
  styleUrl: './exp-leader-vote.component.scss',
  standalone: true,
  imports: [MatRadioModule, MatButtonModule],
})
export class ExpLeaderVoteComponent {
  public otherParticipants: Signal<ParticipantExtended[]>;

  readonly Vote = Vote;

  public participant: Participant;
  public votes: Votes;

  constructor(
    @Inject(PARTICIPANT_PROVIDER_TOKEN) participantProvider: ProviderService<Participant>,
  ) {
    this.participant = participantProvider.get();

    const { config } = this.participant.assertViewingStageCast(StageKind.VoteForLeader)!;

    this.votes = config;

    // TODO: use new backend
    this.otherParticipants = signal([]);
    //  computed(() => {
    //   const thisUserId = this.participant.userData().uid;
    //   const allUsers = Object.values(this.participant.experiment().participants);
    //   return allUsers.filter((u) => u.uid !== thisUserId);
    // });

    // Make sure that votes has all other participants, and only them... if things
    // are configured fully in an experiment definition this is not needed.
    const otherParticipantsMap: { [userId: string]: ParticipantExtended } = {};
    for (const p of this.otherParticipants()) {
      otherParticipantsMap[p.uid] = p;
      if (!(p.uid in this.votes)) {
        this.votes[p.uid] = Vote.NotRated;
      }
    }
    Object.keys(this.votes).forEach((uid) => {
      if (!(uid in otherParticipantsMap)) {
        delete this.votes[uid];
      }
    });
  }

  // True when all other users have been voted on.
  isComplete() {
    let completed = true;
    this.otherParticipants().forEach((u) => {
      if (!(u.uid in this.votes) || this.votes[u.uid] === Vote.NotRated) {
        completed = false;
      }
    });
    return completed;
  }

  setVote(event: unknown, userId: string) {
    const { value } = event as { value: Vote };
    // if (this.isComplete()) {
    //   this.stateService.setStageComplete(true);
    // }
    this.votes[userId] = value;
    // TODO: use new backend
    // this.participant.editStageData(() => this.votes);
  }

  resetVote(userId: string) {
    this.votes[userId] = Vote.NotRated;
    // TODO: use new backend
    // this.participant.editStageData(() => this.votes);
  }
}
