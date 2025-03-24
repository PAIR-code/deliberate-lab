import {
  CohortParticipantConfig,
  Experiment,
  MetadataConfig,
  PermissionsConfig,
  ProlificConfig,
  StageConfig,
  StageKind,
  createExperimentConfig,
  createMetadataConfig,
  createPermissionsConfig,
  createProlificConfig,
  generateId,
} from '@deliberation-lab/utils';
import {Timestamp} from 'firebase/firestore';
import {computed, makeObservable, observable} from 'mobx';
import {
  writeExperimentCallable,
  updateExperimentCallable,
} from '../shared/callables';

import {AuthService} from './auth.service';
import {AgentEditor} from './agent.editor';
import {ExperimentManager} from './experiment.manager';
import {FirebaseService} from './firebase.service';
import {Service} from './service';
import {setMustWaitForAllParticipants} from '../shared/experiment.utils';

interface ServiceProvider {
  agentEditor: AgentEditor;
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
    if (this.experiment.metadata.name.length == 0) {
      return false;
    }

    for (const stage of this.stages) {
      switch (stage.kind) {
        case StageKind.SURVEY:
          // Ensure all questions have a non-empty title
          if (!stage.questions.every((q) => q.questionTitle !== '')) {
            return false;
          }
          break;
      }
    }
    return true;
  }

  @computed get canEditStages() {
    return this.sp.experimentManager.canEditExperimentStages;
  }

  // Return true if creator or admin
  @computed get isCreator() {
    return (
      this.sp.authService.userEmail === this.experiment.metadata.creator ||
      this.sp.authService.isAdmin ||
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
      // Update waitForAllParticipants if relevant
      setMustWaitForAllParticipants(newStage, this.stages);
      // Update stage in list
      this.stages[index] = newStage;
    }
  }

  setStages(stages: StageConfig[]) {
    // Make sure all new stages have waitForAllParticipants configured correctly
    for (const stage of stages) {
      setMustWaitForAllParticipants(stage, stages);
    }
    // Set stages
    this.stages = stages;
  }

  addStage(stage: StageConfig) {
    // Check if stage will have waitForAllParticipants dependencies
    // after it's added
    setMustWaitForAllParticipants(stage, [...this.stages, stage]);
    // Add stage
    this.stages.push(stage);
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
    this.setStages(stages);
  }

  resetExperiment() {
    this.experiment = createExperimentConfig();
    this.stages = [];
    this.sp.agentEditor.resetAgents();
  }

  // *********************************************************************** //
  // FIRESTORE                                                               //
  // *********************************************************************** //

  /** Create an experiment.
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
        agentConfigs: this.sp.agentEditor.getAgentData(),
      },
    );

    this.isWritingExperiment = false;
    return response;
  }

  /** Update an experiment.
   * @rights Experimenter who created the experiment
   */
  async updateExperiment() {
    this.isWritingExperiment = true;

    // Update date modified
    this.experiment.metadata.dateModified = Timestamp.now();

    const response = await updateExperimentCallable(
      this.sp.firebaseService.functions,
      {
        collectionName: 'experiments',
        experimentConfig: this.experiment,
        stageConfigs: this.stages,
        agentConfigs: this.sp.agentEditor.getAgentData(),
      },
    );

    this.isWritingExperiment = false;
    return response;
  }
}
