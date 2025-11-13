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

/**
 * Handle home/landing experimenter views:
 * - List experiments
 * - List experiment templates
 * - List agent templates
 */
export class HomeService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  @observable experiments: Experiment[] = [];
  @observable experimenterMap: Record<string, ExperimenterProfile> = {};
  @observable experimentTemplates: Experiment[] = [];

  // Home tabs
  @observable showMyExperiments = true;
  @observable searchQuery = '';

  // Loading
  @observable unsubscribe: Unsubscribe[] = [];
  @observable areExperimentsLoading = true;
  @observable areExperimentTemplatesLoading = true;

  @computed get isLoading() {
    return this.areExperimentsLoading || this.areExperimentTemplatesLoading;
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

    // Subscribe to all experiment template documents
    const experimentTemplateQuery = query(
      collection(this.sp.firebaseService.firestore, 'experimentTemplates'),
      where('metadata.creator', '==', this.sp.authService.userEmail),
    );
    this.unsubscribe.push(
      onSnapshot(experimentTemplateQuery, (snapshot) => {
        this.experimentTemplates = collectSnapshotWithId<Experiment>(
          snapshot,
          'id',
        );
        this.areExperimentTemplatesLoading = false;
      }),
    );
  }

  unsubscribeAll() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.unsubscribe = [];

    // Reset observables
    this.experiments = [];
    this.experimenterMap = {};
    this.experimentTemplates = [];
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

  setShowMyExperiments(showMyExperiments: boolean) {
    this.showMyExperiments = showMyExperiments;
  }

  setSearchQuery(searchQuery: string) {
    this.searchQuery = searchQuery;
  }
}
