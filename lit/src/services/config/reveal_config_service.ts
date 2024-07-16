import { computed, makeObservable, observable } from "mobx";

import { Service } from "../service";

import {
  RevealStageConfig
} from "@llm-mediation-experiments/utils";

/** Manages metadata for reveal stage config. */
export class RevealConfigService extends Service {
  constructor() {
    super();
    makeObservable(this);
  }

  @observable stage: RevealStageConfig|null = null;

  @computed get name() {
    return this.stage?.name;
  }

  @computed get description() {
    return this.stage?.description ?? '';
  }

  @computed get stagesToReveal() {
    return this.stage?.stagesToReveal ?? [];
  }

  updateName(name: string) {
    if (this.stage) {
      this.stage.name = name;
    }
  }

  updateDescription(description: string) {
    if (this.stage) {
      this.stage.description = description;
    }
  }

  addRevealStage(stageId: string) {
    if (this.stage?.stagesToReveal.indexOf(stageId) === -1) {
      this.stage!.stagesToReveal.push(stageId);
    }
  }

  moveRevealStageUp(index: number) {
    const revealStages = this.stage?.stagesToReveal;
    if (revealStages) {
      this.stage!.stagesToReveal = [
        ...revealStages.slice(0, index - 1),
        ...revealStages.slice(index, index + 1),
        ...revealStages.slice(index - 1, index),
        ...revealStages.slice(index + 1)
      ];
    }
  }

  moveRevealStageDown(index: number) {
    const revealStages = this.stage?.stagesToReveal;
    if (revealStages) {
      this.stage!.stagesToReveal = [
        ...revealStages.slice(0, index),
        ...revealStages.slice(index + 1, index + 2),
        ...revealStages.slice(index, index + 1),
        ...revealStages.slice(index + 2)
      ];
    }
  }

  deleteRevealStage(index: number) {
    const revealStages = this.stage?.stagesToReveal;
    if (revealStages) {
      this.stage!.stagesToReveal = [
        ...revealStages.slice(0, index),
        ...revealStages.slice(index + 1)
      ];
    }
  }

  reset() {
    this.stage = null;
  }
}