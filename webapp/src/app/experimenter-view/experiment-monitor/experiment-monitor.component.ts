import { Component, Inject, Input, Signal, WritableSignal, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink, RouterLinkActive, RouterModule } from '@angular/router';

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { injectQueryClient } from '@tanstack/angular-query-experimental';
import { ProviderService } from 'src/app/services/provider.service';
import { isOfKind } from 'src/lib/algebraic-data';
import { deleteExperimentMutation } from 'src/lib/api/mutations';
import { experimentQuery } from 'src/lib/api/queries';
import { EXPERIMENT_PROVIDER_TOKEN, ExperimentProvider } from 'src/lib/provider-tokens';
import { QueryType } from 'src/lib/types/api.types';
import { ExperimentExtended } from 'src/lib/types/experiments.types';
import { ParticipantExtended } from 'src/lib/types/participants.types';
import { ExpStage, StageKind } from 'src/lib/types/stages.types';
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
  providers: [
    {
      provide: EXPERIMENT_PROVIDER_TOKEN,
      useFactory: () => new ProviderService<Signal<ExperimentExtended | undefined>>(),
    },
  ],
  templateUrl: './experiment-monitor.component.html',
  styleUrl: './experiment-monitor.component.scss',
})
export class ExperimentMonitorComponent {
  queryClient = injectQueryClient();

  // Experiment deletion mutation
  rmExperiment = deleteExperimentMutation(this.queryClient);

  public experimentUid: WritableSignal<string | null> = signal(null);
  public _experiment: QueryType<ExperimentExtended>;
  public participants: Signal<ParticipantExtended[]>;

  @Input()
  // This one is set by the route parameter
  set experiment(name: string) {
    this.experimentUid.set(name);
  }

  isOfKind = isOfKind;
  readonly StageKind = StageKind;
  public expStages: Signal<ExpStage[]>;

  constructor(
    public router: Router,
    @Inject(EXPERIMENT_PROVIDER_TOKEN) experimentProvider: ExperimentProvider,
  ) {
    // Prepare the request
    this._experiment = experimentQuery(this.experimentUid);
    experimentProvider.set(this._experiment.data); // Expose the current experiment through the provider

    // Extract participants data from the extended experiment
    this.participants = computed(() => this._experiment.data()?.participants ?? []);

    this.expStages = computed(() => {
      const p = this.participants()[0];
      return p ? Object.values(p.stageMap) : [];
    });
  }

  deleteExperiment() {
    const experimentUid = this.experimentUid();
    if (experimentUid !== null && confirm('⚠️ This will delete the experiment! Are you sure?')) {
      this.rmExperiment.mutate(experimentUid);

      // Redirect to settings page.
      this.router.navigate(['/experimenter', 'settings']);
    }
  }
}
