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
  computed,
  effect,
  ElementRef,
  Signal,
  ViewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { ExpChatComponent } from '../participant-view/participant-stage-view/exp-chat/exp-chat.component';
import { ExpLeaderRevealComponent } from '../participant-view/participant-stage-view/exp-leader-reveal/exp-leader-reveal.component';
import { ExpLeaderVoteComponent } from '../participant-view/participant-stage-view/exp-leader-vote/exp-leader-vote.component';
import { ExpProfileComponent } from '../participant-view/participant-stage-view/exp-profile/exp-profile.component';
//import { ExpRatingComponent } from '../exp-rating/exp-rating.component';
import { ExpSurveyComponent } from '../participant-view/participant-stage-view/exp-survey/exp-survey.component';
import { ExpTosAndProfileComponent } from '../participant-view/participant-stage-view/exp-tos-and-profile/exp-tos-and-profile.component';
import { ExpTosComponent } from '../participant-view/participant-stage-view/exp-tos/exp-tos.component';
import { AppStateService } from '../services/app-state.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { GoogleAuthService } from '../services/google-auth.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Experiment } from 'src/lib/staged-exp/data-model';
import { ExperimenterViewComponent } from '../experimenter-view/experimenter-view.component';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    MatFormFieldModule,
    ExpChatComponent,
    ExpLeaderVoteComponent,
    ExpProfileComponent,
    //ExpRatingComponent,
    ExpSurveyComponent,
    ExpTosAndProfileComponent,
    ExpLeaderRevealComponent,
    ExpTosComponent,
    MatButtonModule,
    ExperimenterViewComponent,
    FormsModule,
    MatInputModule,
    RouterModule,
  ],
  templateUrl: './app-home.component.html',
  styleUrls: ['./app-home.component.scss'],
})
export class AppHomeComponent implements AfterViewInit {
  @ViewChild('googleButton') googleButton!: ElementRef<HTMLElement>;

  public error: string = '';

  public experiments: Signal<Experiment[]>;

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    public stateService: AppStateService,
    public authService: GoogleAuthService,
  ) {
    this.experiments = computed(() => {
      console.log(this.stateService.data());
      return Object.values(this.stateService.data().experiments).sort((a, b) => {
        console.log(a);
        console.log(b);
        return a.name.localeCompare(b.name);
      });
    });

    effect(() => {
      document.title = `Experiment: ${this.stateService.appName()}`;
    });
  }

  async joinExperiment(accessCode: string) {
    this.error = '';
    const parts = accessCode.split('/');
    console.log(parts);
    const userid = parts.pop();
    console.log(userid);
    console.log(parts);
    const experimentName = parts.join('');
    console.log(experimentName);

    if (!userid || !experimentName) {
      this.error = 'Bad access code';
      return;
    } else {
      console.log('navigate');
      await this.router.navigate(['/participant', experimentName, userid]);
      console.log('navigated');
    }
  }

  ngAfterViewInit() {
    // TODO: enable this to login automatically when app starts.
    // also uncomment stuff in html.
    // this.authService.prompt();

    // If already authenticated, this does not exist.
    console.log(this.googleButton);
    if (this.googleButton) {
      this.authService.renderLoginButton(this.googleButton.nativeElement);
    }
  }

  clearError() {
    this.error = '';
  }
}
