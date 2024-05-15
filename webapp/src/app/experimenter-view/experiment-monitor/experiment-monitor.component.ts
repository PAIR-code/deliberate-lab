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
import { deleteExperiment } from 'src/lib/api/mutations';
import { ExperimentRepository } from 'src/lib/repositories/experiment.repository';
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

    this.stages = computed(() =>
      Object.values(this.experiment()?.stageConfigMap ?? {}).map((s) => s()),
    );
  }

  deleteExperimentAndNavigate() {
    const experimentUid = this.experimentId();
    if (experimentUid && confirm('⚠️ This will delete the experiment! Are you sure?')) {
      deleteExperiment(experimentUid).then(() => {
        // Redirect to settings page.
        this.router.navigate(['/experimenter', 'settings']);
      });
    }
  }
}
