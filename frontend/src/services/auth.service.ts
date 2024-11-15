import { computed, makeObservable, observable } from "mobx";
import {
  Auth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';

import { Service } from "./service";
import { AdminService } from "./admin.service";
import { FirebaseService } from "./firebase.service";
import { HomeService } from "./home.service";

import {
  ExperimenterProfile,
  ExperimenterData,
  createExperimenterData
} from '@deliberation-lab/utils';

interface ServiceProvider {
  adminService: AdminService;
  firebaseService: FirebaseService;
  homeService: HomeService;
}

export class AuthService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);

    onAuthStateChanged(this.sp.firebaseService.auth, async (user: User | null) => {
      if (user) {
        // User is signed in, see docs for a list of available properties
        // https://firebase.google.com/docs/reference/js/auth.user
        this.user = user;

        const allowlistDoc = await getDoc(
          doc(this.sp.firebaseService.firestore, 'allowlist', user.email ?? '')
        );

        if (allowlistDoc.exists()) {
          this.isExperimenter = true;
          this.subscribe();
          this.writeExperimenterProfile(user);
          this.sp.homeService.subscribe();

          // TODO: Read allowlistDoc.data() to determine if admin
          // If admin, subscribe
          this.sp.adminService.subscribe();
        } else {
          this.isExperimenter = false;
        }
      } else {
        // User is signed out
        this.user = null;
        this.isExperimenter = null;
      }
    });
  }

  @observable user: User|null|undefined = undefined;
  @observable isExperimenter: boolean|null = null;
  @observable canEdit = false;

  @observable private debugMode = true;

  @observable unsubscribe: Unsubscribe[] = [];
  @observable experimenterData: ExperimenterData|null = null;
  @observable isExperimentDataLoading = false;

  @computed get userId() {
    return this.user?.uid;
  }

  @computed get initialAuthCheck() {
    return this.user !== undefined;
  }

  @computed get authenticated() {
    return this.initialAuthCheck && this.user !== null;
  }

  // If true and is experimenter, show debugging components
  // in experimenter preview
  @computed get isDebugMode() {
    return this.isExperimenter && this.debugMode;
  }

  setDebugMode(debugMode: boolean) {
    this.debugMode = debugMode;
  }

  subscribe() {
    this.unsubscribeAll();
    this.isExperimentDataLoading = true;

    // Subscribe to user's experimenter data
    if (!this.userId) return;
    this.unsubscribe.push(
      onSnapshot(
        doc(this.sp.firebaseService.firestore, 'experimenterData', this.userId),
        (doc) => {
          if (!doc.exists()) {
            this.writeExperimenterData(createExperimenterData(this.userId!));
          } else {
            this.experimenterData = doc.data() as ExperimenterData;
          }
          this.isExperimentDataLoading = false;
        }
      )
    );
  }

  unsubscribeAll() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.unsubscribe = [];
    this.experimenterData = null;
  }

  setEditPermissions(canEdit: boolean) {
    this.canEdit = !this.isExperimenter ? false : canEdit;
  }

  signInWithGoogle() {
    signInWithPopup(
      this.sp.firebaseService.auth, this.sp.firebaseService.provider
    );
  }

  signOut() {
    signOut(this.sp.firebaseService.auth);
    this.sp.homeService.unsubscribeAll();
  }

  // *********************************************************************** //
  // FIRESTORE                                                               //
  // *********************************************************************** //

  /** Update experimenter profile. */
  async writeExperimenterProfile(user: User) {
    const profile: ExperimenterProfile = {
      id: user.uid,
      name: user.displayName ?? '',
      email: user.email ?? '',
    };

    setDoc(
      doc(
        this.sp.firebaseService.firestore,
        'experimenters',
        profile.id
      ),
      profile
    );
  }

  /** Update experimenter private data, e.g., API key. */
  async writeExperimenterData(data: ExperimenterData) {
    setDoc(
      doc(
        this.sp.firebaseService.firestore,
        'experimenterData',
        data.id
      ),
      data
    );
  }
}
