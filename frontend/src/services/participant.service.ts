import {
  ParticipantProfileExtended,
  ParticipantStatus,
  StageParticipantAnswer,
  createParticipantProfileExtended
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
import {Service} from './service';

import {
  updateParticipantCallable
} from '../shared/callables';

interface ServiceProvider {
  cohortService: CohortService;
  experimentService: ExperimentService;
  firebaseService: FirebaseService;
  routerService: RouterService;
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
          'stages'
        ),
        (snapshot) => {
          let changedDocs = snapshot.docChanges().map((change) => change.doc);
          if (changedDocs.length === 0) changedDocs = snapshot.docs;

          // Update the public stage data signals
          changedDocs.forEach((doc) => {
            this.answerMap[doc.id] = doc.data() as StageParticipantAnswer;
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

    return await this.updateProfile(
      {
        ...this.profile,
        currentCohortId: this.profile.transferCohortId,
        transferCohortId: null,
        currentStatus: ParticipantStatus.IN_PROGRESS,
      }
    );
  }
}