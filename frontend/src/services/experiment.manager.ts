import {computed, makeObservable, observable} from 'mobx';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import {ExperimentEditor} from './experiment.editor';
import {ExperimentService} from './experiment.service';
import {FirebaseService} from './firebase.service';
import {Pages, RouterService} from './router.service';
import {Service} from './service';

import {
  CohortConfig,
  Experiment,
  ParticipantProfileExtended,
  StageConfig,
  createCohortConfig
} from '@deliberation-lab/utils';
import { writeCohortCallable } from '../shared/callables';

interface ServiceProvider {
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
  @observable isWritingCohort = false; // not associated with other loads

  // Edit state
  @observable isEditing = false;

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

  // Get num participants for specified cohort, otherwise all
  getNumParticipants(
    countAllParticipants = true, // if true, include booted, failed, etc.
    cohortId: string|null = null
  ) {
    if (!cohortId && !countAllParticipants) {
      return Object.keys(this.participantMap).length;
    }
    // TODO: Calculate based on cohort ID
    return Object.keys(this.participantMap).length;
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
    this.isWritingCohort = true;
    const cohortConfig = createCohortConfig(config);
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
}
