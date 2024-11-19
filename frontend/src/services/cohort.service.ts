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
  ParticipantProfile,
  ParticipantProfileExtended,
  ParticipantStatus,
  StageConfig,
  StageKind,
  StagePublicData,
  UnifiedTimestamp
} from '@deliberation-lab/utils';
import {
  updateCohortCallable,
} from '../shared/callables';
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

  // Stage ID to list of non-discussion chat messages
  @observable chatMap: Record<string, ChatMessage[]> = {};
  // Stage ID to map of discussion ID to list of chat messages
  @observable chatDiscussionMap: Record<string, Record<string, ChatMessage[]>> = {};

  // Loading
  @observable unsubscribe: Unsubscribe[] = [];
  @observable isParticipantsLoading = false;
  @observable isStageDataLoading = false;
  @observable isCohortConfigLoading = false;
  @observable isChatLoading = false;

  @computed get isLoading() {
    return (
      this.isParticipantsLoading ||
      this.isStageDataLoading
    );
  }

  set isLoading(value: boolean) {
    this.isParticipantsLoading = value;
    this.isStageDataLoading = value;
    this.isChatLoading = value;
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

  // Participants who are obsolete but have already passed
  // the given stage should not hold up the waiting page.
  getObsoleteParticipantsPastThisStage(stageId: string) {
    return this.getAllParticipants().filter(
      participant => isUnlockedStage(participant, stageId)
        && isObsoleteParticipant(participant)
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

  @computed get nonObsoleteParticipants() {
    return this.getAllParticipants().filter(
      p => !isObsoleteParticipant(p)
    );
  }

  // Get participants who have completed the stage
  // (excluding obsolete participants)
  getStageCompletedParticipants(stageId: string) {
    return this.getAllParticipants().filter(
      p => !isObsoleteParticipant(p) && p.timestamps.completedStages[stageId]
    );
  }

  // Get participants by chat discussion completion
  // (excluding obsolete participants)
  getParticipantsByChatDiscussionCompletion(
    stageId: string, discussionId: string
  ) {
    const completed: ParticipantProfile[] = [];
    const notCompleted: ParticipantProfile[] = [];

    const stage = this.sp.experimentService.getStage(stageId);
    if (!stage || stage.kind !== StageKind.CHAT) return { completed, notCompleted };

    const stageData = this.stagePublicDataMap[stageId];
    const discussionMap = stageData?.kind === StageKind.CHAT ?
      stageData.discussionTimestampMap[discussionId] ?? {} : {};

    this.getAllParticipants().forEach(participant => {
      if (!isObsoleteParticipant(participant)) {
        if (discussionMap[participant.publicId]) {
          completed.push(participant);
        } else {
          notCompleted.push(participant);
        }
      }
    });

    return { completed, notCompleted };
  }

  // If stage is in a waiting phase, i.e.,
  // if the stage requires waiting and no participant has
  // completed the waiting phase before
  // (If a participant has unlocked a stage with waiting but not
  // yet completed its waiting phase, then that participant is waiting)
  isStageInWaitingPhase(stageId: string) {
    const stageConfig = this.sp.experimentService.getStage(stageId);
    if (!stageConfig) return true;

    // If stage does not require waiting, then false
    if (
      stageConfig.progress.minParticipants === 0 &&
      !stageConfig.progress.waitForAllParticipants
    ) {
      return false;
    }

    // If any participant in the cohort has completed the waiting phase
    // before, then waiting is false (as we never want to revert
    // participants from "in stage" back to pre-stage "waiting")
    for (const participant of this.getAllParticipants(false)) {
      if (participant.timestamps.completedWaiting[stageId]) {
        return false;
      }
    }

    return true;
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
  getChatDiscussionId(stageId: string): string|null {
    const stageConfig = this.sp.experimentService.getStage(stageId);
    if (!stageConfig || stageConfig.kind !== StageKind.CHAT || stageConfig.discussions.length === 0) {
      return null;
    }

    const stageData = this.stagePublicDataMap[stageId];
    // If no public stage data yet, return first discussion
    if (!stageData || stageData.kind !== StageKind.CHAT) {
      return stageConfig.discussions[0].id;
    }

    // Find latest chat with messages, then check if everyone
    // is ready to end that chat
    const getLatestDiscussion = () => {
      const reverseIndex = [...stageConfig.discussions].reverse().findIndex(
        discussion => isReadyToEndDiscussion(discussion)
      );

      if (reverseIndex < 0) return stageConfig.discussions[0].id;
      const completedIndex = stageConfig.discussions.length - reverseIndex - 1;

      // If the last discussion is ready to end, return null
      if (completedIndex === stageConfig.discussions.length - 1) return null;

      // Otherwise, return the next discussion
      return stageConfig.discussions[completedIndex + 1].id;
    };

    const isReadyToEndDiscussion = (discussion: ChatDiscussion) => {
      if (!stageData.discussionTimestampMap[discussion.id]) return false;
      for (const participant of this.activeParticipants) {
        if (!stageData.discussionTimestampMap[discussion.id][participant.publicId]) return false;
      }
      return true;
    };

    return getLatestDiscussion();
  }

  async loadCohortData(experimentId: string, id: string) {
    if (id === this.cohortId) {
      return;
    }

    this.experimentId = experimentId;
    this.isLoading = true;
    this.cohortId = id;
    this.unsubscribeAll();

    // Subscribe to data
    this.loadPublicStageData();
    this.loadChatMessages();
    this.loadParticipantProfiles();
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
          this.isStageDataLoading = false;
        }
      )
    );
  }

  /** Subscribe to chat message collections for each stage ID. */
  private async loadChatMessages() {
    if (!this.experimentId || !this.cohortId) return;

    // Get stageIds from experiment doc
    // (as they may not have loaded in experiment service yet)
    const experimentRef = doc(
      this.sp.firebaseService.firestore, 'experiments', this.experimentId
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
              const message = doc.data() as ChatMessage;
              if (!message.discussionId) {
                this.chatMap[stageId].push(message);
              } else {
                if (!this.chatDiscussionMap[stageId][message.discussionId]) {
                  this.chatDiscussionMap[stageId][message.discussionId] = [];
                }
                this.chatDiscussionMap[stageId][message.discussionId].push(message);
              }
            });
            this.isChatLoading = false;
          }
        )
      );
    }
  }

  /** Subscribe to participants' public profiles. */
  private loadParticipantProfiles() {
    if (!this.experimentId || !this.cohortId) return;

    this.isParticipantsLoading = true;
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
    this.chatDiscussionMap = {};
    this.transferParticipantMap = {};
    this.stagePublicDataMap = {};
  }

  reset() {
    this.cohortId = null;
    this.experimentId = null;
    this.unsubscribeAll();
  }
}