import {computed, makeObservable, observable} from 'mobx';

import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';

import {updateStageCallable} from '../shared/callables';
import {ExperimenterService} from './experimenter_service';
import {FirebaseService} from './firebase_service';
import {Pages, RouterService} from './router_service';
import {Service} from './service';

import {
  Experiment,
  lookupTable,
  LostAtSeaQuestionAnswer,
  LostAtSeaSurveyStagePublicData,
  Message,
  PARTICIPANT_COMPLETION_TYPE,
  ParticipantProfile,
  ParticipantProfileExtended,
  PayoutCurrency,
  PayoutStageConfig,
  PublicStageData,
  ScoringBundle,
  ScoringItem,
  StageAnswer,
  StageConfig,
  StageKind,
  VoteForLeaderStagePublicData,
} from '@llm-mediation-experiments/utils';
import {collectSnapshotWithId, getPayouts} from '../shared/utils';

interface ServiceProvider {
  experimenterService: ExperimenterService;
  firebaseService: FirebaseService;
  routerService: RouterService;
}

/** Manages state for current experiment.
 * This includes adding, transferring, and deleting participants.
 */
export class ExperimentService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  @observable id: string | null = null;
  @observable experiment: Experiment | undefined = undefined;

  @observable stageConfigMap: Record<string, StageConfig> = {};
  @observable publicStageDataMap: Record<string, PublicStageData | undefined> =
    {};

  // Experimenter-accessible participant details (e.g., including private ID).
  // For participant access to profiles, use getParticipantProfile(s)
  @observable privateParticipants: ParticipantProfileExtended[] = [];

  // Loading
  @observable unsubscribe: Unsubscribe[] = [];
  @observable isConfigLoading = false;
  @observable isPublicStageDataLoading = false;
  @observable isMetadataLoading = false;

  @computed get isLoading() {
    return (
      this.isConfigLoading ||
      this.isPublicStageDataLoading ||
      this.isMetadataLoading
    );
  }
  set isLoading(value: boolean) {
    this.isConfigLoading = value;
    this.isPublicStageDataLoading = value;
    this.isMetadataLoading = value;
  }

  setExperimentId(id: string | null) {
    this.id = id;
    this.isLoading = true;
    this.loadStageData();
  }

  updateForCurrentRoute() {
    const id = this.sp.routerService.activeRoute.params['experiment'];
    if (id !== this.id) {
      this.setExperimentId(id);
    }
  }

  loadStageData() {
    this.unsubscribeAll();

    if (this.id === null) {
      this.isLoading = false;
      return;
    }

    // Subscribe to the experiment
    this.unsubscribe.push(
      onSnapshot(
        doc(this.sp.firebaseService.firestore, 'experiments', this.id),
        (doc) => {
          this.experiment = {id: doc.id, ...doc.data()} as Experiment;
          this.isMetadataLoading = false;
        }
      )
    );

    // Subscribe to the public stage data
    this.unsubscribe.push(
      onSnapshot(
        collection(
          this.sp.firebaseService.firestore,
          'experiments',
          this.id,
          'publicStageData'
        ),
        (snapshot) => {
          let changedDocs = snapshot.docChanges().map((change) => change.doc);
          if (changedDocs.length === 0) changedDocs = snapshot.docs;

          // Update the public stage data signals
          changedDocs.forEach((doc) => {
            this.publicStageDataMap[doc.id] = doc.data() as PublicStageData;
          });

          this.isPublicStageDataLoading = false;
        }
      )
    );

    // Fetch the experiment config
    this.unsubscribe.push(
      onSnapshot(
        collection(
          this.sp.firebaseService.firestore,
          'experiments',
          this.id,
          'stages'
        ),
        (snapshot) => {
          let changedDocs = snapshot.docChanges().map((change) => change.doc);
          if (changedDocs.length === 0) {
            changedDocs = snapshot.docs;
          }

          changedDocs.forEach((doc) => {
            const data = doc.data() as StageConfig;
            this.stageConfigMap[doc.id] = data;
          });

          this.isConfigLoading = false;

          // Load participants
          this.loadExperimentParticipants();
        }
      )
    );
  }

  private loadExperimentParticipants() {
    if (this.id !== null) {
      // Bind the array to the firestore collection
      this.unsubscribe.push(
        onSnapshot(
          collection(
            this.sp.firebaseService.firestore,
            'experiments',
            this.id,
            'participants'
          ),
          (snapshot) => {
            // Replace the values in the array in place to not break the reference
            this.privateParticipants.splice(
              0,
              this.privateParticipants.length,
              ...collectSnapshotWithId<ParticipantProfileExtended>(
                snapshot,
                'privateId'
              )
            );
          }
        )
      );
    }
  }

  unsubscribeAll() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.unsubscribe = [];

    // Reset stage configs
    this.stageConfigMap = {};
    this.publicStageDataMap = {};
    this.experiment = undefined;
  }

  @computed get stageIds(): string[] {
    return this.experiment?.stageIds ?? [];
  }

  private isInactive(participant: ParticipantProfile) {
    return (
      participant.completedExperiment &&
      participant.completionType !== PARTICIPANT_COMPLETION_TYPE.SUCCESS
    );
  }

  getStage(stageId: string) {
    return this.stageConfigMap[stageId];
  }

  getStageName(stageId: string, withNumber = false) {
    if (this.isLoading) {
      return 'Loading...';
    }

    const stageNumber = withNumber
      ? `${this.getStageIndex(stageId) + 1}. `
      : '';
    return `${stageNumber}${this.stageConfigMap[stageId]?.name}`;
  }

  getStageIndex(stageId: string) {
    return this.stageIds.indexOf(stageId);
  }

  getNextStageId(stageId: string) {
    const currentIndex = this.getStageIndex(stageId);
    if (currentIndex >= 0 && currentIndex < this.stageIds.length - 1) {
      return this.stageIds[currentIndex + 1];
    }
    return null;
  }

  getPublicStageData(stageId: string) {
    return this.publicStageDataMap[stageId];
  }

  // Returns lists of participants who are/aren't past the given stage
  getParticipantsCompletedStage(stageId: string) {
    const completed: ParticipantProfile[] = [];
    const notCompleted: ParticipantProfile[] = [];

    const stageIndex = this.getStageIndex(stageId);

    if (stageIndex === -1) {
      return {completed, notCompleted};
    }

    this.getParticipantProfiles().forEach((participant) => {
      const index = this.getStageIndex(participant.currentStageId);
      if (index >= 0 && index > stageIndex) {
        completed.push(participant);
      } else {
        notCompleted.push(participant);
      }
    });

    return {completed, notCompleted};
  }

  // Returns lists of participants who have/haven't reached the given stage
  getParticipantsReadyForStage(stageId: string) {
    const ready: ParticipantProfile[] = [];
    const notReady: ParticipantProfile[] = [];

    const stageIndex = this.getStageIndex(stageId);
    if (stageIndex === -1) {
      return {ready, notReady};
    }

    this.getParticipantProfiles().forEach((participant) => {
      const index = this.getStageIndex(participant.currentStageId);
      if ((index >= 0 && index >= stageIndex) || this.isInactive(participant)) {
        ready.push(participant);
      } else {
        notReady.push(participant);
      }
    });

    return {ready, notReady};
  }

  // Returns whether or not given participant is ready to end chat
  getParticipantReadyToEndChat(stageId: string, publicId: string) {
    const stage = this.publicStageDataMap[stageId];
    if (!stage || stage.kind !== StageKind.GroupChat) {
      return false;
    }

    return stage.readyToEndChat[publicId];
  }

  // Returns lists of participants who are/aren't ready to end chat
  getParticipantsReadyToEndChat(stageId: string) {
    const ready: ParticipantProfile[] = [];
    const notReady: ParticipantProfile[] = [];

    const stage = this.publicStageDataMap[stageId];

    if (!stage || stage.kind !== StageKind.GroupChat) {
      return {ready, notReady};
    }

    Object.keys(stage.readyToEndChat).forEach((publicId) => {
      const participant = this.getParticipantProfile(publicId);
      if (!participant) {
        return;
      }

      if (this.isInactive(participant) || stage.readyToEndChat[publicId]) {
        ready.push(participant);
      } else {
        notReady.push(participant);
      }
    });

    return {ready, notReady};
  }

  getParticipantProfiles(): ParticipantProfile[] {
    return Object.values(this.experiment?.participants ?? {});
  }

  getParticipantProfile(publicId: string) {
    return this.experiment?.participants[publicId];
  }

  isReadyToEndChat(stageId: string, publicId: string) {
    const stage = this.publicStageDataMap[stageId];
    if (!stage || stage.kind !== StageKind.GroupChat) {
      return false;
    }

    return stage.readyToEndChat[publicId];
  }

  async markParticipantReadyToEndChat(
    readyToEndChat: boolean,
    participantId: string,
    stageId: string
  ) {
    return updateStageCallable(this.sp.firebaseService.functions, {
      experimentId: this.experiment?.id!,
      participantId: participantId,
      stageId: stageId,
      stage: {
        kind: StageKind.GroupChat,
        readyToEndChat,
      },
    });
  }

  markParticipantCompleted(publicId: string) {
    // Mark the participant as completed in any chats.
    for (const stageId of Object.keys(this.publicStageDataMap)) {
      const stage = this.publicStageDataMap[stageId];
      if (stage && stage!.kind === StageKind.GroupChat) {
        this.markParticipantReadyToEndChat(true, publicId, stageId);
      }
    }
  }

  canAddParticipant() {
    if (!this.experiment?.participantConfig.numberOfMaxParticipants) {
      return true;
    } else {
      return (
        this.experiment?.numberOfParticipants! <
        this.experiment?.participantConfig.numberOfMaxParticipants!
      );
    }
  }

  canStartExperiment() {
    if (
      !this.experiment?.participantConfig.waitForAllToStart ||
      !this.experiment?.participantConfig.numberOfMaxParticipants
    ) {
      return true;
    }
    return (
      this.experiment?.numberOfParticipants! ==
      this.experiment?.participantConfig.numberOfMaxParticipants!
    );
  }

  /** Build a signal that tracks whether every participant has at least reached the given stage */
  everyoneReachedStage(targetStageId: string): boolean {
    const participants = this.experiment?.participants;
    const targetIndex = this.getStageIndex(targetStageId);

    if (!participants || targetIndex === -1) return false;

    return Object.values(participants).every(
      (participant) =>
        this.getStageIndex(participant.currentStageId) >= targetIndex ||
        this.isInactive(participant)
    );
  }

  /** Get payouts map. */
  getPayouts(config: PayoutStageConfig) {
    return getPayouts(
      config,
      this.privateParticipants,
      this.publicStageDataMap
    );
  }

  // ******************************************************************************************* //
  //                                           MUTATIONS                                         //
  // ******************************************************************************************* //

  /**
   * Join the current experiment as a participant.
   */
  async join(participantData: Partial<ParticipantProfile>) {
    if (!this.id) {
      return;
    }

    try {
      const response = await this.sp.experimenterService.createParticipant(
        this.id!,
        participantData
      );
      const participant = response.participant;

      // Navigate to page for created participant
      this.sp.routerService.navigate(Pages.PARTICIPANT, {
        experiment: this.id!,
        participant: participant.privateId,
      });
      this.sp.routerService.setExperimenterNav(false);
    } catch (error) {
      console.log('Error creating participant for: ', error);
      throw error;
    }
  }

  async deleteParticipant(experimentId: string, participantId: string) {
    const response = await this.sp.experimenterService.deleteParticipant(
      experimentId,
      participantId
    );
    return response;
  }

  /** Delete the experiment..
   * @rights Experimenter
   */
  async delete() {
    return this.sp.experimenterService.deleteExperiment(this.id!);
  }
}
