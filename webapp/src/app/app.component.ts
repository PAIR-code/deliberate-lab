/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import {
  AfterViewInit,
  Component,
  ElementRef,
  Signal,
  ViewChild,
  computed,
  effect,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AppStateService } from './services/app-state.service';
import { GoogleAuthService } from './services/google-auth.service';
import { Experiment } from 'src/lib/staged-exp/data-model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  constructor(public stateService: AppStateService) {
    effect(() => {
      document.title = `Experiment: ${this.stateService.appName()}`;
    });
  }
}
