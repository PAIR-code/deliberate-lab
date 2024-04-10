import { reverse, sortBy } from 'lodash';

import { Component, computed, Signal } from '@angular/core';

import { Participant } from 'src/lib/staged-exp/participant';
import { StageKind } from 'src/lib/types/stages.types';
import { VoteReveal, Votes } from 'src/lib/types/votes.types';
import { AppStateService } from '../../../services/app-state.service';

@Component({
  selector: 'app-exp-leader-reveal',
  standalone: true,
  imports: [],
  templateUrl: './exp-leader-reveal.component.html',
  styleUrl: './exp-leader-reveal.component.scss',
})
export class ExpLeaderRevealComponent {
  public participant: Participant;
  public stageData: VoteReveal;

  public everyoneReachedTheEnd: Signal<boolean>;
  public finalLeader: Signal<string>;

  constructor(private stateService: AppStateService) {
    const { participant, stageData } = this.stateService.getParticipantAndStage(
      StageKind.RevealVoted,
    );
    this.stageData = stageData() as VoteReveal; // TODO: temporary fix
    this.participant = participant;

    this.everyoneReachedTheEnd = computed(() => {
      const users = Object.values(this.participant.experiment().participants);
      const isReady = users
        .map((userData) => userData.futureStageNames.length)
        .every((n) => n === 1);
      // Allow "Next" to be pushed.
      if (isReady) {
        for (const user of users) {
          user.allowedStageProgressionMap[user.workingOnStageName] = true;
        }
      }
      return isReady;
    });

    this.finalLeader = computed(() => {
      const users = Object.values(this.participant.experiment().participants);
      const votes: { [userId: string]: number } = {};
      users.forEach(({ uid }) => {
        votes[uid] = 0;
      });

      for (const user of users) {
        const leaderVotes = user.stageMap[this.stageData.pendingVoteStageName].config as Votes;
        for (const userId of Object.keys(leaderVotes)) {
          const vote = leaderVotes[userId];
          if (vote === 'positive') {
            votes[userId] += 1;
          } else if (vote === 'negative') {
            votes[userId] -= 1;
          } else if (vote === 'neutral') {
            votes[userId] += 0;
          }
        }
      }

      const sorted = reverse(
        sortBy(
          Object.entries(votes).map(([userId, vote]) => ({ userId, vote })),
          ['vote'],
        ),
      );

      return sorted[0].userId;
    });
  }
}
