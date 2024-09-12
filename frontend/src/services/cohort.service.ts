import {computed, makeObservable, observable} from 'mobx';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  or,
  orderBy,
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

import {
  isActiveParticipant,
  isObsoleteParticipant,
  isUnlockedStage
} from '../shared/participant.utils';

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

  // Participants currently in the cohort
  @observable participantMap: Record<string, ParticipantProfile> = {};
  // Participants pending transfer to this cohort
  @observable transferParticipantMap: Record<string, ParticipantProfile> = {};

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

  getAllParticipants(
    includePendingTransfer = true // if pending transfer into cohort
  ) {
    if (!includePendingTransfer) {
      return Object.values(this.participantMap);
    }
    return [
      ...Object.values(this.participantMap),
      ...Object.values(this.transferParticipantMap)
    ];
  }

  // Participants currently in the experiment
  // (not dropped out or pending transfer)
  @computed get activeParticipants() {
    return Object.values(this.participantMap).filter(
      p => isActiveParticipant(p)
    );
  }

  getUnlockedStageParticipants(stageId: string) {
    return this.getAllParticipants().filter(
      participant => isUnlockedStage(participant, stageId)
        && !isObsoleteParticipant(participant)
    );
  }

  getLockedStageParticipants(stageId: string) {
    return this.getAllParticipants().filter(
      participant => !isUnlockedStage(participant, stageId)
        && !isObsoleteParticipant(participant)
    );
  }

  // If stage is waiting for participants, i.e., is is locked to at least
  // one participant and no one has completed the stage yet
  isStageWaitingForParticipants(stageId: string) {
    const numLocked = this.getLockedStageParticipants(stageId).length;
    const numCompleted = this.getAllParticipants().filter(
      participant => participant.timestamps.completedStages[stageId]
    ).length;
    return numLocked > 0 && numCompleted === 0;
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
    this.unsubscribe.push(
      onSnapshot(
        collection(
          this.sp.firebaseService.firestore,
          'experiments',
          this.experimentId,
          'cohorts',
          this.cohortId,
          'publicStageData'
        ),
        (snapshot) => {
          let changedDocs = snapshot.docChanges().map((change) => change.doc);
          if (changedDocs.length === 0) {
            changedDocs = snapshot.docs;
          }

          changedDocs.forEach((doc) => {
            this.stagePublicDataMap[doc.id] = doc.data() as StagePublicData;
          });
          this.isParticipantsLoading = false;
        }
      )
    );

    // Subscribe to chat messages
    for (const stageId of this.sp.experimentService.stageIds) {
      this.unsubscribe.push(
        onSnapshot(
          query(
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
            orderBy('timestamp', 'asc'),
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
          or(
            where('currentCohortId', '==', this.cohortId),
            where('transferCohortId', '==', this.cohortId)
          )
        ),
        (snapshot) => {
          let changedDocs = snapshot.docChanges().map((change) => change.doc);
          if (changedDocs.length === 0) {
            changedDocs = snapshot.docs;
          }

          changedDocs.forEach((doc) => {
            const data = doc.data() as ParticipantProfileExtended;
            const profile = {
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
            if (profile.currentCohortId === this.cohortId) {
              this.participantMap[profile.publicId] = profile;
            } else if (profile.transferCohortId === this.cohortId) {
              this.transferParticipantMap[profile.publicId] = profile;
            }
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
    this.chatMap = {};
    this.transferParticipantMap = {};
    this.stagePublicDataMap = {};
  }
}