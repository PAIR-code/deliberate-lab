import {computed, makeObservable, observable} from 'mobx';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  Timestamp,
  Unsubscribe,
  where,
} from 'firebase/firestore';
import {AuthService} from './auth.service';
import {CohortService} from './cohort.service';
import {ExperimentEditor} from './experiment.editor';
import {ExperimentService} from './experiment.service';
import {FirebaseService} from './firebase.service';
import {ParticipantService} from './participant.service';
import {Pages, RouterService} from './router.service';
import {Service} from './service';

import {
  CohortConfig,
  CohortParticipantConfig,
  CreateChatMessageData,
  Experiment,
  ExperimentDownload,
  HumanMediatorChatMessage,
  MetadataConfig,
  ParticipantProfileExtended,
  ParticipantStatus,
  StageConfig,
  createCohortConfig,
  createHumanMediatorChatMessage,
  generateId,
} from '@deliberation-lab/utils';
import {
  bootParticipantCallable,
  createChatMessageCallable,
  createCohortCallable,
  createParticipantCallable,
  deleteCohortCallable,
  deleteExperimentCallable,
  initiateParticipantTransferCallable,
  sendParticipantCheckCallable,
  setExperimentCohortLockCallable,
  updateCohortMetadataCallable,
  writeExperimentCallable
} from '../shared/callables';
import {
  getCohortParticipants,
  hasMaxParticipantsInCohort,
} from '../shared/cohort.utils';
import {
  downloadCSV,
  downloadJSON,
  getChatHistoryData,
  getChipNegotiationCSV,
  getChipNegotiationData,
  getChipNegotiationPlayerMapCSV,
  getExperimentDownload,
  getParticipantData
} from '../shared/file.utils';
import {
  isObsoleteParticipant,
  requiresAnonymousProfiles
} from '../shared/participant.utils';

interface ServiceProvider {
  authService: AuthService;
  cohortService: CohortService;
  experimentEditor: ExperimentEditor;
  experimentService: ExperimentService;
  firebaseService: FirebaseService;
  participantService: ParticipantService;
  routerService: RouterService;
}

/**
 * Manages experiment cohorts and participants (experimenter view only).
 * - For experiment/stage/role configs, see experiment.service.ts
 * - For experiment editor, see experiment.editor.ts
 */
