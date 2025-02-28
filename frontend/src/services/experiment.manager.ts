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
import {AgentEditor} from './agent.editor';
import {AuthService} from './auth.service';
import {CohortService} from './cohort.service';
import {ExperimentEditor} from './experiment.editor';
import {ExperimentService} from './experiment.service';
import {FirebaseService} from './firebase.service';
import {ParticipantService} from './participant.service';
import {Pages, RouterService} from './router.service';
import {Service} from './service';
import JSZip from 'jszip';

import {
  AlertMessage,
  AlertStatus,
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
  ackAlertMessageCallable,
  bootParticipantCallable,
  createChatMessageCallable,
  createCohortCallable,
  createParticipantCallable,
  deleteCohortCallable,
  deleteExperimentCallable,
  initiateParticipantTransferCallable,
  sendParticipantCheckCallable,
  setExperimentCohortLockCallable,
  testAgentConfigCallable,
  testAgentParticipantPromptCallable,
  updateCohortMetadataCallable,
  writeExperimentCallable,
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
  getParticipantData,
} from '../shared/file.utils';
import {
  isObsoleteParticipant,
  requiresAnonymousProfiles,
} from '../shared/participant.utils';

interface ServiceProvider {
  agentEditor: AgentEditor;
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
  @observable experimentId: string | undefined = undefined;
  @observable cohortMap: Record<string, CohortConfig> = {};
  @observable participantMap: Record<string, ParticipantProfileExtended> = {};
  @observable alertMap: Record<string, AlertMessage> = {};

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
  @observable currentParticipantId: string | undefined = undefined;
  @observable showCohortList = true;
  @observable showParticipantStats = true;
  @observable showParticipantPreview = true;
  @observable hideLockedCohorts = false;
  @observable expandAllCohorts = true;

