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
  ChatDiscussion,
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

  // Stage ID to list of non-discussion chat messages
  @observable chatMap: Record<string, ChatMessage[]> = {};
  // Stage ID to map of discussion ID to list of chat messages
  @observable chatDiscussionMap: Record<string, Record<string, ChatMessage[]>> = {};
  @observable isChatLoading = false;

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

  @computed get nonObsoleteParticipants() {
    return this.getAllParticipants().filter(
      p => !isObsoleteParticipant(p)
    );
  }

  // Get participants who have completed/not completed the stage
  // (excluding obsolete participants)
  getParticipantsByCompletion(stageId: string) {
    const completed: ParticipantProfile[] = [];
    const notCompleted: ParticipantProfile[] = [];

    this.getAllParticipants().forEach(participant => {
      if (!isObsoleteParticipant(participant)) {
        if (participant.timestamps.completedStages[stageId]) {
          completed.push(participant);
        } else {
          notCompleted.push(participant);
        }
      }
    });

    return { completed, notCompleted };
  }

  // If stage is waiting for participants, e.g.,
  // - minParticipants not reached
  // - waitForParticipants is true, stage is locked to 1+ participant,
  //   and no one has completed the stage yet
  isStageWaitingForParticipants(stageId: string) {
    const stageConfig = this.sp.experimentService.getStage(stageId);
    if (!stageConfig) return false;

    // Check for min number of participants
    const numUnlocked = this.getUnlockedStageParticipants(stageId).length;
    if (stageConfig.progress.minParticipants > numUnlocked) return true;

    // Otherwise, if waitForParticipants is true, check for locked participants
    if (!stageConfig.progress.waitForAllParticipants) return false;

    const numLocked = this.getLockedStageParticipants(stageId).length;
    const numCompleted = this.getAllParticipants().filter(
      participant => participant.timestamps.completedStages[stageId]
    ).length;
    return numLocked > 0 && numCompleted === 0;
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
    this.isChatLoading = true;
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