export class ExperimentManager extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  // Experimenter-only data
  @observable experimentId: string|undefined = undefined;
  @observable cohortMap: Record<string, CohortConfig> = {};
  @observable participantMap: Record<string, ParticipantProfileExtended> = {};

  // Loading
  @observable unsubscribe: Unsubscribe[] = [];
  @observable isCohortsLoading = false;
  @observable isParticipantsLoading = false;

  // Firestore loading (not included in general isLoading)
  @observable isWritingCohort = false;
  @observable isWritingParticipant = false;

  // Experiment edit state
  @observable isEditing = false; // is on an edit page
  @observable isEditingSettingsDialog = false; // is in settings dialog

  // Current participant, view in dashboard
  @observable currentParticipantId: string|undefined = undefined;
  @observable showCohortList = true;
  @observable showParticipantStats = true;
  @observable showParticipantPreview = true;
  @observable hideLockedCohorts = false;

  // Copy of cohort being edited in settings dialog
  @observable cohortEditing: CohortConfig|undefined = undefined;

  async setIsEditing(isEditing: boolean, saveChanges = false) {
    if (!isEditing) {
      this.isEditing = false;
      // If save changes, call writeExperiment
      if (saveChanges) {
        await this.sp.experimentEditor.writeExperiment();
      }
      // Reset experiment editor
      this.sp.experimentEditor.resetExperiment();
      // Reload current experiment to listen to updated changes
      if (this.experimentId) {
        this.sp.experimentService.loadExperiment(this.experimentId);
      }
    } else {
      // Load current experiment into editor
      const experiment = this.sp.experimentService.experiment;
      if (!experiment) return;

      const stages: StageConfig[] = [];
      experiment.stageIds.forEach(id => {
        const stage = this.sp.experimentService.stageConfigMap[id];
        if (stage) stages.push(stage);
      });
      this.sp.experimentEditor.loadExperiment(experiment, stages);
      this.isEditing = true;
    }
  }

  async setIsEditingSettingsDialog(isEditing: boolean, saveChanges = false) {
    this.setIsEditing(isEditing, saveChanges);
    this.isEditingSettingsDialog = isEditing;
  }

  @computed get isCreator() {
    return this.sp.authService.userEmail === this.sp.experimentService.experiment?.metadata.creator
      || !this.sp.experimentService.experiment;
  }

  // Can edit if (no cohorts exist AND is creator) OR new experiment
  @computed get canEditExperimentStages() {
    return (this.isCreator && Object.keys(this.cohortMap).length === 0)
      || this.sp.routerService.activePage === Pages.EXPERIMENT_CREATE;
  }

  // Is editing full experiment, not settings dialog
  @computed get isEditingFull() {
    return this.isEditing && !this.isEditingSettingsDialog;
  }

  setCohortEditing(cohort: CohortConfig|undefined) {
    this.cohortEditing = cohort;
  }

  setShowCohortList(showCohortList: boolean) {
    this.showCohortList = showCohortList;
  }

  setShowParticipantPreview(showParticipantPreview: boolean) {
    this.showParticipantPreview = showParticipantPreview;
  }

  setShowParticipantStats(showParticipantStats: boolean) {
    this.showParticipantStats = showParticipantStats;
  }

  setHideLockedCohorts(hideLockedCohorts: boolean) {
    this.hideLockedCohorts = hideLockedCohorts;
  }

  setCurrentParticipantId(id: string|undefined) {
    this.currentParticipantId = id;

    // Update participant service in order to load correct participant answers
    // (Note: This also updates participant answer service accordingly)
    if (this.experimentId && id) {
      this.sp.participantService.updateForRoute(
        this.experimentId,
        id
      );
    }
  }

  @computed get currentParticipant() {
    if (!this.currentParticipantId) return null;
    return this.participantMap[this.currentParticipantId];
  }

  getNumExperimentParticipants(countObsoleteParticipants = true) {
    const participants = Object.values(this.participantMap);
    if (countObsoleteParticipants) {
      return participants.length;
    }

    return participants.filter(
      participant => !isObsoleteParticipant(participant)
    ).length;
  }

  // Get participants for specified cohort
  getCohortParticipants(
    cohortId: string,
    countObsoleteParticipants = true,
  ) {
    return getCohortParticipants(
      Object.values(this.participantMap),
      cohortId,
      countObsoleteParticipants
    );
  }

  getCohort(id: string) {
    return this.cohortMap[id];
  }

  isFullCohort(cohort: CohortConfig) {
    return hasMaxParticipantsInCohort(
      cohort,
      Object.values(this.participantMap),
    )
  }

  @computed get availableCohorts() {
    return Object.values(this.cohortMap).filter(cohort => !this.isFullCohort(cohort));
  }

  @computed get numCohorts() {
    return Object.keys(this.cohortMap).length;
  }

  @computed get cohortList() {
    if (this.hideLockedCohorts) {
      return Object.values(this.cohortMap).filter(
        cohort => this.sp.experimentService.experiment?.cohortLockMap[cohort.id]
      );
    }
    return Object.values(this.cohortMap);
  }

  @computed get isLoading() {
    return (
      this.isCohortsLoading ||
      this.isParticipantsLoading
    );
  }

  set isLoading(value: boolean) {
    this.isCohortsLoading = value;
    this.isParticipantsLoading = value;
  }

  updateForRoute(experimentId: string) {
    if (experimentId !== this.experimentId) {
      this.experimentId = experimentId;
      this.loadExperimentData(experimentId);
    }
  }

  loadExperimentData(id: string) {
    this.unsubscribeAll();
    this.isLoading = true;

    // Subscribe to cohorts
    this.unsubscribe.push(
      onSnapshot(
        collection(
          this.sp.firebaseService.firestore,
          'experiments',
          id,
          'cohorts'
        ),
        (snapshot) => {
          let changedDocs = snapshot.docChanges().map((change) => change.doc);
          if (changedDocs.length === 0) {
            changedDocs = snapshot.docs;
          }

          changedDocs.forEach((doc) => {
            const data = doc.data() as CohortConfig;
            this.cohortMap[doc.id] = data;
          });

          this.isCohortsLoading = false;
        }
      )
    );

    // Subscribe to participants' private profiles
    this.unsubscribe.push(
      onSnapshot(
        query(
          collection(
            this.sp.firebaseService.firestore,
            'experiments',
            id,
            'participants'
          ),
          where('currentStatus', '!=', ParticipantStatus.DELETED)
        ),
        (snapshot) => {
          let changedDocs = snapshot.docChanges().map((change) => change.doc);
          if (changedDocs.length === 0) {
            changedDocs = snapshot.docs;
          }

          changedDocs.forEach((doc) => {
            const data = doc.data() as ParticipantProfileExtended;
            this.participantMap[doc.id] = data;
          });

          this.isParticipantsLoading = false;
        }
      )
    );
  }

  unsubscribeAll() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.unsubscribe = [];

    // Reset experiment data
    this.cohortMap = {};
    this.participantMap = {};
  }

  reset() {
    this.experimentId = undefined;
    this.unsubscribeAll();
  }

  // *********************************************************************** //
  // FIRESTORE                                                               //
  // *********************************************************************** //

  /** Set cohort lock. */
  async setCohortLock(cohortId: string, isLock: boolean) {
    const experiment = this.sp.experimentService.experiment;
    if (!experiment) return;
    await setExperimentCohortLockCallable(
      this.sp.firebaseService.functions,
      {
        experimentId: experiment.id,
        cohortId,
        isLock
      }
    );
  }

  /** Fork the current experiment. */
  // TODO: Add forkExperiment cloud function on backend
  // that takes in ID of experiment to fork (instead of experiment copy)
  async forkExperiment() {
    const experiment = this.sp.experimentService.experiment;
    if (!experiment) return;

    // Change ID (creator will be changed by cloud functions)
    experiment.id = generateId();
    experiment.metadata.name = `Copy of ${experiment.metadata.name}`;

    // Get ordered list of stages
    const stages: StageConfig[] = [];
    experiment.stageIds.forEach(id => {
      const stage = this.sp.experimentService.stageConfigMap[id];
      if (stage) stages.push(stage);
    });

    let response = {};
    response = await writeExperimentCallable(
      this.sp.firebaseService.functions,
      {
        collectionName: 'experiments',
        experimentConfig: experiment,
        stageConfigs: stages
      }
    );

    // Route to new experiment and reload to update changes
    this.sp.routerService.navigate(Pages.EXPERIMENT, {
        experiment: experiment.id
    });

    return response;
}
  
  /** Deletes the current experiment.
   * @rights Creator of experiment
   */
  async deleteExperiment() {
    if (!this.experimentId || !this.isCreator) return;
    const response = await deleteExperimentCallable(this.sp.firebaseService.functions, {
      collectionName: 'experiments',
      experimentId: this.experimentId,
    });
    this.isEditingSettingsDialog = false;
    this.sp.routerService.navigate(Pages.HOME);
    return response;
  }

  /** Deletes the specified cohort.
   * @rights Creator of experiment
   */
  async deleteCohort(cohortId: string) {
    if (!this.experimentId) return;
    const response = await deleteCohortCallable(this.sp.firebaseService.functions, {
      experimentId: this.experimentId,
      cohortId
    });
    this.loadExperimentData(this.experimentId);
    this.cohortEditing = undefined;
    return response;
  }

  /** Create a new cohort
   * @rights Experimenter
   */
  async createCohort(config: Partial<CohortConfig> = {}, name = '') {
    if (!this.sp.experimentService.experiment) return;

    this.isWritingCohort = true;
    const cohortConfig = createCohortConfig({
      participantConfig: this.sp.experimentService.experiment.defaultCohortConfig,
      ...config
    });
    cohortConfig.metadata.name = name;

    let response = {};

    if (this.experimentId) {
      response = await createCohortCallable(
        this.sp.firebaseService.functions, {
          experimentId: this.experimentId,
          cohortConfig,
        }
      );
    }
    this.isWritingCohort = false;
    return response;
  }

  /** Update existing cohort metadata
   * @rights Experimenter
   */
  async updateCohortMetadata(
    cohortId: string,
    metadata: MetadataConfig,
    participantConfig: CohortParticipantConfig,
  ) {
    if (!this.sp.experimentService.experiment) return;

    this.isWritingCohort = true;
    let response = {};

    if (this.experimentId) {
      response = await updateCohortMetadataCallable(
        this.sp.firebaseService.functions, {
          experimentId: this.experimentId,
          cohortId,
          metadata,
          participantConfig
        }
      );
    }
    this.isWritingCohort = false;
    return response;
  }

  /** Create a participant
   */
  async createParticipant(cohortId: string) {
    this.isWritingParticipant = true;
    let response = {};

    if (this.experimentId) {
      const isAnonymous = requiresAnonymousProfiles(
        this.sp.experimentService.stages
      );

      response = await createParticipantCallable(
        this.sp.firebaseService.functions, {
          experimentId: this.experimentId,
          cohortId,
          isAnonymous
        }
      );
    }
    this.isWritingParticipant = false;
    return response;
  }

  /** Send check to participant. */
  async sendCheckToParticipant(
    participantId: string,
    status: ParticipantStatus.ATTENTION_CHECK, // TODO: Add other checks
    customMessage = ''
  ) {
    if (!this.experimentId) {
      return;
    }

    await sendParticipantCheckCallable(
      this.sp.firebaseService.functions,
      {
        experimentId: this.experimentId,
        participantId,
        status,
        customMessage
      }
    );
  }

  /** Boot participant from experiment. */
  async bootParticipant(
    participantId: string
  ) {
    if (!this.experimentId) return;
    await bootParticipantCallable(
      this.sp.firebaseService.functions,
      {
        experimentId: this.experimentId,
        participantId
      }
    );
  }

  /** Initiate participant transfer. */
  async initiateParticipantTransfer(
    participantId: string,
    cohortId: string
  ) {
    if (this.experimentId) {
      await initiateParticipantTransferCallable(
        this.sp.firebaseService.functions,
        {
          experimentId: this.experimentId,
          cohortId,
          participantId
        }
      );
    }
  }

  /** Download experiment. */
  async downloadExperiment() {
    let data = {};
    const experimentId = this.sp.routerService.activeRoute.params['experiment'];
    if (experimentId) {
      const result = await getExperimentDownload(
        this.sp.firebaseService.firestore,
        experimentId
      );

      if (result) {
        downloadJSON(result, result.experiment.metadata.name);

        // Download JSONs and CSVs for each chip negotiation game
        // as well as CSV mapping players to cohort games
        const chipData = getChipNegotiationData(result);
        if (chipData.length > 0) {
          // Temporarily download a single JSON because of browser
          // limitations on number of downloads (will eventually solve this
          // via zip)
          const chipDataTitle = `${result.experiment.metadata.name}_ChipNegotiation_all`;
          downloadJSON({ games: chipData }, chipDataTitle);
          downloadCSV(getChipNegotiationCSV(result, chipData), chipDataTitle);
          downloadCSV(
            getChipNegotiationPlayerMapCSV(result, chipData),
            `${result.experiment.metadata.name}_ChipNegotiation_PlayerMap`
          );
        }

        // Download chat data for each group chat
        const chatData = getChatHistoryData(result);
        chatData.forEach(data => {
          downloadCSV(data.data, `${data.experimentName}_ChatHistory_Cohort-${data.cohortId}_Stage-${data.stageId}`);
        });
        downloadCSV(
          getParticipantData(result),
          result.experiment.metadata.name
        );

        data = result;
      }
    }
    return data;
  }

  /** Create a manual (human) agent chat message. */
  async createManualChatMessage(
    stageId: string,
    config: Partial<HumanMediatorChatMessage> = {}
  ) {
    let response = {};
    const experimentId = this.sp.routerService.activeRoute.params['experiment'];
    const cohortId = this.sp.cohortService.cohortId;

    if (experimentId && cohortId) {
      const chatMessage = createHumanMediatorChatMessage({
        ...config,
        discussionId: this.sp.cohortService.getChatDiscussionId(stageId),
      });

      const createData: CreateChatMessageData = {
        experimentId,
        cohortId,
        stageId,
        chatMessage
      };

      response = await createChatMessageCallable(
        this.sp.firebaseService.functions, createData
      );
    }

    return response;
  }
}
