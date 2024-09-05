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
import {ExperimentService} from './experiment.service';
import {FirebaseService} from './firebase.service';
import {Pages, RouterService} from './router.service';
import {Service} from './service';

import {
  ChatMessage,
  ChatStageConfig,
  ParticipantProfile,
  ParticipantProfileExtended,
  ParticipantStatus,
  StageConfig,
  StageKind,
  StagePublicData,
} from '@deliberation-lab/utils';

interface ServiceProvider {
  experimentService: ExperimentService;
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
  @observable chatMap: Record<string, ChatMessage[]> = {};

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

  @computed get allParticipants() {
    return Object.values(this.participantMap);
  }

  // True if did not drop out of the experiment
  isValidParticipant(participant: ParticipantProfile) {
    return participant.currentStatus === ParticipantStatus.IN_PROGRESS
      || participant.currentStatus === ParticipantStatus.SUCCESS;
  }

  // Participants who did not drop out of the experiment
  @computed get validParticipants() {
    return Object.values(this.participantMap).filter(
      p => this.isValidParticipant(p)
    );
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

    // Subscribe to chat messages
    for (const stageId of this.sp.experimentService.stageIds) {
      this.unsubscribe.push(
        onSnapshot(
          collection(
            this.sp.firebaseService.firestore,
            'experiments',
            this.experimentId,
            'cohorts',
            this.cohortId,
            'publicStageData',
            stageId,
            'chats',
          ),
          (snapshot) => {
            let changedDocs = snapshot.docChanges().map((change) => change.doc);
            if (changedDocs.length === 0) {
              changedDocs = snapshot.docs;
            }

            changedDocs.forEach((doc) => {
              if (!this.chatMap[stageId]) {
                this.chatMap[stageId] = [];
              }
              this.chatMap[stageId].push(doc.data() as ChatMessage);
            });
          }
        )
      );
    }

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