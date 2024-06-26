import { observable, makeObservable } from "mobx";

import { Service } from "../service";

import {
  MediatorConfig,
  MediatorKind
} from "@llm-mediation-experiments/utils";

import { createMediator } from "../../shared/utils";

/** Manages LLM config for chat. */
export class MediatorConfigService extends Service {
  constructor() {
    super();
    makeObservable(this);
  }

  @observable mediators: MediatorConfig[] = [];

  reset() {
    this.mediators = [];
  }

  getMediator(id: string) {
    return this.mediators.find(mediator => mediator.id === id);
  }

  addMediator() {
    this.mediators.push(createMediator());
  }

  deleteMediator(mediatorId: string) {
    const mediatorIndex = this.mediators.findIndex(
      mediator => mediator.id === mediatorId
    );

    if (mediatorIndex !== -1) {
      this.mediators = [
        ...this.mediators.slice(0, mediatorIndex),
        ...this.mediators.slice(mediatorIndex + 1)
      ];
    }
  }

  updateMediator(mediatorId: string, newMediator: MediatorConfig) {
    const mediatorIndex = this.mediators.findIndex(
      mediator => mediator.id === mediatorId
    );

    if (mediatorIndex !== -1) {
      this.mediators[mediatorIndex] = newMediator;
    }
  }
}
