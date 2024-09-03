import {
  AttentionCheckConfig,
  Experiment,
  MetadataConfig,
  ParticipantConfig,
  PermissionsConfig,
  ProlificConfig,
  StageConfig,
  StageKind,
  createAttentionCheckConfig,
  createExperimentConfig,
  createMetadataConfig,
  createParticipantConfig,
  createPermissionsConfig,
  createProlificConfig,
  generateId,
} from '@deliberation-lab/utils';
import {computed, makeObservable, observable} from 'mobx';
import {
  writeExperimentCallable,
  deleteExperimentCallable,
} from '../shared/callables';

import {FirebaseService} from './firebase.service';
import {Service} from './service';

interface ServiceProvider {
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

  // Experiment fields
  @observable id: string | null = null;
  @observable metadata: MetadataConfig = createMetadataConfig();
  @observable permissions: PermissionsConfig = createPermissionsConfig();
  @observable defaultParticipantConfig: ParticipantConfig = createParticipantConfig();
  @observable attentionCheckConfig: AttentionCheckConfig = createAttentionCheckConfig();
  @observable prolificConfig: ProlificConfig = createProlificConfig();
  @observable stages: StageConfig[] = [];

  // Editor tooling
  @observable currentStageId: string | undefined = undefined;
  @observable showStageBuilderDialog = false;

  @computed get isValidExperimentConfig() {
    // TODO: Add other validation checks here
    return this.metadata.name.length > 0;
  }

  isInitializedExperiment() {
    return this.id !== null;
  }

  updateMetadata(metadata: Partial<MetadataConfig>) {
    this.metadata = {...this.metadata, ...metadata};
  }

  setCurrentStageId(id: string|undefined) {
    this.currentStageId = id;
  }

  @computed get currentStage() {
    return this.stages.find(stage => stage.id === this.currentStageId);
  }

  hasStageKind(kind: StageKind) {
    return this.stages.findIndex((stage) => stage.kind === kind) !== -1;
  }

  updateStage(newStage: StageConfig) {
    const index = this.stages.findIndex(stage => stage.id === newStage.id);
    if (index >= 0) {
      this.stages[index] = newStage;
    }
  }

  addStage(stage: StageConfig) {
    this.stages.push(stage);
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

  toggleStageBuilderDialog() {
    this.showStageBuilderDialog = !this.showStageBuilderDialog;
  }

  loadExperiment(experiment: Experiment) {
    this.id = experiment.id;
    this.metadata = experiment.metadata;
    this.permissions = experiment.permissions;
    this.defaultParticipantConfig = experiment.defaultParticipantConfig;
    this.attentionCheckConfig = experiment.attentionCheckConfig;
    this.prolificConfig = experiment.prolificConfig;
    // TODO: Load stages
  }

  resetExperiment() {
    this.id = null;
    this.metadata = createMetadataConfig();
    this.permissions = createPermissionsConfig();
    this.defaultParticipantConfig = createParticipantConfig();
    this.attentionCheckConfig = createAttentionCheckConfig();
    this.prolificConfig = createProlificConfig();
    this.stages = [];
  }

  // *********************************************************************** //
  // FIRESTORE                                                               //
  // *********************************************************************** //

  /** Create or update an experiment.
   * @rights Experimenter
   */
  async writeExperiment() {
    const experimentConfig = {
      metadata: this.metadata,
      permissions: this.permissions,
      defaultParticipantConfig: this.defaultParticipantConfig,
      attentionCheckConfig: this.attentionCheckConfig,
      prolificConfig: this.prolificConfig,
    };

    return writeExperimentCallable(this.sp.firebaseService.functions, {
      collectionName: 'experiments',
      experimentId: this.id,
      experimentConfig,
      stageConfigs: this.stages,
    });
  }

  /** Delete an experiment.
   * @rights Experimenter
   */
  async deleteExperiment(experimentId: string) {
    return deleteExperimentCallable(this.sp.firebaseService.functions, {
      collectionName: 'experiments',
      experimentId: experimentId,
    });
  }
}