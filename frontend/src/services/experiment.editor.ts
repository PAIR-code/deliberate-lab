import {
  AgentMediatorTemplate,
  AgentMediatorPersonaConfig,
  AgentParticipantPersonaConfig,
  AgentPersonaType,
  AgentParticipantTemplate,
  ApiKeyType,
  CohortParticipantConfig,
  Experiment,
  ExperimentTemplate,
  MediatorPromptConfig,
  MetadataConfig,
  ParticipantPromptConfig,
  PermissionsConfig,
  ProlificConfig,
  StageConfig,
  StageKind,
  StageManager,
  VariableConfig,
  STAGE_MANAGER,
  checkApiKeyExists,
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
import {ExperimentManager} from './experiment.manager';
import {FirebaseService} from './firebase.service';
import {Service} from './service';
import {setMustWaitForAllParticipants} from '../shared/experiment.utils';

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
  // WARNING: Use this.stages as source of truth for stage ordering,
  // not this.experiment.stageIds (which will be overridden)
  // TODO: Consolidate these fields into ExperimentTemplate
  @observable experiment: Experiment = createExperimentConfig();
  @observable stages: StageConfig[] = [];
  @observable agentMediators: AgentMediatorTemplate[] = [];

  // WARNING: We are not currently permitting agent participant peraons to be
  // set in the editor (so this list is expected to be empty).
  // Rather, agent participants are defined on the spot in the experiment
  // dashboard and will use a default set of prompts (see PR #864)
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

  getExperimentConfigErrors() {
    const errors: string[] = [];

    if (this.experiment.metadata.name.length === 0) {
      errors.push('Experiment does not have a name');
    }

    if (this.stages.length === 0) {
      errors.push('You must add at least one stage to your experiment');
    }

    // Check if relevant API key is set up for agents
    const hasAgentsWithApiType = (apiType: ApiKeyType) => {
      const agents = [...this.agentMediators, ...this.agentParticipants].filter(
        (agent) => agent.persona.defaultModelSettings.apiType === apiType,
      );
      return (
        agents.length > 0 &&
        !checkApiKeyExists(apiType, this.sp.authService.experimenterData)
      );
    };

    const renderApiErrorMessage = (apiType: ApiKeyType) => {
      if (hasAgentsWithApiType(apiType)) {
        errors.push(
          `Your experiment includes agents that use the ${apiType} API, but you have not set your API key yet`,
        );
      }
    };
    renderApiErrorMessage(ApiKeyType.GEMINI_API_KEY);
    renderApiErrorMessage(ApiKeyType.OPENAI_API_KEY);
    renderApiErrorMessage(ApiKeyType.OLLAMA_CUSTOM_URL);

    for (const stage of this.stages) {
      switch (stage.kind) {
        case StageKind.SURVEY:
          // Ensure all questions have a non-empty title
          stage.questions.forEach((question, index) => {
            if (question.questionTitle === '') {
              errors.push(
                `${stage.name} question ${index + 1} is missing a title`,
              );
            }
          });
          break;
      }
    }
    return errors;
  }

  getMediatorAllowedStages() {
    return this.stages.filter(
      (stage) =>
        stage.kind === StageKind.CHAT || stage.kind === StageKind.PRIVATE_CHAT,
    );
  }

  @computed get canEditStages() {
    return this.sp.experimentManager.canEditExperimentStages;
  }

  loadExperiment(experiment: Experiment, stages: StageConfig[]) {
    this.experiment = experiment;
    this.setStages(stages);
  }

  loadTemplate(template: ExperimentTemplate, loadExperimentId = false) {
    // Only copy over relevant parts (e.g., not template ID)
    this.experiment = createExperimentConfig(template.stageConfigs, {
      id: loadExperimentId ? template.experiment.id : generateId(),
      metadata: template.experiment.metadata,
      permissions: template.experiment.permissions,
      defaultCohortConfig: template.experiment.defaultCohortConfig,
      prolificConfig: template.experiment.prolificConfig,
      variableConfigs: template.experiment.variableConfigs,
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

  addVariableConfig(variable: VariableConfig) {
    this.experiment.variableConfigs = [
      ...(this.experiment.variableConfigs ?? []),
      variable,
    ];
  }

  // TODO: Ensure that variable names are unique
  updateVariableConfig(newVariable: VariableConfig, index: number) {
    if (!this.experiment.variableConfigs) {
      return false;
    }
    if (index >= 0) {
      this.experiment.variableConfigs = [
        ...this.experiment.variableConfigs.slice(0, index),
        newVariable,
        ...this.experiment.variableConfigs.slice(index + 1),
      ];
    }
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

  setAgentIdToLatest(isMediator: boolean = true) {
    const agents = isMediator ? this.agentMediators : this.agentParticipants;
    if (agents.length === 0) {
      this.setCurrentAgentId('');
    } else {
      this.setCurrentAgentId(agents[agents.length - 1].persona.id);
    }
  }

  setAgentMediators(templates: AgentMediatorTemplate[]) {
    this.agentMediators = templates;
  }

  // WARNING: We are not currently allowing experimenters to edit
  // agent participant personas in the editor.
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

  // WARNING: We are not currently allowing experimenters to edit
  // agent participant personas in the editor.
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

  // WARNING: We are not currently allowing experimenters to edit
  // agent participant personas in the editor.
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

  getAgent(id: string) {
    const mediator = this.getAgentMediator(id);
    return mediator ? mediator : this.getAgentParticipant(id);
  }

  getAgentMediator(id: string) {
    return this.agentMediators.find((agent) => agent.persona.id === id);
  }

  // WARNING: We are not currently allowing experimenters to edit
  // agent participant personas in the editor.
  getAgentParticipant(id: string) {
    return this.agentParticipants.find((agent) => agent.persona.id === id);
  }

  addAgentMediatorPrompt(agentId: string, stageId: string) {
    const agent = this.getAgentMediator(agentId);
    const stage = this.getStage(stageId);
    if (!agent || !stage) return;
    // Can only add mediator to chat prompts for now
    if (
      stage.kind !== StageKind.CHAT &&
      stage.kind !== StageKind.PRIVATE_CHAT
    ) {
      return;
    }

    const prompt = STAGE_MANAGER.getDefaultMediatorStructuredPrompt(stage);

    if (prompt) {
      agent.promptMap[stageId] = prompt;
    }
  }

  // WARNING: We are not currently allowing experimenters to edit
  // agent participant personas in the editor.
  addAgentParticipantPrompt(agentId: string, stageId: string) {
    const agent = this.getAgentParticipant(agentId);
    const stage = this.getStage(stageId);
    if (!agent || !stage) return;

    const prompt = STAGE_MANAGER.getDefaultParticipantStructuredPrompt(stage);
    if (prompt) {
      agent.promptMap[stageId] = prompt;
    }
  }

  updateAgentMediatorPersona(
    id: string,
    updatedPersona: Partial<AgentMediatorPersonaConfig>,
  ) {
    const agentIndex = this.agentMediators.findIndex(
      (agent) => agent.persona.id === id,
    );
    if (agentIndex === -1) return;

    const oldAgent = this.agentMediators[agentIndex];
    this.agentMediators = [
      ...this.agentMediators.slice(0, agentIndex),
      {
        persona: {...oldAgent.persona, ...updatedPersona},
        promptMap: oldAgent.promptMap,
      },
      ...this.agentMediators.slice(agentIndex + 1),
    ];
  }

  updateAgentMediatorPrompt(id: string, updatedPrompt: MediatorPromptConfig) {
    const agent = this.getAgentMediator(id);
    if (!agent) return;
    agent.promptMap[updatedPrompt.id] = updatedPrompt;
  }

  deleteAgentMediatorPrompt(agentId: string, stageId: string) {
    const agent = this.getAgentMediator(agentId);
    if (!agent) return;
    delete agent.promptMap[stageId];
  }

  updateAgentParticipantPrompt(
    id: string,
    updatedPrompt: ParticipantPromptConfig,
  ) {
    // TODO: Permit non-chat prompt edits
    if (
      updatedPrompt.type !== StageKind.CHAT &&
      updatedPrompt.type !== StageKind.PRIVATE_CHAT
    ) {
      return;
    }
    const agent = this.getAgentParticipant(id);
    if (!agent) return;
    agent.promptMap[updatedPrompt.id] = updatedPrompt;
  }

  deleteAgentParticipantPrompt(agentId: string, stageId: string) {
    const agent = this.getAgentParticipant(agentId);
    if (!agent) return;
    delete agent.promptMap[stageId];
  }

  updateAgentParticipantPersona(
    id: string,
    updatedPersona: Partial<AgentParticipantPersonaConfig>,
  ) {
    const agentIndex = this.agentParticipants.findIndex(
      (agent) => agent.persona.id === id,
    );
    if (agentIndex === -1) return;

    const oldAgent = this.agentParticipants[agentIndex];
    this.agentParticipants = [
      ...this.agentParticipants.slice(0, agentIndex),
      {
        persona: {...oldAgent.persona, ...updatedPersona},
        promptMap: oldAgent.promptMap,
      },
      ...this.agentParticipants.slice(agentIndex + 1),
    ];
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
