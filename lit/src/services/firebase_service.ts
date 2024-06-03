import { computed, observable, makeObservable } from "mobx";
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
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  DocumentData,
  getFirestore,
  Firestore,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import {
  connectFunctionsEmulator,
  Functions,
  getFunctions,
  httpsCallable
} from 'firebase/functions';
import {
  CreationResponse,
  Experiment,
  ExperimentCreationData,
  StageConfig
} from '@llm-mediation-experiments/utils';

import {
  FIREBASE_CONFIG,
  FIREBASE_LOCAL_HOST_PORT_FIRESTORE,
  FIREBASE_LOCAL_HOST_PORT_AUTH,
  FIREBASE_LOCAL_HOST_PORT_FUNCTIONS
} from '../shared/constants';
import { Snapshot } from "../shared/types";
import { collectSnapshotWithId, extractDataFromCallable } from "../shared/utils";

import { Service } from "./service";
import { RouterService } from "./router_service";

interface ServiceProvider {
  routerService: RouterService;
}

/** Manages Firebase connection, experiments subscription. */
export class FirebaseService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);

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
