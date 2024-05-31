import { computed, makeObservable, observable } from "mobx";
import {
  Auth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User
} from 'firebase/auth';

import { Service } from "./service";
import { FirebaseService } from "./firebase_service";

import { Permission } from "../shared/types";

interface ServiceProvider {
  firebaseService: FirebaseService;
}

export class AuthService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);

    onAuthStateChanged(this.sp.firebaseService.auth, (user: User | null) => {
      if (user) {
        // User is signed in, see docs for a list of available properties
        // https://firebase.google.com/docs/reference/js/auth.user
        this.user = user;
        this.user.getIdTokenResult().then((result) => {
          if (result.claims['role'] === 'experimenter') {
            this.isExperimenter = true;
            this.sp.firebaseService.subscribe('experiments');
          }
        });
      } else {
        // User is signed out
        this.user = null;
        this.sp.firebaseService.unsubscribeAll();
      }
    });
  }

  @observable user: User|null|undefined = undefined;
  @observable isExperimenter: boolean|null = null;
  @observable editMode = false;

  @computed get userId() {
    return this.user?.uid;
  }

  @computed get initialAuthCheck() {
    return this.user !== undefined;
  }

  @computed get authenticated() {
    return this.initialAuthCheck && this.user !== null;
  }

  @computed get permission() {
    if (this.authenticated) {
      if (this.editMode) {
        return Permission.EDIT;
      } else {
        return Permission.PREVIEW;
      }
    } else {
      return Permission.PARTICIPATE;
    }
  }

  signInWithGoogle() {
    signInWithPopup(
      this.sp.firebaseService.auth, this.sp.firebaseService.provider
    );
  }

  signOut() {
    signOut(this.sp.firebaseService.auth);
  }
}
