import { computed, get, observable, makeObservable, toJS } from "mobx";

import { Service } from "../service";
import { FirebaseService } from "../firebase_service";

import { StageConfig, StageKind } from "../../shared/types";
import { convertExperimentStages } from "../../shared/utils";

/** Manages metadata for new experiment config. */
export class ExperimentConfigService extends Service {
  constructor() {
    super();
    makeObservable(this);
  }

  @observable name = 'New experiment';
  @observable numParticipants = 1;
  @observable stages: StageConfig[] = [];
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

  reset() {
    this.name = 'New experiment';
    this.numParticipants = 1;
    this.stages = [];
    this.currentStageIndex = -1;
  }

  addInfoConfig(name = "Untitled stage", info = "Placeholder info") {
    const infoLines = [info];
    this.stages.push({ kind: StageKind.Info, name, infoLines });
  }
}