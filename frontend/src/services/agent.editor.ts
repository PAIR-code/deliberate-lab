import {Timestamp} from 'firebase/firestore';
import {computed, makeObservable, observable} from 'mobx';

import {FirebaseService} from './firebase.service';
import {ExperimentManager} from './experiment.manager';
import {Service} from './service';

import {
  AgentChatPromptConfig,
  AgentChatSettings,
  AgentDataObject,
  AgentModelSettings,
  AgentParticipantPromptConfig,
  AgentPersonaConfig,
  AgentPersonaType,
  AgentResponseConfig,
  BaseAgentPromptConfig,
  ChatStageConfig,
  Experiment,
  ParticipantProfileBase,
  StageConfig,
  StageKind,
  StructuredOutputConfig,
  StructuredOutputDataType,
  StructuredOutputSchema,
  ModelGenerationConfig,
  createAgentChatPromptConfig,
  createAgentPersonaConfig,
} from '@deliberation-lab/utils';

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

  @observable agents: AgentPersonaConfig[] = [];
  // Agent selected in panel
  @observable currentAgentId = '';
  // Maps from agent ID to (stage ID to stage chat prompt)
  @observable agentChatPromptMap: Record<
    string,
    Record<string, AgentChatPromptConfig>
  > = {};
  // Maps from agent ID to (stage ID to stage participant prompt)
  @observable agentParticipantPromptMap: Record<
    string,
    Record<string, AgentParticipantPromptConfig>
  > = {};
  // Maps from agent ID to (stage ID to test API response)
  @observable agentTestResponseMap: Record<string, Record<string, string>> = {};

  // Display variables for agent editor
  // If active stage ID is assigned, show agent editor dialog
  @observable activeStageId = '';

  setActiveStageId(stageId: string) {
    this.activeStageId = stageId;
  }

  @computed get agentMediators() {
    return this.agents.filter(
      (agent) => agent.type === AgentPersonaType.MEDIATOR,
    );
  }

  @computed get currentAgentMediator() {
    return this.getAgentMediator(this.currentAgentId);
  }

  setCurrentAgent(id: string) {
    this.currentAgentId = id;
  }

  addAgentMediator(setAsCurrent = true) {
    const agent = createAgentPersonaConfig();
    this.agents.push(agent);
    this.agentChatPromptMap[agent.id] = {};
    if (setAsCurrent) {
      this.currentAgentId = agent.id;
    }
  }

  deleteAgent(id: string) {
    const agentIndex = this.agents.findIndex((agent) => agent.id === id);
    if (agentIndex === -1) return;
    this.agents = [
      ...this.agents.slice(0, agentIndex),
      ...this.agents.slice(agentIndex + 1),
    ];
  }

  getAgent(id: string) {
    return this.agents.find((agent) => agent.id === id);
  }

  getAgentMediator(id: string) {
    return this.agents.find(
      (agent) => agent.id === id && agent.type === AgentPersonaType.MEDIATOR,
    );
  }

  async testAgentConfig(
    agentConfig: AgentPersonaConfig,
    promptConfig: BaseAgentPromptConfig,
  ) {
    const response = await this.sp.experimentManager.testAgentConfig(
      agentConfig,
      promptConfig,
    );
    if (!this.agentTestResponseMap[agentConfig.id]) {
      this.agentTestResponseMap[agentConfig.id] = {};
    }
    this.agentTestResponseMap[agentConfig.id][promptConfig.id] = response;
  }

  getTestResponse(agentId: string, stageId: string) {
    if (!this.agentTestResponseMap[agentId]) return '';
    return this.agentTestResponseMap[agentId][stageId] ?? '';
  }

  updateAgentProfile(id: string, profile: Partial<ParticipantProfileBase>) {
    const agent = this.getAgent(id);
    if (agent) {
      agent.defaultProfile = {...agent.defaultProfile, ...profile};
    }
  }

  updateAgentPrivateName(id: string, name: string) {
    const agent = this.getAgent(id);
    if (agent) {
      agent.name = name;
    }
  }

  updateAgentChatModelSettings(
    id: string,
    defaultModelSettings: Partial<AgentModelSettings>,
  ) {
    const agent = this.getAgent(id);
    if (agent) {
      agent.defaultModelSettings = {
        ...agent.defaultModelSettings,
        ...defaultModelSettings,
      };
    }
  }

  addAgentChatPrompt(agentId: string, stageConfig: StageConfig) {
    const agent = this.getAgent(agentId);
    if (agent && !this.agentChatPromptMap[agentId][stageConfig.id]) {
      this.agentChatPromptMap[agentId][stageConfig.id] =
        createAgentChatPromptConfig(stageConfig.id, stageConfig.kind);
    }
  }

  getAgentChatPrompt(agentId: string, stageId: string) {
    return this.agentChatPromptMap[agentId][stageId];
  }

  deleteAgentChatPrompt(agentId: string, stageId: string) {
    delete this.agentChatPromptMap[agentId][stageId];
  }

  updateAgentChatSettings(
    agentId: string,
    stageId: string,
    chatSettings: Partial<AgentChatSettings>,
  ) {
    const agent = this.getAgent(agentId);
    const promptConfig = this.agentChatPromptMap[agentId][stageId];
    if (agent && promptConfig) {
      promptConfig.chatSettings = {
        ...promptConfig.chatSettings,
        ...chatSettings,
      };
    }
  }

  updateAgentChatGenerationConfig(
    agentId: string,
    stageId: string,
    generationConfig: Partial<ModelGenerationConfig>,
  ) {
    const agent = this.getAgent(agentId);
    const promptConfig = this.agentChatPromptMap[agentId][stageId];
    if (agent && promptConfig) {
      promptConfig.generationConfig = {
        ...promptConfig.generationConfig,
        ...generationConfig,
      };
    }
  }

  updateAgentChatPromptConfig(
    id: string,
    stageId: string,
    promptConfig: Partial<AgentChatPromptConfig>,
  ) {
    const agent = this.getAgent(id);
    const config = this.agentChatPromptMap[id][stageId];
    if (agent && config) {
      this.agentChatPromptMap[id][stageId] = {...config, ...promptConfig};
    }
  }

  updateAgentChatStructuredOutputConfig(
    id: string,
    stageId: string,
    newStructuredOutputConfig: Partial<StructuredOutputConfig>,
  ) {
    const agent = this.getAgent(id);
    const config = this.agentChatPromptMap[id][stageId];
    if (agent && config) {
      this.agentChatPromptMap[id][stageId] = {
        ...config,
        structuredOutputConfig: {
          ...config.structuredOutputConfig,
          ...newStructuredOutputConfig,
        },
      };
    }
  }

  addAgentChatCustomRequestBodyField(agentId: string, stageId: string) {
    const agent = this.getAgent(agentId);
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

  updateAgentChatCustomRequestBodyField(
    agentId: string,
    stageId: string,
    fieldIndex: number,
    field: Partial<{name: string; value: string}>,
  ) {
    const agent = this.getAgent(agentId);
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

  deleteAgentChatCustomRequestBodyField(
    agentId: string,
    stageId: string,
    fieldIndex: number,
  ) {
    const agent = this.getAgent(agentId);
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

  addAgentChatStructuredOutputSchemaField(agentId: string, stageId: string) {
    const agent = this.getAgent(agentId);
    const promptConfig = this.agentChatPromptMap[agentId][stageId];
    if (agent && promptConfig) {
      const schema = promptConfig.structuredOutputConfig.schema;
      const newField = {
        name: '',
        schema: {type: StructuredOutputDataType.STRING, description: ''},
      };
      if (schema) {
        schema.properties = schema.properties ?? [];
        schema.properties = [...schema.properties, newField];
      } else {
        promptConfig.structuredOutputConfig.schema = {
          type: StructuredOutputDataType.OBJECT,
          properties: [newField],
        };
      }
      this.updateAgentChatStructuredOutputConfig(agentId, stageId, {
        schema: promptConfig.structuredOutputConfig.schema,
      });
    }
  }

  updateAgentChatStructuredOutputSchemaField(
    agentId: string,
    stageId: string,
    fieldIndex: number,
    field: Partial<{name: string; schema: Partial<StructuredOutputSchema>}>,
  ) {
    const agent = this.getAgent(agentId);
    const promptConfig = this.agentChatPromptMap[agentId][stageId];
    if (agent && promptConfig) {
      const schema = promptConfig.structuredOutputConfig.schema;
      if (schema && schema.properties) {
        schema.properties[fieldIndex] = {
          name: field.name ?? schema.properties[fieldIndex].name,
          schema: {
            ...schema.properties[fieldIndex].schema,
            ...field.schema,
          },
        };
        this.updateAgentChatStructuredOutputConfig(agentId, stageId, {
          schema,
        });
      }
    }
  }

  deleteAgentChatStructuredOutputSchemaField(
    agentId: string,
    stageId: string,
    fieldIndex: number,
  ) {
    const agent = this.getAgent(agentId);
    const promptConfig = this.agentChatPromptMap[agentId][stageId];
    if (agent && promptConfig) {
      const schema = promptConfig.structuredOutputConfig.schema;
      if (schema && schema.properties) {
        schema.properties = [
          ...schema.properties.slice(0, fieldIndex),
          ...schema.properties.slice(fieldIndex + 1),
        ];
        this.updateAgentChatStructuredOutputConfig(agentId, stageId, {
          schema,
        });
      }
    }
  }

  /** Return all agents in AgentDataObject format. */
  getAgentData(): AgentDataObject[] {
    const agentData: AgentDataObject[] = [];
    Object.values(this.agents).forEach((persona) => {
      const chatPromptMap = this.agentChatPromptMap[persona.id];
      const participantPromptMap = this.agentParticipantPromptMap[persona.id];
      const agent: AgentDataObject = {
        persona,
        participantPromptMap: participantPromptMap ?? {},
        chatPromptMap: chatPromptMap ?? {},
      };
      agentData.push(agent);
    });
    return agentData;
  }

  /** Load given AgentDataObject items as agent configs and prompts. */
  setAgentData(agentData: AgentDataObject[]) {
    this.resetAgents();
    agentData.forEach((data) => {
      this.agents.push(data.persona);
      this.agentChatPromptMap[data.persona.id] = data.chatPromptMap;
      this.agentParticipantPromptMap[data.persona.id] =
        data.participantPromptMap;
    });
  }

  resetAgents() {
    this.agents = [];
    this.agentChatPromptMap = {};
    this.agentParticipantPromptMap = {};
  }
}
