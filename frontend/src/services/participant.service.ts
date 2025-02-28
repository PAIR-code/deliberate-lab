import {
  ChatStageParticipantAnswer,
  ChipOffer,
  CreateChatMessageData,
  RankingItem,
  ParticipantChatMessage,
  ParticipantProfileBase,
  ParticipantProfileExtended,
  ParticipantStatus,
  StageKind,
  StageParticipantAnswer,
  SurveyAnswer,
  SurveyPerParticipantStageParticipantAnswer,
  SurveyStageParticipantAnswer,
  UnifiedTimestamp,
  UpdateChatStageParticipantAnswerData,
  createChatStageParticipantAnswer,
  createParticipantChatMessage,
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
import {action, computed, makeObservable, observable} from 'mobx';
import {CohortService} from './cohort.service';
import {ExperimentService} from './experiment.service';
import {FirebaseService} from './firebase.service';
import {ParticipantAnswerService} from './participant.answer';
import {Service} from './service';

import {
  acceptParticipantCheckCallable,
  acceptParticipantExperimentStartCallable,
  acceptParticipantTransferCallable,
  createChatMessageCallable,
  sendAlertMessageCallable,
  sendChipOfferCallable,
  sendChipResponseCallable,
  setChipTurnCallable,
  setSalespersonControllerCallable,
  setSalespersonMoveCallable,
  setSalespersonResponseCallable,
  updateParticipantAcceptedTOSCallable,
  updateParticipantFailureCallable,
  updateParticipantProfileCallable,
  updateParticipantToNextStageCallable,
  updateParticipantWaitingCallable,
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
import {ElectionStrategy} from '@deliberation-lab/utils';

interface ServiceProvider {
  cohortService: CohortService;
  experimentService: ExperimentService;
  firebaseService: FirebaseService;
  participantAnswerService: ParticipantAnswerService;
}

export class ParticipantService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  @observable experimentId: string | null = null;
  @observable participantId: string | null = null;

  // current stage being viewed by participant/experimenter
  @observable currentStageViewId: string | undefined = undefined;

  @observable profile: ParticipantProfileExtended | undefined = undefined;
  @observable answerMap: Record<string, StageParticipantAnswer | undefined> =
    {};

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

  // If transfer cohort ID is not null
  @computed get isPendingTransfer() {
    return this.profile?.transferCohortId !== null;
  }

  isCurrentStage(stageId: string = this.currentStageViewId ?? '') {
    return this.profile?.currentStageId === stageId;
  }

  isLastStage(stageId: string = this.currentStageViewId ?? '') {
    const ids = this.sp.experimentService.stageIds;
    return ids.length > 0 && ids[ids.length - 1] === stageId;
  }

  @computed get disableStage() {
    return this.completedExperiment || !this.isCurrentStage();
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

  @action setCurrentStageView(stageId: string | undefined) {
    this.currentStageViewId = stageId;
  }

  updateForRoute(
    experimentId: string, // experiment ID
    participantId: string, // participant ID
    stageId: string | undefined = undefined, // stage ID
  ) {
    // If stage params exist, set current stage view to stage ID
    if (stageId) {
      this.currentStageViewId = stageId;
    }

    if (
      experimentId !== this.experimentId ||
      participantId !== this.participantId
    ) {
      this.setParticipant(experimentId, participantId);
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
      this.experimentId,
      this.participantId,
    );

    // Subscribe to profile
    this.unsubscribe.push(
      onSnapshot(
        doc(
          this.sp.firebaseService.firestore,
          'experiments',
          this.experimentId,
          'participants',
          this.participantId,
        ),
        async (doc) => {
          this.profile = doc.data() as ParticipantProfileExtended;
          // Load cohort data
          if (this.experimentId) {
            await this.sp.cohortService.loadCohortData(
              this.experimentId,
              this.profile.currentCohortId,
            );
          }

          // Load profile to participant answer service
          this.sp.participantAnswerService.setProfile(this.profile);
          // Set current stage (use undefined if experiment not started)
          if (this.profile.timestamps.startExperiment) {
            this.currentStageViewId = this.profile.currentStageId;
          } else {
            this.currentStageViewId = undefined;
          }

          this.isProfileLoading = false;
        },
      ),
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
          'stageData',
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
        },
      ),
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

  /** End experiment due to failure. */
  async updateExperimentFailure(
    status:
      | ParticipantStatus.TRANSFER_DECLINED
      | ParticipantStatus.TRANSFER_TIMEOUT,
    navigateToFailurePage = false,
  ) {
    if (!this.experimentId || !this.profile) {
      return;
    }

    await updateParticipantFailureCallable(this.sp.firebaseService.functions, {
      experimentId: this.experimentId,
      participantId: this.profile.privateId,
      status,
    });

    // Route to experiment landing (or redirect to Prolific)
    if (!navigateToFailurePage) return;
    this.routeToEndExperiment(status);
  }

  async routeToEndExperiment(currentStatus: ParticipantStatus) {
    const config = this.sp.experimentService.experiment?.prolificConfig;

    // Redirect to Prolific if prolific integration is set up
    if (config && config.enableProlificIntegration) {
      let redirectCode = config.defaultRedirectCode;
      if (
        currentStatus === ParticipantStatus.ATTENTION_TIMEOUT &&
        config.attentionFailRedirectCode.length > 0
      ) {
        redirectCode = config.attentionFailRedirectCode;
      } else if (
        currentStatus === ParticipantStatus.BOOTED_OUT &&
        config.bootedRedirectCode.length > 0
      ) {
        redirectCode = config.bootedRedirectCode;
      }

      // Navigate to Prolific with completion code
      window.location.href = PROLIFIC_COMPLETION_URL_PREFIX + redirectCode;
      return;
    }

    // Otherwise, route to main participant page
    if (!this.experimentId || !this.profile) return;
    this.currentStageViewId = undefined;
  }

  /** Complete waiting phase for stage. */
  async updateWaitingPhaseCompletion(stageId: string) {
    if (!this.experimentId || !this.profile) return false;
    await updateParticipantWaitingCallable(this.sp.firebaseService.functions, {
      experimentId: this.experimentId,
      participantId: this.profile.privateId,
      stageId,
    });
  }

  /** Move to next stage. */
  async progressToNextStage() {
    if (!this.experimentId || !this.profile) {
      return;
    }

    const result = await updateParticipantToNextStageCallable(
      this.sp.firebaseService.functions,
      {
        experimentId: this.experimentId,
        participantId: this.profile.privateId,
      },
    );

    if (result.endExperiment) {
      this.routeToEndExperiment(ParticipantStatus.SUCCESS);
    } else if (result.currentStageId) {
      // Route to next stage
      this.currentStageViewId = result.currentStageId;
    }

    return result.currentStageId ?? '';
  }

  /** Update participant TOS response. */
  async updateParticipantTOS(acceptedTOS: UnifiedTimestamp | null) {
    if (!this.profile) {
      return;
    }

    let response = {};

    if (this.experimentId) {
      response = await updateParticipantAcceptedTOSCallable(
        this.sp.firebaseService.functions,
        {
          experimentId: this.experimentId,
          participantId: this.profile.privateId,
          acceptedTOS,
        },
      );
    }
    return response;
  }

  /** Accept participant transfer. */
  async acceptParticipantTransfer() {
    if (!this.experimentId || !this.profile) {
      return;
    }

    const result = await acceptParticipantTransferCallable(
      this.sp.firebaseService.functions,
      {
        experimentId: this.experimentId,
        participantId: this.profile.privateId,
      },
    );

    if (result.endExperiment) {
      this.routeToEndExperiment(ParticipantStatus.SUCCESS);
    } else if (result.currentStageId) {
      // Route to next stage
      this.currentStageViewId = result.currentStageId;
    }

    return result.currentStageId ?? '';
  }

  /** Update participant base profile. */
  async updateParticipantProfile(
    baseProfile: ParticipantProfileBase,
    progressToNextStage = true,
  ) {
    if (!this.profile) {
      return;
    }
    const participantProfileBase = baseProfile;
    const participantId = this.profile.privateId;
    let response = {};

    if (this.experimentId) {
      response = await updateParticipantProfileCallable(
        this.sp.firebaseService.functions,
        {
          experimentId: this.experimentId,
          participantId,
          participantProfileBase,
        },
      );
    }

    if (progressToNextStage) {
      await this.progressToNextStage();
    }

    return response;
  }

  /** Start experiment. */
  async startExperiment() {
    if (!this.experimentId || !this.profile) return;
    await acceptParticipantExperimentStartCallable(
      this.sp.firebaseService.functions,
      {
        experimentId: this.experimentId,
        participantId: this.profile.privateId,
      },
    );
  }

  /** Accept attention check. */
  async resolveAttentionCheck() {
    if (!this.experimentId || !this.profile) return;
    await acceptParticipantCheckCallable(this.sp.firebaseService.functions, {
      experimentId: this.experimentId,
      participantId: this.profile.privateId,
    });
  }

  /** Send chat message. */
  async createChatMessage(config: Partial<ParticipantChatMessage> = {}) {
    let response = {};
    this.isSendingChat = true;
    if (this.experimentId && this.profile) {
      const chatMessage = createParticipantChatMessage({
        ...config,
        discussionId: this.sp.cohortService.getChatDiscussionId(
          this.profile.currentStageId,
        ),
        participantPublicId: this.profile.publicId,
        profile: {
          name: this.profile.name,
          avatar: this.profile.avatar,
          pronouns: this.profile.pronouns,
        },
      });

      const createData: CreateChatMessageData = {
        experimentId: this.experimentId,
        cohortId: this.profile.currentCohortId,
        stageId: this.profile.currentStageId,
        chatMessage,
      };

      response = await createChatMessageCallable(
        this.sp.firebaseService.functions,
        createData,
      );
    }
    this.isSendingChat = false;
    return response;
  }

  /** Update participant's ready to end chat answer. */
  async updateReadyToEndChatDiscussion(stageId: string, discussionId: string) {
    let response = {};

    if (this.experimentId && this.profile) {
      const answer = this.answerMap[stageId];
      const chatStageParticipantAnswer = answer
        ? (answer as ChatStageParticipantAnswer)
        : createChatStageParticipantAnswer({id: stageId});

      chatStageParticipantAnswer.discussionTimestampMap[discussionId] =
        Timestamp.now();

      const createData: UpdateChatStageParticipantAnswerData = {
        experimentId: this.experimentId,
        cohortId: this.profile.currentCohortId,
        participantPrivateId: this.profile.privateId,
        participantPublicId: this.profile.publicId,
        chatStageParticipantAnswer,
      };

      response = await updateChatStageParticipantAnswerCallable(
        this.sp.firebaseService.functions,
        createData,
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
        this.sp.firebaseService.functions,
        {
          experimentId: this.experimentId,
          cohortId: this.profile.currentCohortId,
          participantPrivateId: this.profile.privateId,
          participantPublicId: this.profile.publicId,
          surveyStageParticipantAnswer: participantAnswer,
        },
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
        this.sp.firebaseService.functions,
        {
          experimentId: this.experimentId,
          cohortId: this.profile.currentCohortId,
          participantPrivateId: this.profile.privateId,
          participantPublicId: this.profile.publicId,
          surveyStageParticipantAnswer: participantAnswer,
        },
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

    let participantAnswer = this.answerMap[
      id
    ] as SurveyPerParticipantStageParticipantAnswer;
    if (!participantAnswer) {
      participantAnswer = createSurveyPerParticipantStageParticipantAnswer({
        id,
      });
    }
    participantAnswer.answerMap = answerMap;

    if (this.experimentId && this.profile) {
      response = await updateSurveyPerParticipantStageParticipantAnswerCallable(
        this.sp.firebaseService.functions,
        {
          experimentId: this.experimentId,
          participantPrivateId: this.profile.privateId,
          surveyPerParticipantStageParticipantAnswer: participantAnswer,
        },
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
        this.sp.firebaseService.functions,
        {
          experimentId: this.experimentId,
          cohortId: this.profile.currentCohortId,
          participantPublicId: this.profile.publicId,
          participantPrivateId: this.profile.privateId,
          stageId,
          rankingList,
        },
      );
    }
    return response;
  }

  /** Send participant chip offer. */
  async sendParticipantChipOffer(stageId: string, chipOffer: ChipOffer) {
    let response = {};
    if (this.experimentId && this.profile) {
      response = await sendChipOfferCallable(
        this.sp.firebaseService.functions,
        {
          experimentId: this.experimentId,
          cohortId: this.profile.currentCohortId,
          participantPublicId: this.profile.publicId,
          participantPrivateId: this.profile.privateId,
          stageId,
          chipOffer,
        },
      );
    }
    return response;
  }

  /** Send participant chip response. */
  async sendParticipantChipResponse(stageId: string, chipResponse: boolean) {
    let response = {};
    if (this.experimentId && this.profile) {
      response = await sendChipResponseCallable(
        this.sp.firebaseService.functions,
        {
          experimentId: this.experimentId,
          cohortId: this.profile.currentCohortId,
          participantPublicId: this.profile.publicId,
          participantPrivateId: this.profile.privateId,
          stageId,
          chipResponse,
        },
      );
    }
    return response;
  }

  /** Set chip turn for current stage and cohort. */
  async setChipTurn(stageId: string) {
    let response = {};
    if (this.experimentId && this.profile) {
      response = await setChipTurnCallable(this.sp.firebaseService.functions, {
        experimentId: this.experimentId,
        cohortId: this.profile.currentCohortId,
        stageId,
      });
    }
    return response;
  }

  async setSalespersonController(stageId: string) {
    let response = {success: false};
    if (this.experimentId && this.profile) {
      response = await setSalespersonControllerCallable(
        this.sp.firebaseService.functions,
        {
          experimentId: this.experimentId,
          cohortId: this.profile.currentCohortId,
          stageId,
        },
      );
    }
    return response.success;
  }

  async setSalespersonMove(
    stageId: string,
    proposedRow: number,
    proposedColumn: number,
  ) {
    let response = {success: false};
    if (this.experimentId && this.profile) {
      response = await setSalespersonMoveCallable(
        this.sp.firebaseService.functions,
        {
          experimentId: this.experimentId,
          cohortId: this.profile.currentCohortId,
          stageId,
          participantId: this.profile.publicId,
          proposedRow,
          proposedColumn,
        },
      );
    }
    return response.success;
  }

  async setSalespersonResponse(stageId: string, response: boolean) {
    let output = {success: false};
    if (this.experimentId && this.profile) {
      output = await setSalespersonResponseCallable(
        this.sp.firebaseService.functions,
        {
          experimentId: this.experimentId,
          cohortId: this.profile.currentCohortId,
          stageId,
          participantId: this.profile.publicId,
          response,
        },
      );
    }
    return output.success;
  }

  async sendAlertMessage(message: string) {
    let response = {};
    if (this.experimentId && this.profile) {
      response = await sendAlertMessageCallable(
        this.sp.firebaseService.functions,
        {
          experimentId: this.experimentId,
          cohortId: this.profile.currentCohortId,
          stageId: this.profile.currentStageId,
          participantId: this.profile.privateId,
          message,
        },
      );
    }
    return response;
  }
}
