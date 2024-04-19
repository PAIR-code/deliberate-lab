/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { GoogleAuthProvider, Unsubscribe, signInWithPopup, signOut } from 'firebase/auth';

import { ExpChatComponent } from '../participant-view/participant-stage-view/exp-chat/exp-chat.component';
import { ExpLeaderRevealComponent } from '../participant-view/participant-stage-view/exp-leader-reveal/exp-leader-reveal.component';
import { ExpLeaderVoteComponent } from '../participant-view/participant-stage-view/exp-leader-vote/exp-leader-vote.component';
//import { ExpRatingComponent } from '../exp-rating/exp-rating.component';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterModule } from '@angular/router';
import { auth, authenticationHandler } from 'src/lib/api/firebase';
import { loginMutation } from 'src/lib/api/mutations';
import { ExperimenterViewComponent } from '../experimenter-view/experimenter-view.component';
import { ExpSurveyComponent } from '../participant-view/participant-stage-view/exp-survey/exp-survey.component';
import { ExpTosAndProfileComponent } from '../participant-view/participant-stage-view/exp-tos-and-profile/exp-tos-and-profile.component';
import { GoogleAuthService } from '../services/google-auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    MatFormFieldModule,
    ExpChatComponent,
    ExpLeaderVoteComponent,
    //ExpRatingComponent,
    ExpSurveyComponent,
    ExpTosAndProfileComponent,
    ExpLeaderRevealComponent,
    MatButtonModule,
    ExperimenterViewComponent,
    FormsModule,
    MatInputModule,
    RouterModule,
    MatCardModule,
    ReactiveFormsModule,
  ],
  templateUrl: './app-home.component.html',
  styleUrls: ['./app-home.component.scss'],
})
export class AppHomeComponent implements AfterViewInit, OnDestroy {
  @ViewChild('googleButton') googleButton!: ElementRef<HTMLElement>;

  public error: string = '';
  public login = new FormControl('', Validators.required);
  public loginMut = loginMutation(undefined, () => (this.error = 'Invalid credentials.'));
  public authenticated = signal(false); // If an user is authenticated and still on this page, their account is not valid.

  private unsubscribe: Unsubscribe;

  constructor(
    public router: Router,
    public authService: GoogleAuthService,
  ) {
    this.unsubscribe = authenticationHandler(
      router,
      () => this.authenticated.set(true),
      () => this.authenticated.set(false),
    );
  }

  async loginPalabrate() {
    this.error = '';
    this.loginMut.mutate(this.login.value as string);
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

  loginWithGoogle() {
    signInWithPopup(auth, new GoogleAuthProvider());
  }

  logout() {
    signOut(auth);
  }

  ngOnDestroy() {
    this.unsubscribe();
  }
}
