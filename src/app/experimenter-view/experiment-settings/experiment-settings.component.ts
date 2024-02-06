import { Component } from '@angular/core';
import { AppSettingsComponent } from 'src/app/app-settings/app-settings.component';

@Component({
  selector: 'app-experiment-settings',
  standalone: true,
  imports: [AppSettingsComponent],
  templateUrl: './experiment-settings.component.html',
  styleUrl: './experiment-settings.component.scss',
})
export class ExperimentSettingsComponent {}