  // Copy of cohort being edited in settings dialog
  @observable cohortEditing: CohortConfig | undefined = undefined;

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
      experiment.stageIds.forEach((id) => {
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
    return (
      this.sp.authService.userEmail ===
        this.sp.experimentService.experiment?.metadata.creator ||
      !this.sp.experimentService.experiment
    );
  }

  // Can edit if (no cohorts exist AND is creator) OR new experiment
  @computed get canEditExperimentStages() {
    return (
      (this.isCreator && Object.keys(this.cohortMap).length === 0) ||
      this.sp.routerService.activePage === Pages.EXPERIMENT_CREATE
    );
  }

  // Is editing full experiment, not settings dialog
  @computed get isEditingFull() {
    return this.isEditing && !this.isEditingSettingsDialog;
  }

  getParticipantSearchResults(rawQuery: string) {
    const query = rawQuery.toLowerCase();

    return Object.values(this.participantMap).filter((participant) => {
      if (participant.publicId.includes(query)) return true;
      if (participant.privateId.includes(query)) return true;
      if (participant.name?.toLowerCase().includes(query)) return true;
      if (participant.prolificId?.includes(query)) return true;
      for (const key of Object.keys(participant.anonymousProfiles)) {
        const profile = participant.anonymousProfiles[key];
        if (
          profile &&
          `${profile.name} ${profile.repeat + 1}`.toLowerCase().includes(query)
        ) {
          return true;
        }
      }
      return false;
    });
  }

  setCohortEditing(cohort: CohortConfig | undefined) {
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

  setExpandAllCohorts(expandAllCohorts: boolean) {
    this.expandAllCohorts = expandAllCohorts;
  }

  setCurrentParticipantId(id: string | undefined) {
    this.currentParticipantId = id;

    // Update participant service in order to load correct participant answers
    // (Note: This also updates participant answer service accordingly)
    if (this.experimentId && id) {
      this.sp.participantService.updateForRoute(this.experimentId, id);
    }
  }

  @computed get currentParticipant() {
    if (!this.currentParticipantId) return null;
    return this.participantMap[this.currentParticipantId];
  }

  getCurrentParticipantCohort(participant: ParticipantProfileExtended) {
    return this.getCohort(
      participant.transferCohortId ?? participant.currentCohortId,
    );
  }

  getNumExperimentParticipants(countObsoleteParticipants = true) {
    const participants = Object.values(this.participantMap);
    if (countObsoleteParticipants) {
      return participants.length;
    }

    return participants.filter(
      (participant) => !isObsoleteParticipant(participant),
    ).length;
  }

  // Get participants for specified cohort
  getCohortParticipants(cohortId: string, countObsoleteParticipants = true) {
    return getCohortParticipants(
      Object.values(this.participantMap),
      cohortId,
      countObsoleteParticipants,
    );
  }

  getCohort(id: string) {
    return this.cohortMap[id];
  }

  isFullCohort(cohort: CohortConfig) {
    return hasMaxParticipantsInCohort(
      cohort,
      Object.values(this.participantMap),
    );
  }

  @computed get availableCohorts() {
    return Object.values(this.cohortMap).filter(
      (cohort) => !this.isFullCohort(cohort),
    );
  }

  @computed get numCohorts() {
    return Object.keys(this.cohortMap).length;
  }

  @computed get cohortList() {
    if (this.hideLockedCohorts) {
      return Object.values(this.cohortMap).filter(
        (cohort) =>
          !this.sp.experimentService.experiment?.cohortLockMap[cohort.id],
      );
    }
    return Object.values(this.cohortMap);
  }

  @computed get hasNewAlerts() {
    return this.newAlerts.length > 0;
  }

  @computed get newAlerts() {
    return Object.values(this.alertMap).filter(
      (alert) => alert.status === AlertStatus.NEW,
    );
  }

  @computed get oldAlerts() {
    return Object.values(this.alertMap).filter(
      (alert) => alert.status !== AlertStatus.NEW,
    );
  }

  @computed get isLoading() {
    return this.isCohortsLoading || this.isParticipantsLoading;
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

    if (!this.sp.authService.isExperimenter) {
      return;
    }

    // Subscribe to alerts
    this.unsubscribe.push(
      onSnapshot(
        collection(
          this.sp.firebaseService.firestore,
          'experiments',
          id,
          'alerts',
        ),
        (snapshot) => {
          let changedDocs = snapshot.docChanges().map((change) => change.doc);
          if (changedDocs.length === 0) {
            changedDocs = snapshot.docs;
          }

          changedDocs.forEach((doc) => {
            const data = doc.data() as AlertMessage;
            this.alertMap[data.id] = data;
          });
        },
      ),
    );

    // Subscribe to cohorts
    this.unsubscribe.push(
      onSnapshot(
        collection(
          this.sp.firebaseService.firestore,
          'experiments',
          id,
          'cohorts',
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
        },
      ),
    );

    // Subscribe to participants' private profiles
    this.unsubscribe.push(
      onSnapshot(
        query(
          collection(
            this.sp.firebaseService.firestore,
            'experiments',
            id,
            'participants',
          ),
          where('currentStatus', '!=', ParticipantStatus.DELETED),
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
        },
      ),
    );
  }

  unsubscribeAll() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.unsubscribe = [];

    // Reset experiment data
    this.cohortMap = {};
    this.participantMap = {};
    this.alertMap = {};
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
    await setExperimentCohortLockCallable(this.sp.firebaseService.functions, {
      experimentId: experiment.id,
      cohortId,
      isLock,
    });
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
    experiment.stageIds.forEach((id) => {
      const stage = this.sp.experimentService.stageConfigMap[id];
      if (stage) stages.push(stage);
    });

    let response = {};
    response = await writeExperimentCallable(
      this.sp.firebaseService.functions,
      {
        collectionName: 'experiments',
        experimentConfig: experiment,
        stageConfigs: stages,
      },
    );

    // Route to new experiment and reload to update changes
    this.sp.routerService.navigate(Pages.EXPERIMENT, {
      experiment: experiment.id,
    });

    return response;
  }

  /** Deletes the current experiment.
   * @rights Creator of experiment
   */
  async deleteExperiment() {
    if (!this.experimentId || !this.isCreator) return;
    const response = await deleteExperimentCallable(
      this.sp.firebaseService.functions,
      {
        collectionName: 'experiments',
        experimentId: this.experimentId,
      },
    );
    this.isEditingSettingsDialog = false;
    this.sp.routerService.navigate(Pages.HOME);
    return response;
  }

  /** Deletes the specified cohort.
   * @rights Creator of experiment
   */
  async deleteCohort(cohortId: string) {
    if (!this.experimentId) return;
    const response = await deleteCohortCallable(
      this.sp.firebaseService.functions,
      {
        experimentId: this.experimentId,
        cohortId,
      },
    );
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
      participantConfig:
        this.sp.experimentService.experiment.defaultCohortConfig,
      ...config,
    });
    cohortConfig.metadata.name = name;

    let response = {};

    if (this.experimentId) {
      response = await createCohortCallable(this.sp.firebaseService.functions, {
        experimentId: this.experimentId,
        cohortConfig,
      });
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
        this.sp.firebaseService.functions,
        {
          experimentId: this.experimentId,
          cohortId,
          metadata,
          participantConfig,
        },
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
        this.sp.experimentService.stages,
      );

