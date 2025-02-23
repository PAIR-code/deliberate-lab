import {Timestamp} from 'firebase/firestore';
import {computed, makeObservable, observable} from 'mobx';

import {FirebaseService} from './firebase.service';
import {ExperimentManager} from './experiment.manager';
import {Service} from './service';

import {
  AgentChatPromptConfig,
  AgentChatSettings,
  AgentConfig,
  AgentMediatorConfig,
  AgentModelSettings,
  ChatStageConfig,
  Experiment,
  StageConfig,
  StageKind,
  ModelGenerationConfig,
  createAgentMediatorConfig,
  createAgentChatPromptConfig,
} from '@deliberation-lab/utils';
import {updateChatAgentsCallable} from '../shared/callables';

interface ServiceProvider {
  experimentManager: ExperimentManager;
  firebaseService: FirebaseService;
}

/**
 * Manage live agent editing in experimenter panel.
 */
export class AgentEditor extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  // *********************************************************************** //
  // WARNING: Variables/functions for old chat agent config are soon to be   //
  //          deprecated.                                                    //
  // *********************************************************************** //

  // Experiment ID
  @observable experimentId: string | null = null;
  // Stage ID to chat config
  // TODO: Map from stage ID to AgentConfig list?
  @observable configMap: Record<string, ChatStageConfig> = {};

  setExperimentId(id: string) {
    this.experimentId = id;
  }

  getAgents(stageId: string): AgentConfig[] {
    return this.configMap[stageId]?.agents ?? [];
  }

  addConfig(config: ChatStageConfig) {
    this.configMap[config.id] = config;
  }

  updateConfig(config: ChatStageConfig) {
    this.configMap[config.id] = config;
  }

  updateAgent(stageId: string, agent: AgentConfig, index: number) {
    const config = this.configMap[stageId];
    if (!config) return;

    const agents = [
      ...config.agents.slice(0, index),
      agent,
      ...config.agents.slice(index + 1),
    ];

    this.updateConfig({
      ...config,
      agents,
    });
  }

  reset() {
    this.experimentId = null;
    this.configMap = {};
  }

  // *********************************************************************** //
  // TODO: VARIABLES/FUNCTIONS FOR NEW AGENT MEDIATOR/PARTICIPANT CONFIGS    //
  // *********************************************************************** //
  @observable agentMediators: AgentMediatorConfig[] = [];
  // Mediator selected in panel
  @observable currentAgentMediatorId = '';
  // Maps from agent ID to (stage ID to stage chat prompt)
  @observable agentChatPromptMap: Record<
    string,
    Record<string, AgentChatPromptConfig>
  > = {};
  // Maps from agent ID to test API response
  @observable agentTestResponseMap: Record<string, string> = {};

  // Display variables for agent editor
  // If active stage ID is empty, show agent settings
  @observable activeStageId = '';

  setActiveStageId(stageId: string) {
    this.activeStageId = stageId;
  }

  @computed get currentAgentMediator() {
    return this.getAgentMediator(this.currentAgentMediatorId);
  }

  setCurrentAgentMediator(id: string) {
    this.currentAgentMediatorId = id;
  }

  addAgentMediator(setAsCurrent = true) {
    const agent = createAgentMediatorConfig();
    this.agentMediators.push(agent);
    this.agentChatPromptMap[agent.id] = {};
    if (setAsCurrent) {
      this.currentAgentMediatorId = agent.id;
    }
  }

  deleteAgentMediator(id: string) {
    const agentIndex = this.agentMediators.findIndex(
      (agent) => agent.id === id,
    );
    if (agentIndex === -1) return;
    this.agentMediators = [
      ...this.agentMediators.slice(0, agentIndex),
      ...this.agentMediators.slice(agentIndex + 1),
    ];
  }

  getAgentMediator(id: string) {
    return this.agentMediators.find((agent) => agent.id === id);
  }

  async testAgentConfig(agentConfig: AgentMediatorConfig) {
    const response =
      await this.sp.experimentManager.testAgentConfig(agentConfig);
    this.agentTestResponseMap[agentConfig.id] = response;
  }

  getTestResponse(agentId = this.currentAgentMediatorId) {
    return this.agentTestResponseMap[agentId] ?? '';
  }

  updateAgentMediatorName(id: string, name: string) {
    const agent = this.getAgentMediator(id);
    if (agent) {
      agent.name = name;
    }
  }

  updateAgentMediatorPrivateName(id: string, name: string) {
    const agent = this.getAgentMediator(id);
    if (agent) {
      agent.privateName = name;
    }
  }

  updateAgentMediatorAvatar(id: string, avatar: string) {
    const agent = this.getAgentMediator(id);
    if (agent) {
      agent.avatar = avatar;
    }
  }

  updateAgentMediatorModelSettings(
    id: string,
    defaultModelSettings: Partial<AgentModelSettings>,
  ) {
    const agent = this.getAgentMediator(id);
    if (agent) {
      agent.defaultModelSettings = {
        ...agent.defaultModelSettings,
        ...defaultModelSettings,
      };
      // Update model settings for all prompt configs too
      Object.values(this.agentChatPromptMap).forEach((prompt) => {
        prompt.modelSettings = {
          ...prompt.modelSettings,
          ...defaultModelSettings,
        };
      });
    }
  }

  addAgentMediatorPrompt(agentId: string, stageConfig: StageConfig) {
    const agent = this.getAgentMediator(agentId);
    if (agent && !this.agentChatPromptMap[agentId][stageConfig.id]) {
      this.agentChatPromptMap[agentId][stageConfig.id] =
        createAgentChatPromptConfig(stageConfig.id, stageConfig.kind);
    }
  }

  getAgentMediatorPrompt(agentId: string, stageId: string) {
    return this.agentChatPromptMap[agentId][stageId];
  }

  deleteAgentMediatorPrompt(agentId: string, stageId: string) {
    delete this.agentChatPromptMap[agentId][stageId];
  }

  updateAgentMediatorChatSettings(
    agentId: string,
    stageId: string,
    chatSettings: Partial<AgentChatSettings>,
  ) {
    const agent = this.getAgentMediator(agentId);
    const promptConfig = this.agentChatPromptMap[agentId][stageId];
    if (agent && promptConfig) {
      promptConfig.chatSettings = {
        ...promptConfig.chatSettings,
        ...chatSettings,
      };
    }
  }

  updateAgentMediatorGenerationConfig(
    agentId: string,
    stageId: string,
    generationConfig: Partial<ModelGenerationConfig>,
  ) {
    const agent = this.getAgentMediator(agentId);
    const promptConfig = this.agentChatPromptMap[agentId][stageId];
    if (agent && promptConfig) {
      promptConfig.generationConfig = {
        ...promptConfig.generationConfig,
        ...generationConfig,
      };
    }
  }

  updateAgentMediatorPromptConfig(
    id: string,
    stageId: string,
    promptConfig: Partial<AgentChatPromptConfig>,
  ) {
    const agent = this.getAgentMediator(id);
    const config = this.agentChatPromptMap[id][stageId];
    if (agent && config) {
      this.agentChatPromptMap[id][stageId] = {...config, ...promptConfig};
    }
  }

  addAgentMediatorCustomRequestBodyField(agentId: string, stageId: string) {
    const agent = this.getAgentMediator(agentId);
    const promptConfig = this.agentChatPromptMap[agentId][stageId];
    if (agent && promptConfig) {
      const fields = promptConfig.generationConfig.customRequestBodyFields;
      const newField = {name: '', value: ''};
      const customRequestBodyFields = [...fields, newField];
      promptConfig.generationConfig = {
        ...promptConfig.generationConfig,
        customRequestBodyFields,
      };
    }
  }

  updateAgentMediatorCustomRequestBodyField(
    agentId: string,
    stageId: string,
    fieldIndex: number,
    field: Partial<{name: string; value: string}>,
  ) {
    const agent = this.getAgentMediator(agentId);
    const promptConfig = this.agentChatPromptMap[agentId][stageId];
    if (agent && promptConfig) {
      const customRequestBodyFields =
        promptConfig.generationConfig.customRequestBodyFields;
      customRequestBodyFields[fieldIndex] = {
        ...customRequestBodyFields[fieldIndex],
        ...field,
      };
      promptConfig.generationConfig = {
        ...promptConfig.generationConfig,
        customRequestBodyFields,
      };
    }
  }

  deleteAgentMediatorCustomRequestBodyField(
    agentId: string,
    stageId: string,
    fieldIndex: number,
  ) {
    const agent = this.getAgentMediator(agentId);
    const promptConfig = this.agentChatPromptMap[agentId][stageId];
    if (agent && promptConfig) {
      const fields = promptConfig.generationConfig.customRequestBodyFields;
      const customRequestBodyFields = [
        ...fields.slice(0, fieldIndex),
        ...fields.slice(fieldIndex + 1),
      ];
      promptConfig.generationConfig = {
        ...promptConfig.generationConfig,
        customRequestBodyFields,
      };
    }
  }

  resetAgents() {
    this.agentMediators = [];
    this.agentChatPromptMap = {};
  }

  // *********************************************************************** //
  // FIRESTORE                                                               //
  // *********************************************************************** //

  // Write chat agents to backend
  async saveChatAgents(stageId: string) {
    if (!this.experimentId || !this.configMap[stageId]) return;

    await updateChatAgentsCallable(this.sp.firebaseService.functions, {
      experimentId: this.experimentId,
      stageId,
      agentList: this.configMap[stageId].agents,
    });
  }
}
