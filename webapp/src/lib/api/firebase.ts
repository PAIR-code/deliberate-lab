/** Firebase configuration */

import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';

import { environment } from 'src/environments/environment';

const firebaseConfig = {
  apiKey: 'AIzaSyC9Oh3TeTLSxMNkFLkBOOoLVs01kTHcDik',
  authDomain: 'friendlychat-d6dc5.firebaseapp.com',
  projectId: 'friendlychat-d6dc5',
  storageBucket: 'friendlychat-d6dc5.appspot.com',
  messagingSenderId: '550311295925',
  appId: '1:550311295925:web:cad179f7e3f9c390d5f7fc',
};

export const app = initializeApp(firebaseConfig);

export const firestore = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);

// Register the emulators when runnning in development mode
if (!environment.production) {
  connectFirestoreEmulator(firestore, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

export const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file'); // For Google drive
provider.addScope('https://www.googleapis.com/auth/spreadsheets'); // For Google sheets
