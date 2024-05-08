import { Component, Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSidenavModule } from '@angular/material/sidenav';
import { RouterModule } from '@angular/router';
import { Experiment } from '@llm-mediation-experiments/utils';
import { signOut } from 'firebase/auth';
import { auth } from 'src/lib/api/firebase';
import { AppStateService } from '../services/app-state.service';
import { ExperimentMonitorComponent } from './experiment-monitor/experiment-monitor.component';
import { ExperimentSettingsComponent } from './experiment-settings/experiment-settings.component';

@Component({
  selector: 'app-experimenter-view',
  standalone: true,
  imports: [
    MatProgressSpinnerModule,
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
  experiments: Signal<Experiment[]>;

  constructor(public readonly appState: AppStateService) {
    this.experiments = appState.experimenter.get().experiments;
  }

  logout() {
    signOut(auth);
  }
}
