import { Injectable, OnDestroy, Signal, WritableSignal, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Unsubscribe, User, onAuthStateChanged } from 'firebase/auth';
import { environment } from 'src/environments/environment';
import { auth } from 'src/lib/api/firebase';

// NOTE: if using gapi to save files to google drive is REALLY necessary, modify the authentication this way:
// https://stackoverflow.com/a/74822511

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

/**
 * All about Firebase authentication and user management exposed as a service.
 * See firebase.ts for the actual Firebase setup (that does not need to be a service).
 */
@Injectable({
  providedIn: 'root',
})
export class FirebaseService implements OnDestroy {
  unsubscribeAuth: Unsubscribe;

  // User authentication data
  private _user: WritableSignal<User | null> = signal(null);
  public get user() {
    // Expose the current user safely as a non-writable signal
    return this._user as Signal<User | null>;
  }

  // Gapi client state
  private gapiClientLoaded = new Promise<void>((resolve) => {
    gapi.load('client', async () => {
      await gapi.client.init({
        apiKey: environment.driveApiKey,
        discoveryDocs: [DISCOVERY_DOC],
      });
      resolve();
    });
  });

  constructor(router: Router) {
    // Subscribe to auth state changes & navigate to the appropriate page when the user is signed in
    this.unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in, navigate to the appropriate page.
        const { claims } = await user.getIdTokenResult();
        if (claims['role'] === 'participant') {
          router.navigate(['/participant', claims['participantId']]);
        } else if (claims['role'] === 'experimenter') {
          router.navigate(['/experimenter']);
        }
      } else {
        // No user is signed in, navigate back to home
        router.navigate(['/']);
      }
      this._user.set(user);
    });

    auth.currentUser;
  }

  // TODO: implement gapi auth if this function must be used
  async createAndUploadJsonFile(jsonData: string) {
    await this.gapiClientLoaded;

    const fileMetadata = {
      name: 'example.json',
      mimeType: 'application/json',
    };

    const boundary = 'foo_bar_baz';
    const delimiter = '--' + boundary + '\r\n';
    const closeDelim = '\r\n--' + boundary + '--';

    const requestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(fileMetadata) +
      '\r\n' +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      jsonData +
      '\r\n' +
      closeDelim;

    const request = gapi.client.request({
      path: '/upload/drive/v3/files',
      method: 'POST',
      params: { uploadType: 'multipart' },
      headers: {
        'Content-Type': 'multipart/related; boundary="' + boundary + '"',
      },
      body: requestBody,
    });

    request.execute(function (file) {
      if (file.result && file.result.error) {
        console.error('Error uploading file:', file.result.error);
      } else {
        console.log('File created successfully on Google Drive:', file);
      }
    });
  }

  ngOnDestroy() {
    this.unsubscribeAuth();
  }
}
