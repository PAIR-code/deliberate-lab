import {
  ChatStageParticipantAnswer,
  CreateChatMessageData,
  RankingItem,
  ParticipantChatMessage,
  ParticipantProfileExtended,
  ParticipantStatus,
  StageKind,
  StageParticipantAnswer,
  SurveyAnswer,
  SurveyPerParticipantStageParticipantAnswer,
  SurveyStageParticipantAnswer,
  UpdateChatStageParticipantAnswerData,
  createChatStageParticipantAnswer,
  createParticipantChatMessage,
  createParticipantProfileExtended,
  createSurveyPerParticipantStageParticipantAnswer,
  createSurveyStageParticipantAnswer,
} from '@deliberation-lab/utils';
import {
  Timestamp,
  Unsubscribe,
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {computed, makeObservable, observable} from 'mobx';
import {CohortService} from './cohort.service';
import {ExperimentService} from './experiment.service';
import {FirebaseService} from './firebase.service';
import {Pages, RouterService} from './router.service';
import {ParticipantAnswerService} from './participant.answer';
import {Service} from './service';

import {
  createChatMessageCallable,
  updateParticipantCallable,
  updateChatStageParticipantAnswerCallable,
  updateSurveyPerParticipantStageParticipantAnswerCallable,
  updateSurveyStageParticipantAnswerCallable,
  updateRankingStageParticipantAnswerCallable,
} from '../shared/callables';
import {PROLIFIC_COMPLETION_URL_PREFIX} from '../shared/constants';
import {
  isUnlockedStage,
  isActiveParticipant,
  isObsoleteParticipant,
  isPendingParticipant,
  isParticipantEndedExperiment,
} from '../shared/participant.utils';
import { ElectionStrategy } from '@deliberation-lab/utils';

interface ServiceProvider {
  cohortService: CohortService;
  experimentService: ExperimentService;
  firebaseService: FirebaseService;
  routerService: RouterService;
  participantAnswerService: ParticipantAnswerService;
}

export class ParticipantService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  @observable experimentId: string | null = null;
  @observable participantId: string | null = null;

  @observable profile: ParticipantProfileExtended | undefined = undefined;
  @observable answerMap: Record<string, StageParticipantAnswer | undefined> = {};

  // Loading
  @observable unsubscribe: Unsubscribe[] = [];
  @observable isProfileLoading = false;
  @observable areAnswersLoading = false;

  // Chat creation loading
  @observable isSendingChat = false;

  @computed get isLoading() {
    return this.isProfileLoading || this.areAnswersLoading;
  }

  set isLoading(value: boolean) {
    this.isProfileLoading = value;
    this.areAnswersLoading = value;
  }

  setParticipant(experimentId: string | null, participantId: string | null) {
    this.experimentId = experimentId;
    this.participantId = participantId;
    this.isLoading = true;
    this.loadParticipantData();
  }

  // True if currently in the experiment (not dropped out, not transfer pending)
  // (note that participants who completed experiment are included here)
  @computed get isActiveParticipant() {
    if (!this.profile) return false;
    return isActiveParticipant(this.profile);
  }

  // If participant has left the experiment
  // (not active, not pending transfer)
  @computed get isObsoleteParticipant() {
    if (!this.profile) return false;
    return isObsoleteParticipant(this.profile);
  }

  // If participant is in a waiting state
  // (e.g., while pending transfer, not currently in the experiment but also
  // has not left yet)
  @computed get isPendingParticipant() {
    if (!this.profile) return false;
    return isPendingParticipant(this.profile);
  }

  isCurrentStage(
    stageId: string = this.sp.routerService.activeRoute.params['stage']
  ) {
    return this.profile?.currentStageId === stageId;
  }

  isLastStage(
    stageId: string = this.sp.routerService.activeRoute.params['stage']
  ) {
    const ids = this.sp.experimentService.stageIds;
    return ids.length > 0 && ids[ids.length - 1] === stageId;
  }

  @computed get disableStage() {
    return this.completedExperiment || !this.isCurrentStage()
  }

  // True if already completed stage or is current stage
  canAccessStage(stageId: string) {
    if (!this.profile) return false;
    return isUnlockedStage(this.profile, stageId);
  }

  completedStage(stageId: string) {
    return this.profile?.timestamps.completedStages[stageId];
  }

  @computed get completedExperiment() {
    return this.profile ? isParticipantEndedExperiment(this.profile) : false;
  }

  getStageAnswer(stageId: string) {
    if (!this.profile) return undefined;
    return this.answerMap[stageId];
  }

  isReadyToEndChatDiscussion(stageId: string, discussionId: string) {
    const stageAnswer = this.answerMap[stageId];
    if (!stageAnswer || stageAnswer.kind !== StageKind.CHAT) return false;

    return stageAnswer.discussionTimestampMap[discussionId];
  }

  updateForRoute(
    eid: string, // experiment ID
    pid: string // participant ID
  ) {
    if (eid !== this.experimentId || pid !== this.participantId) {
      this.setParticipant(eid, pid);
    }
  }

  loadParticipantData() {
    this.unsubscribeAll();
    this.sp.participantAnswerService.resetData();

    if (this.experimentId === null || this.participantId === null) {
      this.isLoading = false;
      return;
    }

    // Set IDs for participant answer service
    this.sp.participantAnswerService.updateForRoute(
      this.experimentId, this.participantId
    );

    // Subscribe to profile
    this.unsubscribe.push(
      onSnapshot(
        doc(
          this.sp.firebaseService.firestore,
          'experiments',
          this.experimentId,
          'participants',
          this.participantId
        ),
        async (doc) => {
          this.profile = doc.data() as ParticipantProfileExtended;
          // Load cohort data
          if (this.experimentId) {
            await this.sp.cohortService.loadCohortData(
              this.experimentId,
              this.profile.currentCohortId
            );
          }

          // TODO: Move to backend?
          // If started experiment and not waiting on current stage,
          // add cohort stage timestamp
          const stageId = this.profile.currentStageId;
          if (!this.sp.cohortService.isStageWaitingForParticipants(stageId)) {
            this.sp.cohortService.addStageStartTimestamp(stageId);
          }

          // Load profile to participant answer service
          this.sp.participantAnswerService.setProfile(this.profile);

          this.isProfileLoading = false;
        }
      )
    );

    // Subscribe to the stage answers
    this.unsubscribe.push(
      onSnapshot(
        collection(
          this.sp.firebaseService.firestore,
          'experiments',
          this.experimentId,
          'participants',
          this.participantId,
          'stageData'
        ),
        (snapshot) => {
          let changedDocs = snapshot.docChanges().map((change) => change.doc);
          if (changedDocs.length === 0) changedDocs = snapshot.docs;

          // Update the public stage data signals
          changedDocs.forEach((doc) => {
            const answer = doc.data() as StageParticipantAnswer;
            this.answerMap[doc.id] = answer;
            // Load answers to participant answer service
            this.sp.participantAnswerService.addAnswer(doc.id, answer);
          });
          this.areAnswersLoading = false;
        }
      )
    );
  }

  unsubscribeAll() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.unsubscribe = [];

    this.profile = undefined;
    this.answerMap = {};
    this.sp.participantAnswerService.reset();
  }

  reset() {
    this.experimentId = null;
    this.participantId = null;
    this.unsubscribeAll();
    this.sp.cohortService.reset();
  }

  // *********************************************************************** //
  // FIRESTORE                                                               //
  // *********************************************************************** //

  /** Save last stage and complete experiment with success. */
  async completeLastStage() {
    // Use participant answer service verison of profile,
    // which might have updates that need to be written to Firestore
    const profile = this.sp.participantAnswerService.profile;
    if (!profile) {
      return;
    }

    // Add progress timestamps
    const timestamp = Timestamp.now();

    const completedStages = profile.timestamps.completedStages;
    completedStages[profile.currentStageId] = timestamp;

    const endExperiment = timestamp;

    const timestamps = {
      ...profile.timestamps,
      completedStages,
      endExperiment
    };

    // Update status
    const currentStatus = ParticipantStatus.SUCCESS;

    return await this.updateProfile(
      {
        ...profile,
        currentStatus,
        timestamps
      }
    );
  }

  /** End experiment due to failure. */
  async updateExperimentFailure(
    currentStatus: ParticipantStatus,
    navigateToFailurePage = false
  ) {
    if (!this.profile) {
      return;
    }

    // Update endExperiment timestamp and currentStatus
    const endExperiment = Timestamp.now();
    const timestamps = {
      ...this.profile.timestamps,
      endExperiment
    };

    await this.updateProfile(
      {
        ...this.profile,
        timestamps,
        currentStatus,
      }
    );

    // Route to experiment landing (or redirect to Prolific)
    if (!navigateToFailurePage) return;
    this.routeToEndExperiment(currentStatus);
  }

  async routeToEndExperiment(currentStatus: ParticipantStatus) {
    const config = this.sp.experimentService.experiment?.prolificConfig;

    // Redirect to Prolific
    if (config && config.enableProlificIntegration) {
      let redirectCode = config.defaultRedirectCode;
      if (currentStatus === ParticipantStatus.ATTENTION_TIMEOUT && config.attentionFailRedirectCode.length > 0) {
        redirectCode = config.attentionFailRedirectCode;
      } else if (currentStatus === ParticipantStatus.BOOTED_OUT && config.bootedRedirectCode.length > 0) {
        redirectCode = config.bootedRedirectCode;
      }

     // Navigate to Prolific with completion code
      window.location.href = PROLIFIC_COMPLETION_URL_PREFIX + redirectCode;
    }

    else {
      if (currentStatus === ParticipantStatus.BOOTED_OUT) {
        this.sp.routerService.navigate(Pages.HOME);
      } else {
        this.sp.routerService.navigate(Pages.PARTICIPANT, {
          'experiment': this.experimentId!,
          'participant': this.profile!.privateId,
        });
      }
    }
  }

  /** Move to next stage. */
  async progressToNextStage() {
    // Use participant answer profile (as it may include frontend-only
    // updates that should be written to Firestore)
    const profile = this.sp.participantAnswerService.profile;
    if (!this.experimentId || !profile) {
      return;
    }

    // Get new stage ID
    const currentStageId = this.sp.experimentService.getNextStageId(
      profile.currentStageId
    );
    if (currentStageId === null) return;

    // Add progress timestamp
    const completedStages = profile.timestamps.completedStages;
    completedStages[profile.currentStageId] = Timestamp.now();
    const timestamps = {
      ...profile.timestamps,
      completedStages
    };

    await this.updateProfile(
      {
        ...profile,
        currentStageId,
        timestamps
      }
    );
    return currentStageId; // return new stage
  }

  /** Update participant profile */
  async updateProfile(
    config: Partial<ParticipantProfileExtended>,
    isTransfer = false
  ) {
    if (!this.profile) {
      return;
    }

    const participantConfig = {...this.profile, ...config};
    let response = {};

    if (this.experimentId) {
      response = await updateParticipantCallable(
        this.sp.firebaseService.functions, {
          experimentId: this.experimentId,
          isTransfer,
          participantConfig
        }
      );
    }
    return response;
  }

  /** Accept participant transfer. */
  async acceptParticipantTransfer() {
    if (!this.profile || !this.profile.transferCohortId) {
      return;
    }

    // Update transfer timestamp
    const cohortTransfers = this.profile.timestamps.completedStages;
    cohortTransfers[this.profile.currentCohortId] = Timestamp.now();

    // If transfer stage, progress to next stage
    const completedStages = this.profile.timestamps.completedStages;
    let currentStageId = this.profile.currentStageId;

    const stage = this.sp.experimentService.getStage(this.profile.currentStageId);
    if (stage.kind === StageKind.TRANSFER) {
      completedStages[this.profile.currentStageId] = Timestamp.now();
      currentStageId = this.sp.experimentService.getNextStageId(
        this.profile.currentStageId
      ) ?? '';
    }

    const timestamps = {
      ...this.profile.timestamps,
      cohortTransfers,
      completedStages,
    };

    const accepted = await this.updateProfile(
      {
        ...this.profile,
        currentCohortId: this.profile.transferCohortId,
        transferCohortId: null,
        currentStageId,
        currentStatus: ParticipantStatus.IN_PROGRESS,
      },
      true
    );

    // Once profile is updated, route the participant accordingly
    window.location.reload();

    return accepted;
  }

  /** Send chat message. */
  async createChatMessage(config: Partial<ParticipantChatMessage> = {}) {
    let response = {};
    this.isSendingChat = true;
    if (this.experimentId && this.profile) {
      const chatMessage = createParticipantChatMessage({
        ...config,
        discussionId: this.sp.cohortService.getChatDiscussionId(this.profile.currentStageId),
        participantPublicId: this.profile.publicId,
        profile: {
          name: this.profile.name ?? this.profile.publicId,
          avatar: this.profile.avatar,
          pronouns: this.profile.pronouns,
        }
      });

      const createData: CreateChatMessageData = {
        experimentId: this.experimentId,
        cohortId: this.profile.currentCohortId,
        stageId: this.profile.currentStageId,
        chatMessage
      };

      response = await createChatMessageCallable(
        this.sp.firebaseService.functions, createData
      );
    }
    this.isSendingChat = false;
    return response;
  }

  /** Update participant's ready to end chat answer. */
  async updateReadyToEndChatDiscussion(
    stageId: string,
    discussionId: string,
  ) {
    let response = {};

    if (this.experimentId && this.profile) {
      const answer = this.answerMap[stageId];
      const chatStageParticipantAnswer = answer ? (answer as ChatStageParticipantAnswer)
        : createChatStageParticipantAnswer({ id: stageId });

      chatStageParticipantAnswer.discussionTimestampMap[discussionId] = Timestamp.now();

      const createData: UpdateChatStageParticipantAnswerData = {
        experimentId: this.experimentId,
        cohortId: this.profile.currentCohortId,
        participantPrivateId: this.profile.privateId,
        participantPublicId: this.profile.publicId,
        chatStageParticipantAnswer
      };

      response = await updateChatStageParticipantAnswerCallable(
        this.sp.firebaseService.functions,
        createData
      );
    }
    return response;
  }

  /** Update single participant survey stage answer. */
  async updateSurveyStageParticipantAnswer(
    id: string, // survey stage ID
    updatedAnswer: SurveyAnswer,
  ) {
    let response = {};

    let participantAnswer = this.answerMap[id] as SurveyStageParticipantAnswer;
    if (!participantAnswer) {
      participantAnswer = createSurveyStageParticipantAnswer({id});
    }
    participantAnswer.answerMap[updatedAnswer.id] = updatedAnswer;

    if (this.experimentId && this.profile) {
      response = await updateSurveyStageParticipantAnswerCallable(
        this.sp.firebaseService.functions, {
          experimentId: this.experimentId,
          cohortId: this.profile.currentCohortId,
          participantPrivateId: this.profile.privateId,
          participantPublicId: this.profile.publicId,
          surveyStageParticipantAnswer: participantAnswer,
        }
      );
    }
    return response;
  }

  /** Update participant survey answerMap. */
  async updateSurveyStageParticipantAnswerMap(
    id: string, // survey stage ID,
    answerMap: Record<string, SurveyAnswer>, // map of question ID to answer
  ) {
    let response = {};

    let participantAnswer = this.answerMap[id] as SurveyStageParticipantAnswer;
    if (!participantAnswer) {
      participantAnswer = createSurveyStageParticipantAnswer({id});
    }
    participantAnswer.answerMap = answerMap;

    if (this.experimentId && this.profile) {
      response = await updateSurveyStageParticipantAnswerCallable(
        this.sp.firebaseService.functions, {
          experimentId: this.experimentId,
          cohortId: this.profile.currentCohortId,
          participantPrivateId: this.profile.privateId,
          participantPublicId: this.profile.publicId,
          surveyStageParticipantAnswer: participantAnswer,
        }
      );
    }
    return response;
  }

  /** Update survey-per-participant answerMap. */
  async updateSurveyPerParticipantStageParticipantAnswerMap(
    id: string, // survey stage ID,
    // map of participant ID to (map of question ID to answer)
    answerMap: Record<string, Record<string, SurveyAnswer>>,
  ) {
    let response = {};

    let participantAnswer = this.answerMap[id] as SurveyPerParticipantStageParticipantAnswer;
    if (!participantAnswer) {
      participantAnswer = createSurveyPerParticipantStageParticipantAnswer({id});
    }
    participantAnswer.answerMap = answerMap;

    if (this.experimentId && this.profile) {
      response = await updateSurveyPerParticipantStageParticipantAnswerCallable(
        this.sp.firebaseService.functions, {
          experimentId: this.experimentId,
          participantPrivateId: this.profile.privateId,
          surveyPerParticipantStageParticipantAnswer: participantAnswer,
        }
      );
    }
    return response;
  }

  /** Update participant's ranking stage answer. */
  async updateRankingStageParticipantAnswer(
    stageId: string, // ranking stage ID
    rankingList: string[], // list of rankings
  ) {
    let response = {};
    if (this.experimentId && this.profile) {
      response = await updateRankingStageParticipantAnswerCallable(
        this.sp.firebaseService.functions, {
          experimentId: this.experimentId,
          cohortId: this.profile.currentCohortId,
          participantPublicId: this.profile.publicId,
          participantPrivateId: this.profile.privateId,
          stageId,
          rankingList,
        }
      );
    }
    return response;
  }
}