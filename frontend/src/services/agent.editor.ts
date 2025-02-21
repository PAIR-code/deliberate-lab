import {
  ChatStageConfig,
  Experiment,
  StageConfig,
  StageKind,
} from '@deliberation-lab/utils';
import {Timestamp} from 'firebase/firestore';
import {computed, makeObservable, observable} from 'mobx';

import {FirebaseService} from './firebase.service';
import {Service} from './service';

import {
  AgentChatPromptConfig,
  AgentChatSettings,
  AgentConfig,
  AgentMediatorConfig,
  AgentModelSettings,
  ModelGenerationConfig,
  createAgentMediatorConfig,
} from '@deliberation-lab/utils';
import {updateChatAgentsCallable} from '../shared/callables';

interface ServiceProvider {
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
  // TODO: Instead of creating a single test agent mediator,
  // enable users to create multiple mediators for specific stages
  @observable agentMediators: AgentMediatorConfig[] = [
    createAgentMediatorConfig({id: 'test'}),
  ];

  // Maps from agent ID to (stage ID to stage chat prompt)
  @observable agentChatPromptMap: Record<
    string,
    Record<string, AgentChatPromptConfig>
  > = {};

  addAgentMediator() {
    this.agentMediators.push(createAgentMediatorConfig());
  }

  getAgentMediator(id: string) {
    return this.agentMediators.find((agent) => agent.id === id);
  }

  updateAgentMediatorName(id: string, name: string) {
    const agent = this.getAgentMediator(id);
    if (agent) {
      agent.name = name;
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
    }
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
