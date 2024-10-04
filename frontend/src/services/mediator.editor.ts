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

import {MediatorConfig} from '@deliberation-lab/utils';
import {updateChatMediatorsCallable} from '../shared/callables';

interface ServiceProvider {
  firebaseService: FirebaseService;
}

/**
 * Manage live mediator editing in experimenter panel.
 */
export class MediatorEditor extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  // Experiment ID
  @observable experimentId: string|null = null;
  // Stage ID to chat config
  // TODO: Map from stage ID to MediatorConfig list?
  @observable configMap: Record<string, ChatStageConfig> = {};

  setExperimentId(id: string) {
    this.experimentId = id;
  }

  getMediators(stageId: string): MediatorConfig[] {
    return this.configMap[stageId]?.mediators ?? [];
  }

  addConfig(config: ChatStageConfig) {
    this.configMap[config.id] = config;
  }

  updateConfig(config: ChatStageConfig) {
    this.configMap[config.id] = config;
  }

  updateMediator(
    stageId: string,
    mediator: MediatorConfig,
    index: number
  ) {
    const config = this.configMap[stageId];
    if (!config) return;

    const mediators = [
      ...config.mediators.slice(0, index),
      mediator,
      ...config.mediators.slice(index + 1)
    ];

    this.updateConfig({
      ...config,
      mediators,
    });
  }

  reset() {
    this.experimentId = null;
    this.configMap = {};
  }

  // *********************************************************************** //
  // FIRESTORE                                                               //
  // *********************************************************************** //

  // Write chat mediators to backend
  async saveChatMediators(stageId: string) {
    if (!this.experimentId || !this.configMap[stageId]) return;

    await updateChatMediatorsCallable(
      this.sp.firebaseService.functions,
      {
        experimentId: this.experimentId,
        stageId,
        mediatorList: this.configMap[stageId].mediators
      }
    );
  }
}