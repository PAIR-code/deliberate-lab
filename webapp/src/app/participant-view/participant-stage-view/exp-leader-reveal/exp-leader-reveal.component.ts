import { Component, Inject, Input, signal, Signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { injectQueryClient } from '@tanstack/angular-query-experimental';

import { ProviderService } from 'src/app/services/provider.service';
import { updateLeaderRevealStageMutation } from 'src/lib/api/mutations';
import { Participant } from 'src/lib/participant';
import { PARTICIPANT_PROVIDER_TOKEN } from 'src/lib/provider-tokens';
import { ExpStageVoteReveal } from 'src/lib/types/stages.types';
import { VoteReveal } from 'src/lib/types/votes.types';

@Component({
  selector: 'app-exp-leader-reveal',
  standalone: true,
  imports: [MatButtonModule],
  templateUrl: './exp-leader-reveal.component.html',
  styleUrl: './exp-leader-reveal.component.scss',
})
export class ExpLeaderRevealComponent {
  // Reload the internal logic dynamically when the stage changes
  @Input({ required: true })
  set stage(value: ExpStageVoteReveal) {
    this._stage = value;

    this.stageData = this.stage.config;
    this.everyoneReachedThisStage = this.participant.everyoneReachedCurrentStage(this.stage.name);
  }

  private queryClient = injectQueryClient();
  private mutationReveal = updateLeaderRevealStageMutation(this.queryClient, () =>
    this.participant.navigateToNextStage(),
  );

  get stage(): ExpStageVoteReveal {
    return this._stage as ExpStageVoteReveal;
  }

  private _stage?: ExpStageVoteReveal;

  public participant: Participant;
  public stageData: VoteReveal;

  public everyoneReachedThisStage: Signal<boolean>;
  public finalLeader: Signal<string>;

  constructor(
    @Inject(PARTICIPANT_PROVIDER_TOKEN) participantProvider: ProviderService<Participant>,
  ) {
    this.participant = participantProvider.get();
    this.stageData = this.stage?.config; // This will truly be initialized in ngOnInit. this.stage can be undefined here

    this.everyoneReachedThisStage = signal<boolean>(false);

    // TODO: use the new backend
    this.finalLeader = signal<string>('TODO');
  }

  nextStep() {
    this.mutationReveal.mutate({
      data: undefined,
      name: this.stage.name,
      ...this.participant.getStageProgression(),
      uid: this.participant.userData()!.uid,
    });
  }
}
