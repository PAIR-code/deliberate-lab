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

  @observable agentMediators: AgentPersonaConfig[] = [];
  // Mediator selected in panel
  @observable currentAgentMediatorId = '';
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
    const agent = createAgentPersonaConfig();
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

  updateAgentMediatorProfile(
    id: string,
    profile: Partial<ParticipantProfileBase>,
  ) {
    const agent = this.getAgentMediator(id);
    if (agent) {
      agent.defaultProfile = {...agent.defaultProfile, ...profile};
    }
  }

  updateAgentMediatorPrivateName(id: string, name: string) {
    const agent = this.getAgentMediator(id);
    if (agent) {
      agent.name = name;
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

  updateAgentMediatorStructuredOutputConfig(
    id: string,
    stageId: string,
    newStructuredOutputConfig: Partial<StructuredOutputConfig>,
  ) {
    const agent = this.getAgentMediator(id);
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

  addAgentMediatorStructuredOutputSchemaField(
    agentId: string,
    stageId: string,
  ) {
    const agent = this.getAgentMediator(agentId);
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
      this.updateAgentMediatorStructuredOutputConfig(agentId, stageId, {
        schema: promptConfig.structuredOutputConfig.schema,
      });
    }
  }

  updateAgentMediatorStructuredOutputSchemaField(
    agentId: string,
    stageId: string,
    fieldIndex: number,
    field: Partial<{name: string; schema: Partial<StructuredOutputSchema>}>,
  ) {
    const agent = this.getAgentMediator(agentId);
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
        this.updateAgentMediatorStructuredOutputConfig(agentId, stageId, {
          schema,
        });
      }
    }
  }

  deleteAgentMediatorStructuredOutputSchemaField(
    agentId: string,
    stageId: string,
    fieldIndex: number,
  ) {
    const agent = this.getAgentMediator(agentId);
    const promptConfig = this.agentChatPromptMap[agentId][stageId];
    if (agent && promptConfig) {
      const schema = promptConfig.structuredOutputConfig.schema;
      if (schema && schema.properties) {
        schema.properties = [
          ...schema.properties.slice(0, fieldIndex),
          ...schema.properties.slice(fieldIndex + 1),
        ];
        this.updateAgentMediatorStructuredOutputConfig(agentId, stageId, {
          schema,
        });
      }
    }
  }

  /** Return all agents in AgentDataObject format. */
  getAgentData(): AgentDataObject[] {
    const agentData: AgentDataObject[] = [];
    Object.values(this.agentMediators).forEach((persona) => {
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
      this.agentMediators.push(data.persona);
      this.agentChatPromptMap[data.persona.id] = data.chatPromptMap;
      this.agentParticipantPromptMap[data.persona.id] =
        data.participantPromptMap;
    });
  }

  resetAgents() {
    this.agentMediators = [];
    this.agentChatPromptMap = {};
    this.agentParticipantPromptMap = {};
  }
}
