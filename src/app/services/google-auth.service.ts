/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an Apache2 license that can be
 * found in the LICENSE file and http://www.apache.org/licenses/LICENSE-2.0
==============================================================================*/

import { Injectable, NgZone, Signal, WritableSignal, computed, signal } from '@angular/core';
import * as jose from 'jose';
import { environment } from 'src/environments/environment';

interface LoginJWT {
  credential: string;
}

export interface Credential {
  aud: string; // Your server's client ID
  email: string; // The user's email address
  email_verified: boolean; // true, if Google has verified the email address
  iat: number; // Unix timestamp of the assertion's creation time
  exp: number; // Unix timestamp of the assertion's expiration time
  family_name: string;
  given_name: string;
  name: string; // full name
  hd: string; // If present, the host domain of the user's GSuite email address
  iss: string; // The JWT's issuer
  jti: string;
  locale: string; // e.g. "en-GB"
  nbf: number;
  picture: string; // If present, a URL to user's profile picture
  sub: string; // The unique ID of the user's Google Account
}

// function base64ToBytes(base64str: string): Uint8Array {
//   const binString = Buffer.from(base64str, 'base64');
//   return Uint8Array.from(binString, (m) => m.codePointAt(0));
// }

@Injectable({
  providedIn: 'root',
})
export class GoogleAuthService {
  public jwtCredential = signal<string | null>(null);
  public credential: Signal<Credential | null>;
  public tokenResponse = signal<google.accounts.oauth2.TokenResponse | null>(null);
  public googleGciClientLoaded: Promise<void>;
  public promptOnLoad = false;

  constructor(private ngZone: NgZone) {
    this.credential = computed(() => {
      const jwt = this.jwtCredential();
      if (!jwt) {
        return null;
      }
      const decodedToken = jose.decodeJwt(jwt) as Credential;
      return decodedToken;
    });

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    document.head.appendChild(script);

    this.googleGciClientLoaded = new Promise<void>(
      (resolve, reject) =>
        (script.onload = () => {
          resolve();
        }),
    ).then(() =>
      google.accounts.id.initialize({
        client_id: environment.oauthClientId,
        callback: (loginState: LoginJWT) => {
          this.ngZone.run(() => {
            this.jwtCredential.set(loginState.credential);
          });
        },
        auto_select: true,
      }),
    );
  }

  async getToken(scope: string): Promise<google.accounts.oauth2.TokenResponse | null> {
    let curToken = this.tokenResponse();
    if (!curToken || !google.accounts.oauth2.hasGrantedAllScopes(curToken, scope)) {
      curToken = await this.authorize(scope);
      this.tokenResponse.set(curToken);
    }
    console.log(curToken.expires_in);
    return curToken;
  }

  async authorize(scope: string): Promise<google.accounts.oauth2.TokenResponse> {
    return new Promise((resolve, reject) => {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: environment.oauthClientId,
        scope,
        callback: resolve,
      });
      tokenClient.requestAccessToken();
    });
  }

  logout() {
    const token = this.tokenResponse();
    if (!token) {
      return;
    }
    google.accounts.oauth2.revoke(token.access_token, () => {
      this.jwtCredential.set(null);
      this.tokenResponse.set(null);
    });
    // (done: any) => {
    // console.log(done);
    // console.log(done.successful);
    // console.log(done.error);
    // console.log(done.error_description);
  }

  // function start() {
  //   // 2. Initialize the JavaScript client library.
  //   gapi.client.init({
  //     'apiKey': 'YOUR_API_KEY',
  //     // Your API key will be automatically added to the Discovery Document URLs.
  //     'discoveryDocs': ['https://people.googleapis.com/$discovery/rest'],
  //     // clientId and scope are optional if auth is not required.
  //     'clientId': 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  //     'scope': 'profile',
  //   }).then(function () {
  //     // 3. Initialize and make the API request.
  //     return gapi.client.people.people.get({
  //       'resourceName': 'people/me',
  //       'requestMask.includeField': 'person.names'
  //     });
  //   }).then(function (response) {
  //     console.log(response.result);
  //   }, function (reason) {
  //     console.log('Error: ' + reason.result.error.message);
  //   });
  // };
  // // 1. Load the JavaScript client library.
  // gapi.load('client', start);
  // }

  async prompt() {
    await this.googleGciClientLoaded;
    google.accounts.id.prompt();
  }

  async renderLoginButton(element: HTMLElement) {
    await this.googleGciClientLoaded;
    google.accounts.id.renderButton(element, {
      type: 'standard',
      theme: 'outline',
      size: 'medium',
      width: 215,
    });
  }

  async signout() {
    await this.googleGciClientLoaded;

    google.accounts.id.disableAutoSelect();
  }

  // async addScope(scope: string) {
  //   if (scope in this.scopes) {
  //     return true;
  //   }
  //   // this.authorize([scope])
  // }

  // authorize(scopes: string[]): Promise<google.accounts.oauth2.TokenClient> {
  //   return new Promise((resolve, reject) => {
  //     this.tokenClient = google.accounts.oauth2.initTokenClient({
  //       client_id: environment.oauthClientId,
  //       scope: scopes.join(','),
  //       // 'https://www.googleapis.com/auth/spreadsheets.readonly',
  //       callback: (tokenResponse) => {
  //         if (tokenResponse && tokenResponse.access_token) {
  //           this.tokenResponse.set(tokenResponse);
  //           if (google.accounts.oauth2.hasGrantedAllScopes(tokenResponse,
  //             'https://www.googleapis.com/auth/spreadsheets.readonly')) {
  //             console.log('user already has sheets permission');
  //             return;
  //           }
  //         }
  //         console.log('user said no to sheets permissions.');
  //         return;
  //       }
  //     });
  //     this.tokenClient.requestAccessToken();

  //     resolve(this.tokenClient);
  //   });
  // }
}
