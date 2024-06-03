import { computed, get, observable, makeObservable, toJS } from "mobx";

import { Service } from "../service";
import { FirebaseService } from "../firebase_service";

import { StageConfig, StageKind } from "@llm-mediation-experiments/utils";
import { convertExperimentStages, createTOSStage } from "../../shared/utils";

/** Manages metadata for new experiment config. */
export class ExperimentConfigService extends Service {
  constructor() {
    super();
    makeObservable(this);
  }

  @observable name = 'New experiment';
  @observable numParticipants = 1;
  @observable stages: StageConfig[] = [createTOSStage()];
  @observable currentStageIndex = -1;

  getExperiment() {
    return {
      name: toJS(this.name),
      stages: convertExperimentStages(toJS(this.stages)),
      numberOfParticipants: toJS(this.numParticipants),
    };
  }

  getExperimentErrors() {
    // TODO: Check more comprehensively (i.e., all stage fields must be filled)
    const errors: string[] = [];

    if (this.name.length === 0) {
      errors.push("Experiment name cannot be empty");
    }
    if (this.stages.length === 0) {
      errors.push("Experiment needs at least one stage");
    }
    if (this.numParticipants <= 0) {
      errors.push("Experiments needs more than 0 participants");
    }

    return errors;
  }

  setCurrentStageIndex(index: number) {
    this.currentStageIndex = index;
  }

  setCurrentStageIndexToLast() {
    this.currentStageIndex = this.stages.length - 1;
  }

  @computed get currentStage() {
    if (this.currentStageIndex < 0 ||
        this.currentStageIndex >= this.stages.length) {
      return null;
    }
    return this.stages[this.currentStageIndex];
  }

  // Update experiment name
  updateName(name: string) {
    this.name = name;
  }

  updateNumParticipants(num: number) {
    this.numParticipants = num;
  }

  updateStageName(name: string, stageIndex = this.currentStageIndex) {
    if (stageIndex >= 0 && stageIndex < this.stages.length) {
      this.stages[stageIndex].name = name;
    }
  }

  deleteStage(index: number) {
    this.stages = [
      ...this.stages.slice(0, index),
      ...this.stages.slice(index + 1)
    ];
  }

  moveStageUp(index: number) {
    this.stages = [
      ...this.stages.slice(0, index - 1),
      ...this.stages.slice(index, index + 1),
      ...this.stages.slice(index - 1, index),
      ...this.stages.slice(index + 1)
    ];
  }

  moveStageDown(index: number) {
    this.stages = [
      ...this.stages.slice(0, index),
      ...this.stages.slice(index + 1, index + 2),
      ...this.stages.slice(index, index + 1),
      ...this.stages.slice(index + 2)
    ];
  }

  reset() {
    this.name = 'New experiment';
    this.numParticipants = 1;
    this.stages = [createTOSStage()];
    this.currentStageIndex = -1;
  }

  addStage(stage: StageConfig) {
    this.stages.push(stage);
  }
}