import {computed, makeObservable, observable} from 'mobx';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import {CohortService} from './cohort.service';
import {ExperimentEditor} from './experiment.editor';
import {ExperimentService} from './experiment.service';
import {FirebaseService} from './firebase.service';
import {Pages, RouterService} from './router.service';
import {Service} from './service';

import {
  CohortConfig,
  Experiment,
  ParticipantProfileExtended,
  ParticipantStatus,
  StageConfig,
  createCohortConfig
} from '@deliberation-lab/utils';
import {
  createParticipantCallable,
  updateParticipantCallable,
  writeCohortCallable
} from '../shared/callables';

interface ServiceProvider {
  cohortService: CohortService;
  experimentEditor: ExperimentEditor;
  experimentService: ExperimentService;
  firebaseService: FirebaseService;
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

  // Current participant in display panel
  @observable currentParticipantId: string|undefined = undefined;

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
      this.sp.experimentEditor.loadExperiment(
        this.sp.experimentService.experiment!,
        Object.values(this.sp.experimentService.stageConfigMap)
      );
      this.isEditing = true;
    }
  }

  async setIsEditingSettingsDialog(isEditing: boolean, saveChanges = false) {
    this.setIsEditing(isEditing, saveChanges);
    this.isEditingSettingsDialog = isEditing;
  }

  // Is editing full experiment, not settings dialog
  @computed get isEditingFull() {
    return this.isEditing && !this.isEditingSettingsDialog;
  }

  setCohortEditing(cohort: CohortConfig|undefined) {
    this.cohortEditing = cohort;
  }

  setCurrentParticipantId(id: string|undefined) {
    this.currentParticipantId = id;
  }

  @computed get currentParticipant() {
    if (!this.currentParticipantId) return null;
    return this.participantMap[this.currentParticipantId];
  }

  // Get num participants for specified cohort, otherwise all
  getNumParticipants(
    countAllParticipants = true, // if true, include booted, failed, etc.
    cohortId: string|null = null
  ) {
    if (!countAllParticipants && !cohortId) {
      return Object.keys(this.participantMap).length;
    } else if (!cohortId) {
      // Filter out participants who are not in-progress or completed
      return Object.values(this.participantMap).filter(
        participant => this.isActiveParticipant(participant)
      ).length;
    }
    // For cohort ID
    const participantsInCohort = this.getCohortParticipants(cohortId);

    if (!countAllParticipants) {
      return participantsInCohort.length;
    } else {
      // Filter out participants who are not in-progress or completed
      return participantsInCohort.filter(
        participant => this.isActiveParticipant(participant)
      ).length;
    }
  }

  // Participants currently participating in (or completed) the experiment
  // (not dropped out or pending transfer)
  isActiveParticipant(participant: ParticipantProfileExtended) {
    return this.sp.cohortService.isActiveParticipant(participant);
  }

  // If participant has left the experiment
  // (not active, not pending transfer)
  isObsoleteParticipant(participant: ParticipantProfileExtended) {
    return this.sp.cohortService.isObsoleteParticipant(participant);
  }

  // If participant is in a waiting state
  // (e.g., while pending transfer, not currently in the experiment but also
  // has not left yet)
  isPendingParticipant(participant: ParticipantProfileExtended) {
    return this.sp.cohortService.isPendingParticipant(participant);
  }

  getCohort(id: string) {
    return this.cohortMap[id];
  }

  getCohortName(cohort: CohortConfig) {
    const name = cohort?.metadata.name;
    if (name) return name;
    return `Untitled cohort: ${cohort?.id.split('-')[0]}`;
  }

  getCohortParticipants(
    cohortId: string,
    countAllParticipants = true, // if true, include booted, failed, etc.
  ) {
    return Object.values(this.participantMap).filter(
      participant => {
        if (participant.transferCohortId) {
          return participant.transferCohortId === cohortId;
        } else {
          return participant.currentCohortId === cohortId;
        }
      }
    );
  }

  isFullCohort(cohort: CohortConfig) {
    const maxParticipants = cohort.participantConfig.maxParticipantsPerCohort;
    if (maxParticipants === null) {
      return false;
    }

    const numParticipants = this.getNumParticipants(
      cohort.participantConfig.includeAllParticipantsInCohortCount,
      cohort.id
    );
    return numParticipants >= Number(maxParticipants);
  }

  @computed get availableCohorts() {
    return Object.values(this.cohortMap).filter(cohort => !this.isFullCohort(cohort));
  }

  @computed get numCohorts() {
    return Object.keys(this.cohortMap).length;
  }

  @computed get cohortList() {
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

  updateForCurrentRoute() {
    const id = this.sp.routerService.activeRoute.params['experiment'];
    if (id !== this.experimentId) {
      this.experimentId = id;
      this.loadExperimentData(id);
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
        collection(
          this.sp.firebaseService.firestore,
          'experiments',
          id,
          'participants'
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

  // *********************************************************************** //
  // FIRESTORE                                                               //
  // *********************************************************************** //

  /** Create or update a cohort
   * @rights Experimenter
   */
  async writeCohort(config: Partial<CohortConfig> = {}) {
    if (!this.sp.experimentService.experiment) return;

    this.isWritingCohort = true;
    console.log(JSON.stringify(this.sp.experimentService.experiment.defaultCohortConfig));
    const cohortConfig = createCohortConfig({
      participantConfig: this.sp.experimentService.experiment.defaultCohortConfig,
      ...config
    });

    let response = {};

    if (this.experimentId) {
      response = await writeCohortCallable(
        this.sp.firebaseService.functions, {
          experimentId: this.experimentId,
          cohortConfig,
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
      response = await createParticipantCallable(
        this.sp.firebaseService.functions, {
          experimentId: this.experimentId,
          cohortId,
        }
      );
    }
    this.isWritingParticipant = false;
    return response;
  }

  /** Update a participant */
  async updateParticipant(participantConfig: ParticipantProfileExtended) {
    this.isWritingParticipant = true;
    let response = {};

    if (this.experimentId) {
      console.log(participantConfig);
      response = await updateParticipantCallable(
        this.sp.firebaseService.functions, {
          experimentId: this.experimentId,
          participantConfig
        }
      );
    }
    this.isWritingParticipant = false;
    return response;
  }

  /** Initiate participant transfer. */
  async initiateParticipantTransfer(
    participant: ParticipantProfileExtended,
    transferCohortId: string
  ) {
    this.updateParticipant(
      {
        ...participant,
        transferCohortId,
        currentStatus: ParticipantStatus.TRANSFER_PENDING,
      }
    );
  }
}
