import {
  AttentionCheckConfig,
  CohortParticipantConfig,
  Experiment,
  MetadataConfig,
  PermissionsConfig,
  ProlificConfig,
  StageConfig,
  StageKind,
  createAttentionCheckConfig,
  createExperimentConfig,
  createMetadataConfig,
  createPermissionsConfig,
  createProlificConfig,
  generateId,
} from '@deliberation-lab/utils';
import {Timestamp} from 'firebase/firestore';
import {computed, makeObservable, observable} from 'mobx';
import {writeExperimentCallable} from '../shared/callables';

import {AuthService} from './auth.service';
import {ExperimentManager} from './experiment.manager';
import {FirebaseService} from './firebase.service';
import {Service} from './service';
import {mustWaitForAllParticipants} from '../shared/experiment.utils';

interface ServiceProvider {
  authService: AuthService;
  experimentManager: ExperimentManager;
  firebaseService: FirebaseService;
}

/**
 * Create/edit and save experiment.
 */
export class ExperimentEditor extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  // Experiment config
  // Use this.stages as source of truth for stage ordering,
  // not this.experiment.stageIds (which will be overridden)
  @observable experiment: Experiment = createExperimentConfig();
  @observable stages: StageConfig[] = [];

  // Loading
  @observable isWritingExperiment = false;

  // Editor tooling
  @observable currentStageId: string | undefined = undefined;
  @observable showStageBuilderDialog = false;
  @observable showGamesTab = false;

  @computed get isValidExperimentConfig() {
    // TODO: Add other validation checks here
    return this.experiment.metadata.name.length > 0;
  }

  @computed get canEditStages() {
    return this.sp.experimentManager.canEditExperimentStages;
  }

  @computed get isCreator() {
    return (
      this.sp.authService.userId === this.experiment.metadata.creator ||
      this.experiment.metadata.creator === ''
    );
  }

  isInitializedExperiment() {
    return this.experiment.id.length > 0;
  }

  updateMetadata(metadata: Partial<MetadataConfig>) {
    this.experiment.metadata = {...this.experiment.metadata, ...metadata};
  }

  updatePermissions(permissions: Partial<PermissionsConfig>) {
    this.experiment.permissions = {
      ...this.experiment.permissions,
      ...permissions,
    };
  }

  updateCohortConfig(config: Partial<CohortParticipantConfig>) {
    this.experiment.defaultCohortConfig = {
      ...this.experiment.defaultCohortConfig,
      ...config,
    };
  }

  updateAttentionCheckConfig(config: Partial<AttentionCheckConfig>) {
    this.experiment.attentionCheckConfig = {
      ...this.experiment.attentionCheckConfig,
      ...config,
    };
  }

  updateProlificConfig(config: Partial<ProlificConfig>) {
    this.experiment.prolificConfig = {
      ...this.experiment.prolificConfig,
      ...config,
    };
  }

  setCurrentStageId(id: string | undefined) {
    this.currentStageId = id;
  }

  jumpToLastStage() {
    const stage = this.stages[this.stages.length - 1];
    const id = stage ? stage.id : undefined;
    this.setCurrentStageId(id);
  }

  @computed get currentStage() {
    return this.stages.find((stage) => stage.id === this.currentStageId);
  }

  hasStageKind(kind: StageKind) {
    return this.stages.findIndex((stage) => stage.kind === kind) !== -1;
  }

  updateStage(newStage: StageConfig) {
    const index = this.stages.findIndex((stage) => stage.id === newStage.id);
    if (index >= 0) {
      this.stages[index] = newStage;
    }
  }

  setStages(stages: StageConfig[]) {
    for (let stage of stages) {
      this.addStage(stage);
    }
  }

  addStage(stage: StageConfig) {
    this.stages.push(stage);
    if (mustWaitForAllParticipants(stage, this.stages)) {
      stage.progress.waitForAllParticipants = true;
    }
  }

  getStage(stageId: string) {
    return this.stages.find((stage) => stage.id === stageId);
  }

  deleteStage(index: number) {
    this.stages = [
      ...this.stages.slice(0, index),
      ...this.stages.slice(index + 1),
    ];
  }

  moveStageUp(index: number) {
    this.stages = [
      ...this.stages.slice(0, index - 1),
      ...this.stages.slice(index, index + 1),
      ...this.stages.slice(index - 1, index),
      ...this.stages.slice(index + 1),
    ];
  }

  moveStageDown(index: number) {
    this.stages = [
      ...this.stages.slice(0, index),
      ...this.stages.slice(index + 1, index + 2),
      ...this.stages.slice(index, index + 1),
      ...this.stages.slice(index + 2),
    ];
  }

  toggleStageBuilderDialog(showGames: boolean = false) {
    this.showStageBuilderDialog = !this.showStageBuilderDialog;
    this.showGamesTab = showGames;
  }

  loadExperiment(experiment: Experiment, stages: StageConfig[]) {
    this.experiment = experiment;
    this.stages = stages;
  }

  resetExperiment() {
    this.experiment = createExperimentConfig();
    this.stages = [];
  }

  // *********************************************************************** //
  // FIRESTORE                                                               //
  // *********************************************************************** //

  /** Create or update an experiment.
   * @rights Experimenter
   */
  async writeExperiment() {
    this.isWritingExperiment = true;

    // Update date modified
    this.experiment.metadata.dateModified = Timestamp.now();

    const response = await writeExperimentCallable(
      this.sp.firebaseService.functions,
      {
        collectionName: 'experiments',
        experimentConfig: this.experiment,
        stageConfigs: this.stages,
      }
    );

    this.isWritingExperiment = false;
    return response;
  }
}
