import { Component, Input, Signal, computed } from '@angular/core';
import { AppStateService } from '../services/app-state.service';
import { Experiment } from 'src/lib/staged-exp/data-model';
import { GoogleAuthService, Credential } from '../services/google-auth.service';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatMenuModule } from '@angular/material/menu';
import { ExperimentMonitorComponent } from './experiment-monitor/experiment-monitor.component';
import { ExperimentSettingsComponent } from './experiment-settings/experiment-settings.component';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-experimenter-view',
  standalone: true,
  imports: [
    MatIconModule,
    MatSidenavModule,
    MatMenuModule,
    MatListModule,
    MatButtonModule,
    RouterModule,
    MatButtonModule,
    ExperimenterViewComponent,
    FormsModule,
    MatInputModule,
    MatFormFieldModule,
    RouterModule,
    ExperimentMonitorComponent,
    ExperimentSettingsComponent,
  ],
  templateUrl: './experimenter-view.component.html',
  styleUrl: './experimenter-view.component.scss',
})
export class ExperimenterViewComponent {
  public experiments: Signal<Experiment[]>;
  constructor(public stateService: AppStateService) {
    this.experiments = computed(() => {
      return Object.values(this.stateService.data().experiments).sort((a, b) => {
        return a.name.localeCompare(b.name);
      });
    });
  }
}