      response = await createParticipantCallable(
        this.sp.firebaseService.functions,
        {
          experimentId: this.experimentId,
          cohortId,
          isAnonymous,
        },
      );
    }
    this.isWritingParticipant = false;
    return response;
  }

  /** Send check to participant. */
  async sendCheckToParticipant(
    participantId: string,
    status: ParticipantStatus.ATTENTION_CHECK, // TODO: Add other checks
    customMessage = '',
  ) {
    if (!this.experimentId) {
      return;
    }

    await sendParticipantCheckCallable(this.sp.firebaseService.functions, {
      experimentId: this.experimentId,
      participantId,
      status,
      customMessage,
    });
  }

  /** Boot participant from experiment. */
  async bootParticipant(participantId: string) {
    if (!this.experimentId) return;
    await bootParticipantCallable(this.sp.firebaseService.functions, {
      experimentId: this.experimentId,
      participantId,
    });
  }

  /** Initiate participant transfer. */
  async initiateParticipantTransfer(participantId: string, cohortId: string) {
    if (this.experimentId) {
      await initiateParticipantTransferCallable(
        this.sp.firebaseService.functions,
        {
          experimentId: this.experimentId,
          cohortId,
          participantId,
        },
      );
    }
  }

  /** Download experiment as a zip file. */
  async downloadExperiment() {
    let data = {};
    const experimentId = this.sp.routerService.activeRoute.params['experiment'];
    if (experimentId) {
      const result = await getExperimentDownload(
        this.sp.firebaseService.firestore,
        experimentId,
      );

      if (result) {
        const zip = new JSZip();
        const experimentName = result.experiment.metadata.name;

        // Add experiment JSON to zip
        zip.file(`${experimentName}.json`, JSON.stringify(result, null, 2));

        // Add chip negotiation data
        const chipData = getChipNegotiationData(result);
        if (chipData.length > 0) {
          const chipDataTitle = `${experimentName}_ChipNegotiation_all`;
          zip.file(
            `${chipDataTitle}.json`,
            JSON.stringify({games: chipData}, null, 2),
          );
          zip.file(
            `${chipDataTitle}.csv`,
            new Blob(
              [
                getChipNegotiationCSV(result, chipData)
                  .map((row) => row.join(','))
                  .join('\n'),
              ],
              {type: 'text/csv'},
            ),
          );
          zip.file(
            `${experimentName}_ChipNegotiation_PlayerMap.csv`,
            new Blob(
              [
                getChipNegotiationPlayerMapCSV(result, chipData)
                  .map((row) => row.join(','))
                  .join('\n'),
              ],
              {type: 'text/csv'},
            ),
          );
        }

        // Add chat data to zip
        const chatData = getChatHistoryData(result);
        chatData.forEach((data) => {
          const chatFileName = `${data.experimentName}_ChatHistory_Cohort-${data.cohortId}_Stage-${data.stageId}.csv`;
          zip.file(
            chatFileName,
            new Blob([data.data.map((row) => row.join(',')).join('\n')], {
              type: 'text/csv',
            }),
          );
        });

        // Add participant data to zip
        zip.file(
          `${experimentName}_ParticipantData.csv`,
          new Blob(
            [
              getParticipantData(result)
                .map((row) => row.join(','))
                .join('\n'),
            ],
            {type: 'text/csv'},
          ),
        );

        // Generate zip and trigger download
        zip.generateAsync({type: 'blob'}).then((blob) => {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `${experimentName}_data.zip`;
          link.click();
          URL.revokeObjectURL(link.href);
        });

        data = result;
      }
    }
    return data;
  }

  /** TEMPORARY: Test agent participant prompt for given participant/stage. */
  async testAgentParticipantPrompt(participantId: string, stageId: string) {
    if (this.experimentId) {
      await testAgentParticipantPromptCallable(
        this.sp.firebaseService.functions,
        {
          experimentId: this.experimentId,
          participantId,
          stageId,
        },
      );
    }
  }

  /** TEMPORARY: Test new agent config. */
  async testAgentConfig() {
    let response = '';
    const creatorId = this.sp.authService.experimenterData?.email;
    const agentConfig = this.sp.agentEditor.getAgentMediator('test');
    if (creatorId && agentConfig) {
      response =
        (
          await testAgentConfigCallable(this.sp.firebaseService.functions, {
            creatorId,
            agentConfig,
          })
        ).data ?? '';
    }
    return response;
  }

  /** Acknowledge alert message. */
  async ackAlertMessage(alertId: string, response = '') {
    let output = {};
    if (this.experimentId) {
      output = await ackAlertMessageCallable(
        this.sp.firebaseService.functions,
        {
          experimentId: this.experimentId,
          alertId,
          response,
        },
      );
    }
    return output;
  }

  /** Create a manual (human) agent chat message. */
  async createManualChatMessage(
    stageId: string,
    config: Partial<HumanMediatorChatMessage> = {},
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
        chatMessage,
      };

      response = await createChatMessageCallable(
        this.sp.firebaseService.functions,
        createData,
      );
    }

    return response;
  }
}
