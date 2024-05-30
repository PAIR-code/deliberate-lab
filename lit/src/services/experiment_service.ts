import { computed, observable, makeObservable } from "mobx";
import { Service } from "./service";

import { EXPERIMENT_EXAMPLE_STAGES } from "../shared/constants";
import { ExperimentStage } from "../shared/types";
import { createBlankChatStage, createBlankInfoStage } from "../shared/utils";

interface ServiceProvider {}

/** Manages state for current experiment. */
export class ExperimentService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);

    // TODO: Load all/current experiments from Firebase
    // Temporary client-side only example
    this.setStages(EXPERIMENT_EXAMPLE_STAGES);
  }

  @observable stages: ExperimentStage[] = [];
  @observable id: string|null = null;
  @observable currentStage: ExperimentStage|undefined = undefined;

  setExperimentId(id: string|null) {
    this.id = id;
  }

  setStages(stages: ExperimentStage[]) {
    this.stages = stages;
  }

  setCurrentStage(id: string) {
    this.currentStage = this.stages.find(stage => stage.id === id);
  }

  updateCurrentStageName(name: string) {
    const index = this.stages.findIndex(
      stage => stage.id === this.currentStage?.id
    );

    const updatedStage = { ...this.currentStage, name };

    this.setStages([
      ...this.stages.slice(0, index),
      updatedStage,
      ...this.stages.slice(index + 1),
    ]);
  }

  updateCurrentStageContent(content: string) {
    const index = this.stages.findIndex(
      stage => stage.id === this.currentStage?.id
    );

    const updatedStage = { ...this.currentStage, content };

    this.setStages([
      ...this.stages.slice(0, index),
      updatedStage,
      ...this.stages.slice(index + 1),
    ]);
  }

  addStage(stage: ExperimentStage) {
    console.log(stage);
    this.stages.push(stage);
  }

  addChatStage() {
    this.addStage(createBlankChatStage());
  }

  addInfoStage() {
    this.addStage(createBlankInfoStage());
  }
}
