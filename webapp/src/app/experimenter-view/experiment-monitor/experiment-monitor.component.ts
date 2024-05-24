import { Component, Input, Signal, WritableSignal, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink, RouterLinkActive, RouterModule } from '@angular/router';

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  ParticipantProfileExtended,
  StageConfig,
  StageKind,
  isOfKind,
} from '@llm-mediation-experiments/utils';
import { AppStateService } from 'src/app/services/app-state.service';
import { ExperimentRepository } from 'src/lib/repositories/experiment.repository';
import { bindSignalReRender } from 'src/lib/utils/angular.utils';
import { MediatorChatComponent } from '../mediator-chat/mediator-chat.component';

@Component({
  selector: 'app-experiment-monitor',
  standalone: true,
  imports: [
    RouterModule,
    RouterLink,
    RouterLinkActive,
    MediatorChatComponent,
    MatButtonModule,
    MatExpansionModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './experiment-monitor.component.html',
  styleUrl: './experiment-monitor.component.scss',
})
export class ExperimentMonitorComponent {
  public _experimentId: WritableSignal<string | undefined> = signal(undefined);

  @Input()
  // This one is set by the route parameter
  set experimentId(name: string | undefined) {
    this._experimentId.set(name);
  }

  get experimentId(): Signal<string | undefined> {
    return this._experimentId;
  }

  readonly isOfKind = isOfKind;
  readonly StageKind = StageKind;

  // Helper computed signals
  participants: Signal<ParticipantProfileExtended[]>;
  experiment: Signal<ExperimentRepository | undefined>;
  stages: Signal<StageConfig[]>;
  participantsPerStage: Signal<Record<string, number | undefined>>;

  constructor(
    public router: Router,
    public appState: AppStateService,
  ) {
    // Fetch the participants for this experiment, and dynamically change the list when the experiment changes.
    this.participants = computed(() => {
      const experimentId = this.experimentId();
      if (!experimentId) return [];
      return appState.experimenter.get().experimentParticipants.get(experimentId)();
    });

    // Get the related experiment repository
    this.experiment = computed(() => {
      const experimentId = this.experimentId();
      if (!experimentId) return undefined;
      return appState.experiments.get({ experimentId });
    });

    this.participantsPerStage = computed(() => {
      return this.participants().reduce(
        (acc, p) => {
          acc[p.workingOnStageName] = (acc[p.workingOnStageName] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );
    });

    this.stages = computed(() =>
      Object.values(this.experiment()?.stageConfigMap ?? {}).map((s) => s()),
    );

    // Fix experiment loading on first login
    bindSignalReRender(this.participants);
  }

  async deleteExperimentAndNavigate() {
    const experiment = this.experiment();
    if (experiment && confirm('⚠️ This will delete the experiment! Are you sure?')) {
      await experiment.delete();
      await this.router.navigate(['/experimenter', 'settings']); // Redirect to settings page.
    }
  }
}

// TODO : agregate the participants per stage into a sort of record / signal ? / record of signals ?
