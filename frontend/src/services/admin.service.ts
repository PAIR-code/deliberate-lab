import {
  Experiment,
  ExperimenterProfileExtended,
  StageConfig,
  getFullExperimenterConfig,
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
import {httpsCallable} from 'firebase/functions';

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
  @observable experimenters: ExperimenterProfileExtended[] = [];

  // Loading
  @observable unsubscribe: Unsubscribe[] = [];
  @observable areExperimentsLoading = true;
  @observable isAllowlistLoading = true;

  @computed get isLoading() {
    return this.areExperimentsLoading || this.isAllowlistLoading;
  }

  subscribe() {
    this.unsubscribeAll();

    // Load experimenters based on allowlist
    const allowlistQuery = collection(
      this.sp.firebaseService.firestore,
      'allowlist',
    );
    this.unsubscribe.push(
      onSnapshot(
        allowlistQuery,
        (snapshot) => {
          this.experimenters = snapshot.docs.map((doc) =>
            getFullExperimenterConfig({
              ...doc.data(),
              email: doc.id,
            } as Partial<ExperimenterProfileExtended>),
          );

          this.isAllowlistLoading = false;
        },
        (error) => {
          console.log(error);
        },
      ),
    );

    // Subscribe to relevant experiment documents
    const experimentQuery = collection(
      this.sp.firebaseService.firestore,
      'experiments',
    );
    this.unsubscribe.push(
      onSnapshot(experimentQuery, (snapshot) => {
        this.experiments = collectSnapshotWithId<Experiment>(snapshot, 'id');
        this.areExperimentsLoading = false;
      }),
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

  async normalizeAllowlistEmails() {
    const normalizeFunction = httpsCallable(
      this.sp.firebaseService.functions,
      'normalizeAllowlistEmails',
    );

    try {
      const result = await normalizeFunction({});
      return result.data as {
        success: boolean;
        normalizedCount: number;
        alreadyLowercaseCount: number;
        conflictCount: number;
        totalProcessed: number;
        details: string[];
      };
    } catch (error) {
      console.error('Error normalizing allowlist emails:', error);
      throw error;
    }
  }
}
