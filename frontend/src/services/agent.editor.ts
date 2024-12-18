import {
  ChatStageConfig,
  Experiment,
  StageConfig,
  StageKind
} from '@deliberation-lab/utils';
import { Timestamp } from 'firebase/firestore';
import {computed, makeObservable, observable} from 'mobx';

import {FirebaseService} from './firebase.service';
import {Service} from './service';

import {AgentConfig} from '@deliberation-lab/utils';
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

  // Experiment ID
  @observable experimentId: string|null = null;
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

  updateAgent(
    stageId: string,
    agent: AgentConfig,
    index: number
  ) {
    const config = this.configMap[stageId];
    if (!config) return;

    const agents = [
      ...config.agents.slice(0, index),
      agent,
      ...config.agents.slice(index + 1)
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
  // FIRESTORE                                                               //
  // *********************************************************************** //

  // Write chat agents to backend
  async saveChatAgents(stageId: string) {
    if (!this.experimentId || !this.configMap[stageId]) return;

    await updateChatAgentsCallable(
      this.sp.firebaseService.functions,
      {
        experimentId: this.experimentId,
        stageId,
        agentList: this.configMap[stageId].agents,
      }
    );
  }
}