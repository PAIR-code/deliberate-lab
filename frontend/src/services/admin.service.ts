import {
  Experiment,
  ExperimenterProfile,
  StageConfig,
} from '@deliberation-lab/utils';
import {
  Unsubscribe,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  or,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import {computed, makeObservable, observable} from 'mobx';

import {AuthService} from './auth.service';
import {FirebaseService} from './firebase.service';
import {Service} from './service';

import {collectSnapshotWithId} from '../shared/utils';

interface ServiceProvider {
  authService: AuthService;
  firebaseService: FirebaseService;
}

/** Handle admin dashboard info. */
export class AdminService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  @observable experiments: Experiment[] = [];
  @observable experimenters: string[] = [];

  // Loading
  @observable unsubscribe: Unsubscribe[] = [];
  @observable areExperimentsLoading = true;
  @observable areExperimentTemplatesLoading = true;

  @computed get isLoading() {
    return this.areExperimentsLoading || this.areExperimentTemplatesLoading;
  }

  subscribe() {
    this.unsubscribeAll();

    // TODO: Load experimenters based on allowlist

    // Subscribe to relevant experiment documents
    const experimentQuery = collection(this.sp.firebaseService.firestore, 'experiments');
    this.unsubscribe.push(
      onSnapshot(
        experimentQuery,
        (snapshot) => {
          this.experiments = collectSnapshotWithId<Experiment>(snapshot, 'id');
          this.areExperimentsLoading = false;
        }
      )
    );
  }

  unsubscribeAll() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.unsubscribe = [];

    // Reset observables
    this.experiments = [];
    this.experimenters = [];
  }

  getExperiment(experimentId: string) {
    return this.experiments.find((exp) => exp.id === experimentId);
  }
}