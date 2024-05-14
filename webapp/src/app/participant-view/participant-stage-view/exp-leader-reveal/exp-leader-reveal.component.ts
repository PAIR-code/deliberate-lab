import { Component, computed, Input, signal, Signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  assertCast,
  StageKind,
  VoteForLeaderStagePublicData,
} from '@llm-mediation-experiments/utils';
import { CastViewingStage, ParticipantService } from 'src/app/services/participant.service';

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
  set stage(value: CastViewingStage<StageKind.RevealVoted>) {
    this._stage = value;

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
  }

  get stage() {
    return this._stage as CastViewingStage<StageKind.RevealVoted>;
  }

  private _stage?: CastViewingStage<StageKind.RevealVoted>;

  public everyoneReachedThisStage: Signal<boolean>;
  public results: Signal<VoteForLeaderStagePublicData | undefined> = signal(undefined);

  constructor(private participantService: ParticipantService) {
    this.everyoneReachedThisStage = signal(false);
  }

  nextStep() {
    // TODO: use the new backend
  }
}
