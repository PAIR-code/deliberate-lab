import { Component, Inject, Input, signal, Signal } from '@angular/core';

import { ProviderService } from 'src/app/services/provider.service';
import { Participant } from 'src/lib/participant';
import { PARTICIPANT_PROVIDER_TOKEN } from 'src/lib/provider-tokens';
import { ExpStageVoteReveal } from 'src/lib/types/stages.types';
import { VoteReveal } from 'src/lib/types/votes.types';

@Component({
  selector: 'app-exp-leader-reveal',
  standalone: true,
  imports: [],
  templateUrl: './exp-leader-reveal.component.html',
  styleUrl: './exp-leader-reveal.component.scss',
})
export class ExpLeaderRevealComponent {
  // Reload the internal logic dynamically when the stage changes
  @Input({ required: true })
  set stage(value: ExpStageVoteReveal) {
    this._stage = value;

    this.stageData = this.stage.config;
  }

  get stage(): ExpStageVoteReveal {
    return this._stage as ExpStageVoteReveal;
  }

  private _stage?: ExpStageVoteReveal;

  public participant: Participant;
  public stageData: VoteReveal;

  public everyoneReachedTheEnd: Signal<boolean>;
  public finalLeader: Signal<string>;

  constructor(
    @Inject(PARTICIPANT_PROVIDER_TOKEN) participantProvider: ProviderService<Participant>,
  ) {
    this.participant = participantProvider.get();
    this.stageData = this.stage?.config; // This will truly be initialized in ngOnInit. this.stage can be undefined here

    // TODO: use the new backend way of syncing participant progression
    this.everyoneReachedTheEnd = signal<boolean>(false);
    //  computed(() => {
    //   const users = Object.values(this.participant.experiment().participants);
    //   const isReady = users
    //     .map((userData) => userData.futureStageNames.length)
    //     .every((n) => n === 1);
    //   // Allow "Next" to be pushed.
    //   if (isReady) {
    //     for (const user of users) {
    //       user.allowedStageProgressionMap[user.workingOnStageName] = true;
    //     }
    //   }
    //   return isReady;
    // });

    // TODO: use the new backend
    this.finalLeader = signal<string>('');
    //  computed(() => {
    //   const users = Object.values(this.participant.experiment().participants);
    //   const votes: { [userId: string]: number } = {};
    //   users.forEach(({ uid }) => {
    //     votes[uid] = 0;
    //   });

    //   for (const user of users) {
    //     const leaderVotes = user.stageMap[this.stageData.pendingVoteStageName].config as Votes;
    //     for (const userId of Object.keys(leaderVotes)) {
    //       const vote = leaderVotes[userId];
    //       if (vote === 'positive') {
    //         votes[userId] += 1;
    //       } else if (vote === 'negative') {
    //         votes[userId] -= 1;
    //       } else if (vote === 'neutral') {
    //         votes[userId] += 0;
    //       }
    //     }
    //   }

    //   const sorted = reverse(
    //     sortBy(
    //       Object.entries(votes).map(([userId, vote]) => ({ userId, vote })),
    //       ['vote'],
    //     ),
    //   );

    //   return sorted[0].userId;
    // });
  }
}
