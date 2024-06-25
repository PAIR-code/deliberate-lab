import { FirebaseApp, initializeApp } from 'firebase/app';
import {
    Auth,
    GoogleAuthProvider,
    connectAuthEmulator,
    getAuth
} from 'firebase/auth';
import {
    Firestore,
    Unsubscribe,
    connectFirestoreEmulator,
    getFirestore
} from 'firebase/firestore';
import {
    Functions,
    connectFunctionsEmulator,
    getFunctions
} from 'firebase/functions';
import { makeObservable } from "mobx";

import {
    FIREBASE_LOCAL_HOST_PORT_AUTH,
    FIREBASE_LOCAL_HOST_PORT_FIRESTORE,
    FIREBASE_LOCAL_HOST_PORT_FUNCTIONS
} from '../shared/constants';
import { FIREBASE_CONFIG } from '../shared/config';

import { Service } from "./service";

interface ServiceProvider {}

/** Manages Firebase connection, experiments subscription. */
export class FirebaseService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);

    this.app = initializeApp(FIREBASE_CONFIG);
    this.firestore = getFirestore(this.app);
    this.auth = getAuth(this.app);
    this.functions = getFunctions(this.app);

    //Only register emulators if in dev mode
    if (process.env.NODE_ENV === 'development'){
      this.registerEmulators();
    }


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
  unsubscribe: Unsubscribe[] = [];

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
