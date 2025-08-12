import {computed, makeObservable, observable} from 'mobx';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  or,
  orderBy,
  query,
  Timestamp,
  Unsubscribe,
  where,
} from 'firebase/firestore';
import {ExperimentService} from './experiment.service';
import {FirebaseService} from './firebase.service';
import {Pages, RouterService} from './router.service';
import {Service} from './service';

import {
  ChatDiscussion,
  ChatMessage,
  ChatStageConfig,
  CohortConfig,
  MediatorProfile,
  MediatorStatus,
  ParticipantProfile,
  ParticipantStatus,
  StageConfig,
  StageKind,
  StagePublicData,
  UnifiedTimestamp,
} from '@deliberation-lab/utils';
import {
  isActiveParticipant,
  isObsoleteParticipant,
  isUnlockedStage,
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

  @observable experimentId: string | null = null;
  @observable cohortId: string | null = null;
  @observable cohortConfig: CohortConfig | null = null;

  // Participants currently in the cohort
  @observable participantMap: Record<string, ParticipantProfile> = {};
  // Participants pending transfer to this cohort
  @observable transferParticipantMap: Record<string, ParticipantProfile> = {};
  // Mediators currently in the cohort
  @observable mediatorMap: Record<string, MediatorProfile> = {};

  @observable stagePublicDataMap: Record<string, StagePublicData> = {};

  // Stage ID to list of non-discussion chat messages
  @observable chatMap: Record<string, ChatMessage[]> = {};
  // Stage ID to map of discussion ID to list of chat messages
  @observable chatDiscussionMap: Record<string, Record<string, ChatMessage[]>> =
    {};

  // Loading
  @observable unsubscribe: Unsubscribe[] = [];
  @observable isMediatorsLoading = false;
  @observable isParticipantsLoading = false;
  @observable isStageDataLoading = false;
  @observable isCohortConfigLoading = false;
  @observable isChatLoading = false;
  @observable isChipLoading = false;

  @computed get isLoading() {
    return (
      this.isParticipantsLoading ||
      this.isStageDataLoading ||
      this.isMediatorsLoading
    );
  }

  set isLoading(value: boolean) {
    this.isParticipantsLoading = value;
    this.isStageDataLoading = value;
    this.isChatLoading = value;
    this.isChipLoading = value;
    this.isMediatorsLoading = value;
  }

  // Returns mediators that are active in the given stage
  getMediatorsForStage(stageId: string) {
    return Object.values(this.mediatorMap).filter(
      (mediator) =>
        mediator.activeStageMap[stageId] &&
        mediator.currentStatus !== MediatorStatus.DELETED,
    );
  }

  getAllParticipants(
    includePendingTransfer = true, // if pending transfer into cohort
  ) {
    if (!includePendingTransfer) {
      return Object.values(this.participantMap);
    }
    return [
      ...Object.values(this.participantMap),
      ...Object.values(this.transferParticipantMap),
    ];
  }

  // Participants currently in the experiment
  // (not dropped out or pending transfer)
  @computed get activeParticipants() {
    return Object.values(this.participantMap).filter((p) =>
      isActiveParticipant(p),
    );
  }

  // Participants who are obsolete but have already passed
  // the given stage should not hold up the waiting page.
  getObsoleteParticipantsPastThisStage(stageId: string) {
    return this.getAllParticipants().filter(
      (participant) =>
        isUnlockedStage(participant, stageId) &&
        isObsoleteParticipant(participant),
    );
  }

  getUnlockedStageParticipants(stageId: string) {
    return this.getAllParticipants().filter(
      (participant) =>
        isUnlockedStage(participant, stageId) &&
        !isObsoleteParticipant(participant),
    );
  }

  getLockedStageParticipants(stageId: string) {
    return this.getAllParticipants().filter(
      (participant) =>
        !isUnlockedStage(participant, stageId) &&
        !isObsoleteParticipant(participant),
    );
  }

  @computed get nonObsoleteParticipants() {
    return this.getAllParticipants().filter((p) => !isObsoleteParticipant(p));
  }

  // Get participants who have completed the stage
  // (excluding obsolete participants)
  getStageCompletedParticipants(stageId: string) {
    return this.getAllParticipants().filter(
      (p) => !isObsoleteParticipant(p) && p.timestamps.completedStages[stageId],
    );
  }

  // Get participants by chat discussion completion
  // (excluding obsolete participants)
  getParticipantsByChatDiscussionCompletion(
    stageId: string,
    discussionId: string,
  ) {
    const completed: ParticipantProfile[] = [];
    const notCompleted: ParticipantProfile[] = [];

    const stage = this.sp.experimentService.getStage(stageId);
    if (!stage || stage.kind !== StageKind.CHAT)
      return {completed, notCompleted};

    const stageData = this.stagePublicDataMap[stageId];
    const discussionMap =
      stageData?.kind === StageKind.CHAT
        ? (stageData.discussionTimestampMap[discussionId] ?? {})
        : {};

    this.getAllParticipants().forEach((participant) => {
      if (!isObsoleteParticipant(participant)) {
        if (discussionMap[participant.publicId]) {
          completed.push(participant);
        } else {
          notCompleted.push(participant);
        }
      }
    });

    return {completed, notCompleted};
  }

  // If stage is in a waiting phase
  isStageInWaitingPhase(stageId: string) {
    // Return false if stage is unlocked for cohort, else true
    return !this.cohortConfig?.stageUnlockMap[stageId];
  }

  // Get number of participants needed to pass waiting phase
  getWaitingPhaseMinParticipants(stageId: string) {
    const stageConfig = this.sp.experimentService.getStage(stageId);
    if (!stageConfig) return 0;

    const numParticipants = this.nonObsoleteParticipants.length;
    const minParticipants = stageConfig.progress.minParticipants;

    if (
      stageConfig.progress.waitForAllParticipants &&
      stageConfig.progress.minParticipants
    ) {
      return Math.max(numParticipants, minParticipants);
    } else if (stageConfig.progress.waitForAllParticipants) {
      return numParticipants;
    } else {
      return minParticipants;
    }
  }

  getChatDiscussionMessages(stageId: string, discussionId: string) {
    if (!this.chatDiscussionMap[stageId]) return [];
    if (!this.chatDiscussionMap[stageId][discussionId]) return [];

    return this.chatDiscussionMap[stageId][discussionId];
  }

  // Returns chat discussion ID (or null if none or finished with all chats)
  // TODO: Return different type of discussion ID based on chat stage kind
  getChatDiscussionId(stageId: string): string | null {
    const stageData = this.stagePublicDataMap[stageId];
    if (!stageData || stageData.kind !== StageKind.CHAT) {
      return null;
    }

    return stageData.currentDiscussionId;
  }

  // Called from participant service on participant snapshot listener
  // (i.e., when participant's current cohort may have changed)
  async loadCohortData(experimentId: string, id: string) {
    if (id === this.cohortId) {
      return;
    }

    this.experimentId = experimentId;
    this.isLoading = true;
    this.cohortId = id;
    this.unsubscribeAll();

    // Subscribe to data
    this.loadCohortConfig();
    this.loadPublicStageData();
    this.loadChatMessages();
    this.loadParticipantProfiles();
    this.loadMediatorProfiles();
  }

  /** Subscribe to current cohort config. */
  private loadCohortConfig() {
    if (!this.experimentId || !this.cohortId) return;

    this.isCohortConfigLoading = true;
    this.unsubscribe.push(
      onSnapshot(
        doc(
          this.sp.firebaseService.firestore,
          'experiments',
          this.experimentId,
          'cohorts',
          this.cohortId,
        ),
        async (doc) => {
          this.cohortConfig = {
            stageUnlockMap: {}, // for backwards compatibility
            ...doc.data(),
          } as CohortConfig;
          this.isCohortConfigLoading = false;
        },
      ),
    );
  }

  /** Subscribe to public stage data. */
  private loadPublicStageData() {
    if (!this.experimentId || !this.cohortId) return;

    this.isStageDataLoading = true;
    this.unsubscribe.push(
      onSnapshot(
        collection(
          this.sp.firebaseService.firestore,
          'experiments',
          this.experimentId,
          'cohorts',
          this.cohortId,
          'publicStageData',
        ),
        (snapshot) => {
          let changedDocs = snapshot.docChanges().map((change) => change.doc);
          if (changedDocs.length === 0) {
            changedDocs = snapshot.docs;
          }

          changedDocs.forEach((doc) => {
            this.stagePublicDataMap[doc.id] = doc.data() as StagePublicData;
          });
          this.isStageDataLoading = false;
        },
      ),
    );
  }

  /** Subscribe to chat message collections for each stage ID. */
  private async loadChatMessages() {
    if (!this.experimentId || !this.cohortId) return;

    // Get stageIds from experiment doc
    // (as they may not have loaded in experiment service yet)
    const experimentRef = doc(
      this.sp.firebaseService.firestore,
      'experiments',
      this.experimentId,
    );
    const experimentSnap = await getDoc(experimentRef);
    if (!experimentSnap.exists()) return;
    const experimentData = experimentSnap.data();
    if (experimentData?.stageIds.length === 0) return;

    this.isChatLoading = true;
    for (const stageId of experimentData.stageIds) {
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
              if (!this.chatDiscussionMap[stageId]) {
                this.chatDiscussionMap[stageId] = {};
              }
              const message = {
                senderId: doc.data().participantPublicId ?? '', // backwards compatibility pre version 16
                agentId: '', // backwards compatibility pre version 16
                explanation: '', // backwards compatibility pre version 16
                ...doc.data(),
              } as ChatMessage;
              if (!message.discussionId) {
                this.chatMap[stageId].push(message);
              } else {
                if (!this.chatDiscussionMap[stageId][message.discussionId]) {
                  this.chatDiscussionMap[stageId][message.discussionId] = [];
                }
                this.chatDiscussionMap[stageId][message.discussionId].push(
                  message,
                );
              }
            });
            this.isChatLoading = false;
          },
        ),
      );
    }
  }

  /** Subscribe to participants' public profiles. */
  private loadParticipantProfiles() {
    if (!this.experimentId || !this.cohortId) return;

    this.isParticipantsLoading = true;

    // Clear participant maps before repopulating
    this.participantMap = {};
    this.transferParticipantMap = {};

    // TODO: Use participantPublicData collection once available
    // so that privateIds are not surfaced
    this.unsubscribe.push(
      onSnapshot(
        query(
          collection(
            this.sp.firebaseService.firestore,
            'experiments',
            this.experimentId,
            'participants',
          ),
          or(
            where('currentCohortId', '==', this.cohortId),
            where('transferCohortId', '==', this.cohortId),
          ),
        ),
        (snapshot) => {
          let changedDocs = snapshot.docChanges().map((change) => change.doc);
          if (changedDocs.length === 0) {
            changedDocs = snapshot.docs;
          }

          changedDocs.forEach((doc) => {
            const profile = doc.data() as ParticipantProfile;
            if (profile.currentCohortId === this.cohortId) {
              this.participantMap[profile.publicId] = profile;
              delete this.transferParticipantMap[profile.publicId];
            } else if (profile.transferCohortId === this.cohortId) {
              this.transferParticipantMap[profile.publicId] = profile;
            }
          });
          this.isParticipantsLoading = false;
        },
      ),
    );
  }

  loadMediatorProfiles() {
    if (!this.experimentId || !this.cohortId) return;

    this.isMediatorsLoading = true;

    // Clear mediator map before repopulating
    this.mediatorMap = {};

    // TODO: Use mediatorPublicData collection once available
    // so that agent configs are not surfaced
    this.unsubscribe.push(
      onSnapshot(
        query(
          collection(
            this.sp.firebaseService.firestore,
            'experiments',
            this.experimentId,
            'mediators',
          ),
          or(where('currentCohortId', '==', this.cohortId)),
        ),
        (snapshot) => {
          let changedDocs = snapshot.docChanges().map((change) => change.doc);
          if (changedDocs.length === 0) {
            changedDocs = snapshot.docs;
          }

          changedDocs.forEach((doc) => {
            const profile = doc.data() as MediatorProfile;
            this.mediatorMap[profile.publicId] = profile;
          });
          this.isMediatorsLoading = false;
        },
      ),
    );
  }

  unsubscribeAll() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.unsubscribe = [];

    // Reset stage configs
    this.cohortConfig = null;
    this.participantMap = {};
    this.chatMap = {};
    this.chatDiscussionMap = {};
    this.transferParticipantMap = {};
    this.stagePublicDataMap = {};
    this.mediatorMap = {};
  }

  reset() {
    this.cohortId = null;
    this.experimentId = null;
    this.unsubscribeAll();
  }
}
