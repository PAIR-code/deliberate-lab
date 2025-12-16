import {
  Experiment,
  ExperimentTemplate,
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

/**
 * Handle home/landing experimenter views:
 * - List experiments
 * - List experiment templates
 * - List agent templates
 */
export enum HomeTab {
  MY_EXPERIMENTS = 'my_experiments',
  SHARED_WITH_ME = 'shared_with_me',
  TEMPLATES = 'experiment_templates',
}

export class HomeService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  @observable experiments: Experiment[] = [];
  @observable experimenterMap: Record<string, ExperimenterProfile> = {};
  @observable private myTemplates: ExperimentTemplate[] = [];
  @observable private publicTemplates: ExperimentTemplate[] = [];
  @observable private sharedTemplates: ExperimentTemplate[] = [];

  @computed get experimentTemplates(): ExperimentTemplate[] {
    const all = [
      ...this.myTemplates,
      ...this.publicTemplates,
      ...this.sharedTemplates,
    ];
    const map = new Map<string, ExperimentTemplate>();
    all.forEach((t) => map.set(t.id, t));
    return Array.from(map.values());
  }

  // Home tabs
  @observable activeTab: HomeTab = HomeTab.MY_EXPERIMENTS;
  @observable searchQuery = '';

  // Loading
  @observable unsubscribe: Unsubscribe[] = [];
  @observable areExperimentsLoading = true;
  @observable areExperimentTemplatesLoading = true;

  @computed get isLoading() {
    return this.areExperimentsLoading || this.areExperimentTemplatesLoading;
  }

  // Deprecated compatibility getter if needed, but better to just fix usages
  @computed get showMyExperiments() {
    return this.activeTab === HomeTab.MY_EXPERIMENTS;
  }

  subscribe() {
    this.unsubscribeAll();

    // Subscribe to experimenter profiles
    this.unsubscribe.push(
      onSnapshot(
        collection(this.sp.firebaseService.firestore, 'experimenters'),
        (snapshot) => {
          let changedDocs = snapshot.docChanges().map((change) => change.doc);
          if (changedDocs.length === 0) {
            changedDocs = snapshot.docs;
          }

          changedDocs.forEach((doc) => {
            this.experimenterMap[doc.id] = doc.data() as ExperimenterProfile;
          });
        },
      ),
    );

    // Subscribe to relevant experiment documents
    const experimentQuery = query(
      collection(this.sp.firebaseService.firestore, 'experiments'),
      or(
        where('metadata.creator', '==', this.sp.authService.userEmail),
        where('permissions.visibility', '==', 'public'),
      ),
    );

    this.unsubscribe.push(
      onSnapshot(experimentQuery, (snapshot) => {
        this.experiments = collectSnapshotWithId<Experiment>(snapshot, 'id');
        this.areExperimentsLoading = false;
      }),
    );

    // Subscribe to my templates
    const myTemplatesQuery = query(
      collection(this.sp.firebaseService.firestore, 'experimentTemplates'),
      where('experiment.metadata.creator', '==', this.sp.authService.userEmail),
    );
    this.unsubscribe.push(
      onSnapshot(myTemplatesQuery, (snapshot) => {
        this.myTemplates = collectSnapshotWithId<ExperimentTemplate>(
          snapshot,
          'id',
        );
        this.updateLoadingState('my', false);
      }),
    );

    // Subscribe to public templates
    const publicTemplatesQuery = query(
      collection(this.sp.firebaseService.firestore, 'experimentTemplates'),
      where('visibility', '==', 'public'),
    );
    this.unsubscribe.push(
      onSnapshot(publicTemplatesQuery, (snapshot) => {
        this.publicTemplates = collectSnapshotWithId<ExperimentTemplate>(
          snapshot,
          'id',
        );
        this.updateLoadingState('public', false);
      }),
    );

    // Subscribe to shared templates
    const sharedWithQuery = query(
      collection(this.sp.firebaseService.firestore, 'experimentTemplates'),
      where('sharedWith', 'array-contains', this.sp.authService.userEmail),
    );
    this.unsubscribe.push(
      onSnapshot(sharedWithQuery, (snapshot) => {
        this.sharedTemplates = collectSnapshotWithId<ExperimentTemplate>(
          snapshot,
          'id',
        );
        this.updateLoadingState('shared', false);
      }),
    );
  }

  private loadingState = {
    my: true,
    public: true,
    shared: true,
  };

  private updateLoadingState(key: 'my' | 'public' | 'shared', value: boolean) {
    this.loadingState[key] = value;
    this.areExperimentTemplatesLoading = Object.values(this.loadingState).some(
      (v) => v,
    );
  }

  unsubscribeAll() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.unsubscribe = [];

    // Reset observables
    this.experiments = [];
    this.experimenterMap = {};
    this.myTemplates = [];
    this.publicTemplates = [];
    this.sharedTemplates = [];
    this.loadingState = {my: true, public: true, shared: true};
  }

  getExperiment(experimentId: string) {
    return this.experiments.find((exp) => exp.id === experimentId);
  }

  getExperimenter(experimenterId: string) {
    return this.experimenterMap[experimenterId];
  }

  getExperimenterName(experimenterId: string) {
    return this.experimenterMap[experimenterId]?.name ?? experimenterId;
  }

  setActiveTab(tab: HomeTab) {
    this.activeTab = tab;
  }

  // Deprecated
  setShowMyExperiments(showMyExperiments: boolean) {
    this.activeTab = showMyExperiments
      ? HomeTab.MY_EXPERIMENTS
      : HomeTab.SHARED_WITH_ME;
  }

  setSearchQuery(searchQuery: string) {
    this.searchQuery = searchQuery;
  }
}
