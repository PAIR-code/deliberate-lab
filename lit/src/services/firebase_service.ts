import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  Auth,
  User
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  Firestore
} from 'firebase/firestore';
import {
  connectFunctionsEmulator,
  getFunctions,
  Functions
} from 'firebase/functions';

import {
  FIREBASE_CONFIG,
  FIREBASE_LOCAL_HOST_PORT_FIRESTORE,
  FIREBASE_LOCAL_HOST_PORT_AUTH,
  FIREBASE_LOCAL_HOST_PORT_FUNCTIONS
} from '../shared/constants';

import { Service } from "./service";

interface ServiceProvider {}

export class FirebaseService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();

    this.app = initializeApp(FIREBASE_CONFIG);
    this.firestore = getFirestore(this.app);
    this.auth = getAuth(this.app);
    this.functions = getFunctions(this.app);

    // TODO: Only register emulators if in dev mode
    this.registerEmulators();

    // Set up auth provider and scope
    this.provider = new GoogleAuthProvider();
    this.provider.addScope('https://www.googleapis.com/auth/drive.file');
    this.provider.addScope('https://www.googleapis.com/auth/spreadsheets');
  }

  app: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  functions: Functions;
  provider: GoogleAuthProvider;

  registerEmulators() {
    connectFirestoreEmulator(
      this.firestore,
      'localhost',
      FIREBASE_LOCAL_HOST_PORT_FIRESTORE
    );
    connectAuthEmulator(
      this.auth,
      `http://localhost:${FIREBASE_LOCAL_HOST_PORT_AUTH}`
    );
    connectFunctionsEmulator(
      this.functions,
      'localhost',
      FIREBASE_LOCAL_HOST_PORT_FUNCTIONS
    );
  }
}
