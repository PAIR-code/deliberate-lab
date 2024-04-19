/** Firebase configuration */

import { Router } from '@angular/router';
import { FirebaseOptions, initializeApp } from 'firebase/app';
import { User, connectAuthEmulator, getAuth, onAuthStateChanged } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { environment } from 'src/environments/environment';
import { OnSuccess } from '../types/api.types';

// TODO: integrate with environment config when deploying to production
const firebaseConfig: FirebaseOptions = {
  apiKey: 'your-api-key',
  authDomain: 'your-project-id.firebaseapp.com',
  projectId: 'llm-mediator-political',
  storageBucket: 'your-project-id.appspot.com',
  messagingSenderId: 'your-sender-id',
  appId: 'your-app-id',
};

export const app = initializeApp(firebaseConfig);

export const firestore = getFirestore(app);
export const auth = getAuth(app);

// Register the emulators when runnning in development mode
if (!environment.production) {
  connectFirestoreEmulator(firestore, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
}

/** Put this authentication handler on every entrypoint component (home, experimenter home, participant home) */
export const authenticationHandler = (
  router: Router,
  onLogin?: OnSuccess<User>,
  onLogout?: OnSuccess<unknown>,
) =>
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      onLogin?.(user);
      // User is signed in, navigate to the appropriate page.
      const { claims } = await user.getIdTokenResult();
      if (claims['role'] === 'participant') {
        router.navigate(['/participant', claims['participantId']]);
      } else if (claims['role'] === 'experimenter') {
        router.navigate(['/experimenter']);
      }
    } else {
      onLogout?.(undefined);
      // No user is signed in, navigate back to home
      router.navigate(['/']);
    }
  });
