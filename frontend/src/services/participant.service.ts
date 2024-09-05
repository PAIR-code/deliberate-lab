import {
  CreateChatMessageData,
  ParticipantChatMessage,
  ParticipantProfileExtended,
  ParticipantStatus,
  StageKind,
  StageParticipantAnswer,
  SurveyAnswer,
  SurveyStageParticipantAnswer,
  createParticipantChatMessage,
  createParticipantProfileExtended,
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
import {RouterService} from './router.service';
import {SurveyService} from './survey.service';
import {Service} from './service';

import {
  createChatMessageCallable,
  updateParticipantCallable,
  updateSurveyStageParticipantAnswerCallable,
} from '../shared/callables';

interface ServiceProvider {
  cohortService: CohortService;
  experimentService: ExperimentService;
  firebaseService: FirebaseService;
  routerService: RouterService;
  surveyService: SurveyService;
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

  @computed get completedExperiment() {
    return this.profile?.currentStatus !== ParticipantStatus.IN_PROGRESS
  }

  @computed get currentStageAnswer() {
    if (!this.profile) return undefined;
    return this.answerMap[this.profile.currentStageId];
  }

  updateForCurrentRoute() {
    const eid = this.sp.routerService.activeRoute.params['experiment'];
    const pid = this.sp.routerService.activeRoute.params['participant'];
    if (eid !== this.experimentId || pid !== this.participantId) {
      this.setParticipant(eid, pid);
    }
  }

  loadParticipantData() {
    this.unsubscribeAll();

    if (this.experimentId === null || this.participantId === null) {
      this.isLoading = false;
      return;
    }

    this.unsubscribe.push(
      onSnapshot(
        doc(
          this.sp.firebaseService.firestore,
          'experiments',
          this.experimentId,
          'participants',
          this.participantId
        ),
        (doc) => {
          this.profile = doc.data() as ParticipantProfileExtended;
          this.sp.cohortService.loadCohortData(this.profile.currentCohortId);
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
            // Load relevant answers to survey service
            if (answer.kind === StageKind.SURVEY) {
              this.sp.surveyService.addSurveyAnswer(answer);
            }
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
  }

  // *********************************************************************** //
  // FIRESTORE                                                               //
  // *********************************************************************** //

  /** Save last stage and complete experiment. */
  async completeLastStage() {
    if (!this.profile) {
      return;
    }

    // Add progress timestamps
    const timestamp = Timestamp.now();

    const completedStages = this.profile.timestamps.completedStages;
    completedStages[this.profile.currentStageId] = timestamp;

    const endExperiment = timestamp;

    const timestamps = {
      ...this.profile.timestamps,
      completedStages,
      endExperiment
    };

    // Update status
    const currentStatus = ParticipantStatus.SUCCESS;

    return await this.updateProfile(
      {
        ...this.profile,
        currentStatus,
        timestamps
      }
    );
  }

  /** Move to next stage. */
  async progressToNextStage() {
    if (!this.experimentId || !this.profile) {
      return;
    }

    // Get new stage ID
    const currentStageId = this.sp.experimentService.getNextStageId(
      this.profile.currentStageId
    );
    if (currentStageId === null) return;

    // Add progress timestamp
    const completedStages = this.profile.timestamps.completedStages;
    completedStages[this.profile.currentStageId] = Timestamp.now();
    const timestamps = {
      ...this.profile.timestamps,
      completedStages
    };

    return await this.updateProfile(
      {
        ...this.profile,
        currentStageId,
        timestamps
      }
    );
  }

  /** Update participant profile */
  async updateProfile(config: Partial<ParticipantProfileExtended>) {
    if (!this.profile) {
      return;
    }

    const participantConfig = {...this.profile, ...config};
    let response = {};

    if (this.experimentId) {
      response = await updateParticipantCallable(
        this.sp.firebaseService.functions, {
          experimentId: this.experimentId,
          participantConfig
        }
      );
    }
    return response;
  }

  /** Accept participant transfer. */
  async acceptParticipantTransfer() {
    if (!this.profile?.transferCohortId) {
      return;
    }

    // Update transfer timestamp
    const cohortTransfers = this.profile.timestamps.completedStages;
    cohortTransfers[this.profile.currentCohortId] = Timestamp.now();
    const timestamps = {
      ...this.profile.timestamps,
      cohortTransfers
    };

    return await this.updateProfile(
      {
        ...this.profile,
        currentCohortId: this.profile.transferCohortId,
        transferCohortId: null,
        currentStatus: ParticipantStatus.IN_PROGRESS,
      }
    );
  }

  /** Send chat message. */
  async createChatMessage(config: Partial<ParticipantChatMessage> = {}) {
    let response = {};
    this.isSendingChat = true;
    if (this.experimentId && this.profile) {
      // TODO: Get current discussion from chat answers
      const chatMessage = createParticipantChatMessage({
        ...config,
        participantPublicId: this.profile.publicId,
        profile: {
          name: this.profile.name,
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

  /** Update participant's survey stage answer. */
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
          participantId: this.profile.privateId,
          surveyStageParticipantAnswer: participantAnswer,
        }
      );
    }
    return response;
  }
}