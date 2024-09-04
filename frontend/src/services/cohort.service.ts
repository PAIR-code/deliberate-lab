import {computed, makeObservable, observable} from 'mobx';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  or,
  query,
  Unsubscribe,
  where,
} from 'firebase/firestore';
import {FirebaseService} from './firebase.service';
import {Pages, RouterService} from './router.service';
import {Service} from './service';

import {
  ParticipantProfile,
  ParticipantProfileExtended,
  StageConfig,
  StagePublicData,
} from '@deliberation-lab/utils';

interface ServiceProvider {
  firebaseService: FirebaseService;
  routerService: RouterService;
}

/**
 * Cohort data (participants, publicStageData) for current experiment.
 *
 * For participant-specific data (private profile, private answers),
 *  see participant.service.ts
 * For experiment-level configs (stages, roles), see experiment.service.ts
 * To manage cohorts or participants, see experiment.manager.ts
 */
export class CohortService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  @observable experimentId: string|null = null;
  @observable cohortId: string|null = null;
  @observable participantMap: Record<string, ParticipantProfile> = {};
  @observable stagePublicDataMap: Record<string, StagePublicData> = {};

  // Loading
  @observable unsubscribe: Unsubscribe[] = [];
  @observable isParticipantsLoading = false;
  @observable isStageDataLoading = false;

  @computed get isLoading() {
    return (
      this.isParticipantsLoading ||
      this.isStageDataLoading
    );
  }

  set isLoading(value: boolean) {
    this.isParticipantsLoading = value;
    this.isStageDataLoading = value;
  }

  loadCohortData(id: string) {
    if (id === this.cohortId) {
      return;
    }

    this.experimentId = this.sp.routerService.activeRoute.params['experiment'];
    if (!this.experimentId) return;

    this.isLoading = true;
    this.cohortId = id;
    this.unsubscribeAll();

    // TODO: Subscribe to public stage data

    // Subscribe to participants' public profiles
    // TODO: Use participantPublicData collection once available
    // so that privateIds are not surfaced
    this.unsubscribe.push(
      onSnapshot(
        query(
          collection(
            this.sp.firebaseService.firestore,
            'experiments',
            this.experimentId,
            'participants'
          ),
          where('currentCohortId', '==', this.cohortId),
        ),
        (snapshot) => {
          let changedDocs = snapshot.docChanges().map((change) => change.doc);
          if (changedDocs.length === 0) {
            changedDocs = snapshot.docs;
          }

          changedDocs.forEach((doc) => {
            const data = doc.data() as ParticipantProfileExtended;
            this.participantMap[data.publicId] = {
              pronouns: data.pronouns,
              avatar: data.avatar,
              name: data.name,
              publicId: data.publicId,
              prolificId: data.prolificId,
              currentStageId: data.currentStageId,
              currentCohortId: data.currentCohortId,
              transferCohortId: data.transferCohortId,
              currentStatus: data.currentStatus,
              timestamps: data.timestamps,
            };
          });
          this.isParticipantsLoading = false;
        }
      )
    );
  }

  unsubscribeAll() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.unsubscribe = [];

    // Reset stage configs
    this.participantMap = {};
    this.stagePublicDataMap = {};
  }
}