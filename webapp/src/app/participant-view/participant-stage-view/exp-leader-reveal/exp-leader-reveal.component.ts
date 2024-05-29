import { Component, computed, Inject, signal, Signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  assertCast,
  ParticipantProfile,
  StageKind,
  VoteForLeaderStagePublicData,
} from '@llm-mediation-experiments/utils';
import { CastViewingStage, ParticipantService } from 'src/app/services/participant.service';
import { ChatUserProfileComponent } from '../exp-chat/chat-user-profile/chat-user-profile.component';

@Component({
  selector: 'app-exp-leader-reveal',
  standalone: true,
  imports: [MatButtonModule, ChatUserProfileComponent],
  templateUrl: './exp-leader-reveal.component.html',
  styleUrl: './exp-leader-reveal.component.scss',
})
export class ExpLeaderRevealComponent {
  public everyoneReachedThisStage: Signal<boolean>;
  public results: Signal<VoteForLeaderStagePublicData | undefined> = signal(undefined);
  public winner: Signal<ParticipantProfile | undefined> = signal(undefined);

  constructor(
    @Inject('stage') public stage: CastViewingStage<StageKind.RevealVoted>,
    @Inject('hidden') public hidden: Signal<boolean>,
    private participantService: ParticipantService,
  ) {
    this.everyoneReachedThisStage = computed(() =>
      this.participantService.experiment()!.everyoneReachedStage(this.stage.config().name)(),
    );

    // Extract results from the public vote for leader stage data
    this.results = computed(() =>
      assertCast(
        this.participantService.experiment()!.publicStageDataMap[
          this.stage.config().pendingVoteStageName
        ]!(),
        StageKind.VoteForLeader,
      ),
    );

    this.winner = computed(() => {
      return this.participantService.experiment()?.experiment()?.participants[
        this.results()!.currentLeader!
      ];
    });
  }

  async nextStep() {
    await this.participantService.workOnNextStage();
  }
}
