import { Component, Input, Signal, WritableSignal, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink, RouterLinkActive, RouterModule } from '@angular/router';
import { AppStateService } from 'src/app/services/app-state.service';

import { HttpClient } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { injectQueryClient } from '@tanstack/angular-query-experimental';
import { isOfKind } from 'src/lib/algebraic-data';
import { deleteExperimentMutation } from 'src/lib/api/mutations';
import { experimentQuery } from 'src/lib/api/queries';
import { StageKinds } from 'src/lib/staged-exp/data-model';
import { QueryType } from 'src/lib/types/api.types';
import { ExperimentExtended } from 'src/lib/types/experiments.types';
import { ParticipantExtended, ParticipantProfile } from 'src/lib/types/participants.types';
import { MediatorChatComponent } from '../mediator-chat/mediator-chat.component';

// TODO: generalise into a sensible class for viewing all relevant info on
// where participants are at w.r.t. this stage.
export interface StageState {
  name: string;
  kind: StageKinds;
  participants: ParticipantProfile[];
}

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
  http = inject(HttpClient);
  queryClient = injectQueryClient();

  // Experiment deletion mutation
  rmExperiment = deleteExperimentMutation(this.http, this.queryClient);

  public experimentUid: WritableSignal<string | null> = signal(null);
  public _experiment: QueryType<ExperimentExtended | null>;
  public participants: Signal<ParticipantExtended[]>;

  @Input()
  // This one is set by the route parameter
  set experiment(name: string) {
    this.experimentUid.set(name);
  }

  public stageStates: Signal<StageState[]>;

  isOfKind = isOfKind;
  readonly StageKinds = StageKinds;

  constructor(
    public stateService: AppStateService,
    public router: Router,
  ) {
    // Prepare the request
    this._experiment = experimentQuery(this.http, this.experimentUid);

    // Extract participants data from the extended experiment
    this.participants = computed(() => {
      const data = this._experiment.data();

      if (!data) {
        return [];
      }
      return Object.values(data.participants);
    });

    // TODO: factor into service?
    this.stageStates = computed(() => {
      const participant0 = this.participants()[0];
      const stageStateMap: Record<string, StageState> = {};
      const stageStates: StageState[] = [
        ...participant0.completedStageNames,
        participant0.workingOnStageName,
        ...participant0.futureStageNames,
      ].map((name) => {
        const kind = participant0.stageMap[name].kind;
        return {
          name,
          kind,
          participants: [],
        };
      });
      stageStates.forEach((s) => (stageStateMap[s.name] = s));
      this.participants().forEach((p) => {
        if (p.workingOnStageName in stageStateMap) {
          stageStateMap[p.workingOnStageName].participants.push(p);
        } else {
          throw new Error(`stage not in the first participants stages: ${p.workingOnStageName}`);
        }
      });
      return stageStates;
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
