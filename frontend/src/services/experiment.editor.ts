import {
  AgentMediatorTemplate,
  AgentPersonaType,
  AgentParticipantTemplate,
  CohortParticipantConfig,
  Experiment,
  ExperimentTemplate,
  MetadataConfig,
  PermissionsConfig,
  ProlificConfig,
  StageConfig,
  StageKind,
  createAgentMediatorPersonaConfig,
  createAgentParticipantPersonaConfig,
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
  // WARNING: Use this.stages as source of truth for stage ordering,
  // not this.experiment.stageIds (which will be overridden)
  // TODO: Consolidate these fields into ExperimentTemplate
  @observable experiment: Experiment = createExperimentConfig();
  @observable stages: StageConfig[] = [];
  @observable agentMediators: AgentMediatorTemplate[] = [];
  @observable agentParticipants: AgentParticipantTemplate[] = [];

  // Loading
  @observable isWritingExperiment = false;

  // Editor tooling
  @observable currentAgentId: string | undefined = undefined;
  @observable currentStageId: string | undefined = undefined;
  @observable showStageBuilderDialog = false;
  @observable showTemplatesTab = false;

  // **************************************************************************
  // EXPERIMENT LOADING
  // **************************************************************************

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

  loadExperiment(experiment: Experiment, stages: StageConfig[]) {
    this.experiment = experiment;
    this.setStages(stages);
  }

  loadTemplate(template: ExperimentTemplate) {
    // Only copy over relevant parts (e.g., not template ID)
    this.experiment = createExperimentConfig(template.stageConfigs, {
      metadata: template.experiment.metadata,
      permissions: template.experiment.permissions,
      defaultCohortConfig: template.experiment.defaultCohortConfig,
      prolificConfig: template.experiment.prolificConfig,
    });
    this.setStages(template.stageConfigs);
    this.setAgentMediators(template.agentMediators);
    this.setAgentParticipants(template.agentParticipants);
  }

  resetExperiment() {
    this.experiment = createExperimentConfig();
    this.stages = [];
    this.agentMediators = [];
    this.agentParticipants = [];

    this.sp.agentEditor.resetAgents();
  }

  // **************************************************************************
  // EXPERIMENT CONFIG
  // **************************************************************************

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

  // **************************************************************************
  // STAGE CONFIGS
  // **************************************************************************

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

  toggleStageBuilderDialog(showTemplates: boolean = false) {
    this.showStageBuilderDialog = !this.showStageBuilderDialog;
    this.showTemplatesTab = showTemplates;
  }

  // **************************************************************************
  // AGENT PERSONA CONFIGS
  // **************************************************************************
  @computed get currentAgent() {
    return [...this.agentMediators, ...this.agentParticipants].find(
      (agent) => agent.persona.id === this.currentAgentId,
    );
  }

  setCurrentAgentId(id: string) {
    this.currentAgentId = id;
  }

  setAgentMediators(templates: AgentMediatorTemplate[]) {
    this.agentMediators = templates;
  }

  setAgentParticipants(templates: AgentParticipantTemplate[]) {
    this.agentParticipants = templates;
  }

  addAgentMediator(setAsCurrent = true) {
    const persona = createAgentMediatorPersonaConfig();
    this.agentMediators.push({
      persona,
      promptMap: {},
    });
    if (setAsCurrent) {
      this.setCurrentAgentId(persona.id);
    }
  }

  addAgentParticipant(setAsCurrent = true) {
    const persona = createAgentParticipantPersonaConfig();
    this.agentParticipants.push({
      persona,
      promptMap: {},
    });
    if (setAsCurrent) {
      this.setCurrentAgentId(persona.id);
    }
  }

  deleteAgentMediator(id: string) {
    const agentIndex = this.agentMediators.findIndex(
      (agent) => agent.persona.id === id,
    );
    if (agentIndex === -1) return;
    this.agentMediators = [
      ...this.agentMediators.slice(0, agentIndex),
      ...this.agentMediators.slice(agentIndex + 1),
    ];
  }

  deleteAgentParticipant(id: string) {
    const agentIndex = this.agentParticipants.findIndex(
      (agent) => agent.persona.id === id,
    );
    if (agentIndex === -1) return;
    this.agentParticipants = [
      ...this.agentParticipants.slice(0, agentIndex),
      ...this.agentParticipants.slice(agentIndex + 1),
    ];
  }

  getAgentMediator(id: string) {
    return this.agentMediators.find((agent) => agent.persona.id === id);
  }

  getAgentParticipant(id: string) {
    return this.agentParticipants.find((agent) => agent.persona.id === id);
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
        experimentTemplate: {
          id: '',
          experiment: this.experiment,
          stageConfigs: this.stages,
          agentMediators: this.agentMediators,
          agentParticipants: this.agentParticipants,
        },
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
        experimentTemplate: {
          id: '',
          experiment: this.experiment,
          stageConfigs: this.stages,
          agentMediators: this.agentMediators,
          agentParticipants: this.agentParticipants,
        },
      },
    );

    this.isWritingExperiment = false;
    return response;
  }
}
