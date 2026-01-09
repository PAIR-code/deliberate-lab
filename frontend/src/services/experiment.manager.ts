import {computed, makeObservable, observable} from 'mobx';
import {
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
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
import JSZip from 'jszip';

import {
  AlertMessage,
  AlertStatus,
  AgentPersonaConfig,
  AgentPersonaType,
  BaseAgentPromptConfig,
  ChatMessage,
  CohortConfig,
  CohortParticipantConfig,
  CreateChatMessageData,
  LogEntry,
  MediatorProfileExtended,
  MediatorStatus,
  MetadataConfig,
  ParticipantProfileExtended,
  ParticipantStatus,
  ProfileAgentConfig,
  StageKind,
  createCohortConfig,
  createExperimenterChatMessage,
} from '@deliberation-lab/utils';
import {
  ackAlertMessageCallable,
  bootParticipantCallable,
  createChatMessageCallable,
  createCohortCallable,
  createMediatorCallable,
  downloadExperimentCallable,
  createParticipantCallable,
  deleteCohortCallable,
  deleteExperimentCallable,
  forkExperimentCallable,
  getExperimentTemplateCallable,
  initiateParticipantTransferCallable,
  sendParticipantCheckCallable,
  setExperimentCohortLockCallable,
  testAgentConfigCallable,
  updateCohortMetadataCallable,
  updateMediatorStatusCallable,
  updateParticipantStatusCallable,
} from '../shared/callables';
import {
  getCohortParticipants,
  hasMaxParticipantsInCohort,
} from '../shared/cohort.utils';
import {
  getAlertData,
  getChatHistoryData,
  getChipNegotiationCSV,
  getChipNegotiationData,
  getChipNegotiationPlayerMapCSV,
  getParticipantDataCSV,
} from '../shared/file.utils';
import {
  isObsoleteParticipant,
  requiresAnonymousProfiles,
} from '../shared/participant.utils';

interface ServiceProvider {
  authService: AuthService;
  cohortService: CohortService;
  experimentEditor: ExperimentEditor;
  experimentManager: ExperimentManager;
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
  @observable agentPersonaMap: Record<string, AgentPersonaConfig> = {};
  @observable participantMap: Record<string, ParticipantProfileExtended> = {};
  @observable mediatorMap: Record<string, MediatorProfileExtended> = {};
  @observable alertMap: Record<string, AlertMessage> = {};
  @observable logs: LogEntry[] = [];

  // Loading
  @observable unsubscribe: Unsubscribe[] = [];
  @observable isCohortsLoading = false;
  @observable isParticipantsLoading = false;
  @observable isMediatorsLoading = false;
  @observable isAgentsLoading = false;
  @observable isLogsLoading = false;

  // Firestore loading (not included in general isLoading)
  @observable isWritingCohort = false;
  @observable isWritingParticipant = false;
  @observable isWritingMediator = false;

  // Experiment edit state
  @observable isEditing = false; // is on an edit page
  @observable isEditingSettingsDialog = false; // is in settings dialog

  // Current participant, view in dashboard
  @observable currentParticipantId: string | undefined = undefined;
  @observable currentCohortId: string | undefined = undefined;
  @observable showCohortEditor = true;
  @observable showCohortList = false;
  @observable showParticipantStats = false;
  @observable showParticipantPreview = true;
  @observable hideLockedCohorts = false;
  @observable expandAllCohorts = true;
  @observable showMediatorsInCohortSummary = false;
  @observable participantSortBy: 'lastActive' | 'name' = 'lastActive';

  // Copy of cohort being edited in settings dialog
  @observable cohortEditing: CohortConfig | undefined = undefined;

  async setIsEditing(isEditing: boolean, saveChanges = false) {
    if (!isEditing) {
      this.isEditing = false;
      // If save changes, call updateExperiment
      if (saveChanges) {
        await this.sp.experimentEditor.updateExperiment();
      }
      // Reset experiment editor
      this.sp.experimentEditor.resetExperiment();
      // Reload current experiment to listen to updated changes
      if (this.experimentId) {
        this.sp.experimentService.loadExperiment(this.experimentId);
      }
    } else {
      if (this.experimentId) {
        const template = await getExperimentTemplateCallable(
          this.sp.firebaseService.functions,
          {
            collectionName: 'experiments',
            experimentId: this.experimentId,
          },
        );
        this.sp.experimentEditor.loadTemplate(template, true);
        this.isEditing = true;
      }
    }
  }

  async setIsEditingSettingsDialog(isEditing: boolean, saveChanges = false) {
    this.setIsEditing(isEditing, saveChanges);
    this.isEditingSettingsDialog = isEditing;
  }

  // Returns true if is creator OR admin
  @computed get isCreator() {
    return (
      this.sp.authService.userEmail ===
        this.sp.experimentService.experiment?.metadata.creator ||
      this.sp.authService.isAdmin ||
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

  setShowCohortEditor(showCohortEditor: boolean, toggle: boolean) {
    this.showCohortEditor = showCohortEditor;
    if (toggle) {
      this.showCohortList = !showCohortEditor;
    }
  }

  setShowCohortList(showCohortList: boolean, toggle: boolean) {
    this.showCohortList = showCohortList;
    if (toggle) {
      this.showCohortEditor = !showCohortList;
    }
  }

  setShowParticipantPreview(showParticipantPreview: boolean, toggle: boolean) {
    this.showParticipantPreview = showParticipantPreview;
    if (toggle) {
      this.showParticipantStats = !showParticipantPreview;
    }
  }

  setShowParticipantStats(showParticipantStats: boolean, toggle: boolean) {
    this.showParticipantStats = showParticipantStats;
    if (toggle) {
      this.showParticipantPreview = !showParticipantStats;
    }
  }

  setHideLockedCohorts(hideLockedCohorts: boolean) {
    this.hideLockedCohorts = hideLockedCohorts;
  }

  setExpandAllCohorts(expandAllCohorts: boolean) {
    this.expandAllCohorts = expandAllCohorts;
  }

  setCurrentCohortId(id: string | undefined) {
    this.currentCohortId = id;
  }

  setShowMediatorsInCohortSummary(show: boolean) {
    this.showMediatorsInCohortSummary = show;
  }

  setParticipantSortBy(sortBy: 'lastActive' | 'name') {
    this.participantSortBy = sortBy;
  }

  setCurrentParticipantId(id: string | undefined) {
    this.currentParticipantId = id;

    // Update current cohort to match current participant's cohort
    if (id && this.participantMap[id]) {
      const participant = this.participantMap[id];
      const cohortId =
        participant.transferCohortId ?? participant.currentCohortId;
      this.setCurrentCohortId(cohortId);
    }

    // Update participant service in order to load correct participant answers
    // (Note: This also updates participant answer service accordingly)
    if (this.experimentId && id) {
      this.sp.participantService.updateForRoute(this.experimentId, id);
    }
  }

  @computed get agentPersonas() {
    return Object.values(this.agentPersonaMap);
  }

  // WARNING: We are not currently allowing experimenters to edit
  // agent participant personas in the editor.
  @computed get agentParticipantPersonas() {
    return this.agentPersonas.filter(
      (persona) => persona.type === AgentPersonaType.PARTICIPANT,
    );
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

  getCohortAgentParticipants(cohortId: string) {
    return Object.values(this.participantMap).filter(
      (participant) =>
        participant.agentConfig && cohortId === participant.currentCohortId,
    );
  }

  getCohortHumanParticipants(cohortId: string) {
    return Object.values(this.participantMap).filter(
      (participant) =>
        !participant.agentConfig && cohortId === participant.currentCohortId,
    );
  }

  getCohortAgentMediators(cohortId: string) {
    return Object.values(this.mediatorMap).filter(
      (mediator) =>
        mediator.agentConfig && mediator.currentCohortId === cohortId,
    );
  }

  getAvailableMediatorPersonas(cohortId: string) {
    const assignedAgentIds = new Set(
      this.getCohortAgentMediators(cohortId)
        .map((mediator) => mediator.agentConfig?.agentId)
        .filter((id): id is string => Boolean(id)),
    );

    return this.agentPersonas.filter(
      (persona) =>
        persona.type === AgentPersonaType.MEDIATOR &&
        !assignedAgentIds.has(persona.id),
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

  // Return name for next cohort based on number of cohorts
  getNextCohortName(offset = 0) {
    const hasTransfer = this.sp.experimentService.stages.find(
      (stage) => stage.kind === StageKind.TRANSFER,
    );

    if (this.cohortList.length === 0 && hasTransfer) {
      return 'Lobby';
    }

    let maxNum = -1;
    this.cohortList.forEach((cohort) => {
      const match = cohort.metadata.name.match(/^Cohort (\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    return `Cohort ${String(maxNum + 1 + offset).padStart(2, '0')}`;
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
    return Object.values(this.alertMap)
      .filter((alert) => alert.status === AlertStatus.NEW)
      .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
  }

  @computed get oldAlerts() {
    return Object.values(this.alertMap)
      .filter((alert) => alert.status !== AlertStatus.NEW)
      .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
  }

  @computed get isLoading() {
    return (
      this.isCohortsLoading ||
      this.isParticipantsLoading ||
      this.isMediatorsLoading ||
      this.isAgentsLoading
    );
  }

  set isLoading(value: boolean) {
    this.isCohortsLoading = value;
    this.isParticipantsLoading = value;
    this.isMediatorsLoading = value;
    this.isAgentsLoading = value;
    this.isLogsLoading = value;
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
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'removed') {
              delete this.alertMap[change.doc.id];
            } else {
              const data = change.doc.data() as AlertMessage;
              this.alertMap[data.id] = data;
            }
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
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'removed') {
              delete this.cohortMap[change.doc.id];
              if (this.currentCohortId === change.doc.id) {
                this.currentCohortId = undefined;
              }
            } else {
              const data = change.doc.data() as CohortConfig;
              this.cohortMap[change.doc.id] = data;
              if (!this.currentCohortId) {
                this.currentCohortId = change.doc.id;
              }
            }
          });

          // If multiple cohorts, show cohort list
          if (Object.keys(this.cohortMap).length > 1) {
            this.setShowCohortList(true, true);
          } else if (Object.keys(this.cohortMap).length === 0) {
            this.setShowCohortEditor(true, true);
          }

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
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'removed') {
              delete this.participantMap[change.doc.id];
            } else {
              const data = {
                agentConfig: null,
                ...change.doc.data(),
              } as ParticipantProfileExtended;
              this.participantMap[change.doc.id] = data;
            }
          });

          this.isParticipantsLoading = false;
        },
      ),
    );

    // Subscribe to mediators' private profiles
    this.unsubscribe.push(
      onSnapshot(
        query(
          collection(
            this.sp.firebaseService.firestore,
            'experiments',
            id,
            'mediators',
          ),
          where('currentStatus', '!=', ParticipantStatus.DELETED),
        ),
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'removed') {
              delete this.mediatorMap[change.doc.id];
            } else {
              const data = {
                agentConfig: null,
                ...change.doc.data(),
              } as MediatorProfileExtended;
              this.mediatorMap[change.doc.id] = data;
            }
          });

          this.isMediatorsLoading = false;
        },
      ),
    );

    // Subscribe to agent mediator personas
    // NOTE: We don't currently subscribe to agent participant personas
    // because we don't currently allow setting them in the experiment editor.
    this.unsubscribe.push(
      onSnapshot(
        query(
          collection(
            this.sp.firebaseService.firestore,
            'experiments',
            id,
            'agentMediators',
          ),
        ),
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'removed') {
              delete this.agentPersonaMap[change.doc.id];
            } else {
              const data = change.doc.data() as AgentPersonaConfig;
              this.agentPersonaMap[change.doc.id] = data;
            }
          });

          this.isAgentsLoading = false;
        },
      ),
    );

    // Subscribe to logs
    this.unsubscribe.push(
      onSnapshot(
        query(
          collection(
            this.sp.firebaseService.firestore,
            'experiments',
            id,
            'logs',
          ),
          orderBy('createdTimestamp', 'desc'),
        ),
        (snapshot) => {
          this.logs = snapshot.docs.map((doc) => doc.data() as LogEntry);
          this.isLogsLoading = false;
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
    this.mediatorMap = {};
    this.agentPersonaMap = {};
    this.alertMap = {};
    this.logs = [];
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
  async forkExperiment() {
    if (!this.experimentId) return;

    const response = await forkExperimentCallable(
      this.sp.firebaseService.functions,
      {
        collectionName: 'experiments',
        experimentId: this.experimentId,
      },
    );

    // Route to new experiment
    this.sp.routerService.navigate(Pages.EXPERIMENT, {
      experiment: response.id,
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
      // Set to current cohort
      this.setCurrentCohortId(cohortConfig.id);
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

  /** Create human participant. */
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

  /** Create agent participant. */
  async createAgentParticipant(
    cohortId: string,
    agentConfig: ProfileAgentConfig,
  ) {
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
          agentConfig,
        },
      );
    }
    this.isWritingParticipant = false;
    return response;
  }

  /** Create agent mediator for cohort. */
  async createMediator(cohortId: string, agentPersonaId: string) {
    if (!this.experimentId) return;

    this.isWritingMediator = true;
    try {
      await createMediatorCallable(this.sp.firebaseService.functions, {
        experimentId: this.experimentId,
        cohortId,
        agentPersonaId,
      });
    } finally {
      this.isWritingMediator = false;
    }
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
  // TODO: Include variable values in data download
  async downloadExperiment() {
    let data = {};
    const experimentId = this.sp.routerService.activeRoute.params['experiment'];
    if (experimentId) {
      const response = await downloadExperimentCallable(
        this.sp.firebaseService.functions,
        experimentId,
      );

      if (response.data) {
        const result = response.data;
        const zip = new JSZip();
        const experimentName = result.experiment.metadata.name;

        // Add experiment JSON to zip
        zip.file(`${experimentName}.json`, JSON.stringify(result, null, 2));

        // TODO: Refactor
        // Add logs to zip
        const logs = (
          await getDocs(
            query(
              collection(
                this.sp.firebaseService.firestore,
                'experiments',
                experimentId,
                'logs',
              ),
              orderBy('createdTimestamp', 'asc'),
            ),
          )
        ).docs.map((doc) => doc.data() as LogEntry);
        zip.file(`${experimentName}_Logs.json`, JSON.stringify(logs, null, 2));

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
          new Blob([getParticipantDataCSV(result)], {type: 'text/csv'}),
        );

        // Add alert data to zip
        zip.file(
          `${experimentName}_Alerts.csv`,
          new Blob(
            [
              getAlertData(result)
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

  /** Test given agent config. */
  async testAgentConfig(
    agentConfig: AgentPersonaConfig,
    promptConfig: BaseAgentPromptConfig,
  ) {
    let response = '';
    const creatorId = this.sp.authService.experimenterData?.email;
    if (creatorId) {
      response =
        (
          await testAgentConfigCallable(this.sp.firebaseService.functions, {
            creatorId,
            agentConfig,
            promptConfig,
          })
        ).data ?? '';
    }
    return response;
  }

  /** Acknowledge alert message. */
  async ackAlertMessage(alertId: string, participantId: string, response = '') {
    let output = {};
    if (this.experimentId) {
      output = await ackAlertMessageCallable(
        this.sp.firebaseService.functions,
        {
          experimentId: this.experimentId,
          participantId,
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
    config: Partial<ChatMessage> = {},
  ) {
    let response = {};
    const experimentId = this.sp.routerService.activeRoute.params['experiment'];
    const cohortId = this.sp.cohortService.cohortId;

    if (experimentId && cohortId) {
      const chatMessage = createExperimenterChatMessage({
        ...config,
        discussionId: this.sp.cohortService.getChatDiscussionId(stageId),
      });

      const createData: CreateChatMessageData = {
        experimentId,
        cohortId,
        stageId,
        participantId: '',
        chatMessage,
      };

      response = await createChatMessageCallable(
        this.sp.firebaseService.functions,
        createData,
      );
    }

    return response;
  }

  /** Change mediator status. */
  async updateMediatorStatus(mediatorId: string, status: MediatorStatus) {
    let response = {};
    const experimentId = this.sp.experimentManager.experimentId;
    if (experimentId) {
      response = await updateMediatorStatusCallable(
        this.sp.firebaseService.functions,
        {
          experimentId,
          mediatorId,
          status,
        },
      );
    }
    return response;
  }

  /** Change participant status. */
  async updateParticipantStatus(
    participantId: string,
    status: ParticipantStatus.IN_PROGRESS | ParticipantStatus.PAUSED,
  ) {
    let response = {};
    const experimentId = this.sp.experimentManager.experimentId;
    if (experimentId) {
      response = await updateParticipantStatusCallable(
        this.sp.firebaseService.functions,
        {
          experimentId,
          participantId,
          status,
        },
      );
    }
    return response;
  }
}
