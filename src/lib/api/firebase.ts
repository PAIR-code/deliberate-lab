/** Firebase configuration */

import { FirebaseOptions, initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { environment } from 'src/environments/environment';

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

// Register the emulators when runnning in development mode
if (!environment.production) {
  connectFirestoreEmulator(firestore, 'localhost', 8080);
}
