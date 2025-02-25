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
  AgentConfig,
  AgentPromptConfig,
  AgentMediatorConfig,
  AgentMediatorModelSettings,
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
    createAgentMediatorConfig('testChatId', {id: 'test'}),
  ];

  addAgentMediator(chatStageId: string = '') {
    this.agentMediators.push(createAgentMediatorConfig(chatStageId));
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
    modelSettings: Partial<AgentMediatorModelSettings>,
  ) {
    const agent = this.getAgentMediator(id);
    if (agent) {
      agent.modelSettings = {...agent.modelSettings, ...modelSettings};
    }
  }

  updateAgentMediatorPromptConfig(
    id: string,
    promptConfig: Partial<AgentPromptConfig>,
  ) {
    const agent = this.getAgentMediator(id);
    if (agent) {
      agent.promptConfig = {...agent.promptConfig, ...promptConfig};
    }
  }

  addAgentMediatorCustomRequestBodyField(agentId: string) {
    const agent = this.getAgentMediator(agentId);
    if (agent) {
      const fields = agent.modelSettings.customRequestBodyFields;
      const newField = {name: '', value: ''};
      const customRequestBodyFields = [...fields, newField];
      agent.modelSettings = {...agent.modelSettings, customRequestBodyFields};
    }
  }

  updateAgentMediatorCustomRequestBodyField(
    agentId: string,
    fieldIndex: number,
    field: Partial<{name: string; value: string}>,
  ) {
    const agent = this.getAgentMediator(agentId);
    if (agent) {
      const customRequestBodyFields =
        agent.modelSettings.customRequestBodyFields;
      customRequestBodyFields[fieldIndex] = {
        ...customRequestBodyFields[fieldIndex],
        ...field,
      };
      agent.modelSettings = {...agent.modelSettings, customRequestBodyFields};
    }
  }

  deleteAgentMediatorCustomRequestBodyField(
    agentId: string,
    fieldIndex: number,
  ) {
    const agent = this.getAgentMediator(agentId);
    if (agent) {
      const fields = agent.modelSettings.customRequestBodyFields;
      const customRequestBodyFields = [
        ...fields.slice(0, fieldIndex),
        ...fields.slice(fieldIndex + 1),
      ];
      agent.modelSettings = {...agent.modelSettings, customRequestBodyFields};
    }
  }

  resetAgents() {
    this.agentMediators = [];
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
