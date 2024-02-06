/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Component, computed, Signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';

import { LeaderVote, StageKinds, UserData, Votes } from '../../../../lib/staged-exp/data-model';
import { AppStateService } from '../../../services/app-state.service';
import { Participant } from 'src/lib/staged-exp/participant';

@Component({
  selector: 'app-exp-leader-vote',
  templateUrl: './exp-leader-vote.component.html',
  styleUrl: './exp-leader-vote.component.scss',
  standalone: true,
  imports: [MatRadioModule, MatButtonModule],
})
export class ExpLeaderVoteComponent {
  public otherParticipants: Signal<UserData[]>;

  readonly LeaderVote = LeaderVote;

  public participant: Participant;
  public votes: Votes;

  constructor(private stateService: AppStateService) {
    const { participant, stageData } = this.stateService.getParticipantAndStage(
      StageKinds.voteForLeader,
    );
    this.votes = stageData();
    this.participant = participant;

    this.otherParticipants = computed(() => {
      const thisUserId = this.participant.userData().userId;
      const allUsers = Object.values(this.participant.experiment().participants);
      return allUsers.filter((u) => u.userId !== thisUserId);
    });

    // Make sure that votes has all other participants, and only them... if things
    // are configured fully in an experiment definition this is not needed.
    const otherParticipantsMap: { [userId: string]: UserData } = {};
    for (const p of this.otherParticipants()) {
      otherParticipantsMap[p.userId] = p;
      if (!(p.userId in this.votes)) {
        this.votes[p.userId] = LeaderVote.NOT_RATED;
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
      if (!(u.userId in this.votes) || this.votes[u.userId] === LeaderVote.NOT_RATED) {
        completed = false;
      }
    });
    return completed;
  }

  setVote(event: unknown, userId: string) {
    const { value } = event as { value: LeaderVote };
    // if (this.isComplete()) {
    //   this.stateService.setStageComplete(true);
    // }
    this.votes[userId] = value;
    this.participant.editStageData(() => this.votes);
  }

  resetVote(userId: string) {
    this.votes[userId] = LeaderVote.NOT_RATED;
    this.participant.editStageData(() => this.votes);
  }
}
