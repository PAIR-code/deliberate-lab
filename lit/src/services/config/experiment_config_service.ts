import { collection, getDocs } from "firebase/firestore";
import { computed, makeObservable, observable, toJS } from "mobx";

import { FirebaseService } from "../firebase_service";
import { Service } from "../service";

import { StageConfig, StageKind } from "@llm-mediation-experiments/utils";
import {
  collectSnapshotWithId,
  convertExperimentStages,
  convertTemplateStages,
  createProfileStage,
  createTOSStage
} from "../../shared/utils";

interface ServiceProvider {
  firebaseService: FirebaseService;
}

/** Manages metadata for new experiment config. */
export class ExperimentConfigService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  @observable name = 'New experiment';
  @observable numParticipants = 3;
  @observable stages: StageConfig[] = [createTOSStage(), createProfileStage()];
  @observable currentStageIndex = -1;
  @observable map: Map<string, StageConfig> = new Map();

  // Loads template as current config
  loadTemplate(templateId: string, name = "New experiment") {
    const templateCollection = collection(
      this.sp.firebaseService.firestore,
      'templates',
      templateId,
      'stages'
    );

    getDocs(templateCollection).then(stagesDocs => {
      const stages = (collectSnapshotWithId(stagesDocs, 'name') as StageConfig[]);
      this.stages = convertTemplateStages(stages);
      this.name = name;
    });
  }

  // Converts and returns data required for experiment creation
  // (note that this adjusts some stage data, e.g., adds numbering to stages)
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

  updateStages(stages: StageConfig[]) {
    this.stages = stages;
  }

  updateStageName(name: string, stageIndex = this.currentStageIndex) {
    if (stageIndex >= 0 && stageIndex < this.stages.length) {
      this.stages[stageIndex].name = name;
    }
  }
  
  updateStageDescription(description: string, stageIndex = this.currentStageIndex) {
    if (stageIndex >= 0 && stageIndex < this.stages.length) {
      this.stages[stageIndex].description = description;
    }
  }

  addStage(stage: StageConfig) {
    this.stages.push(stage);
  }

  deleteStage(index: number) {
    this.stages = [
      ...this.stages.slice(0, index),
      ...this.stages.slice(index + 1)
    ];
  }

  hasStageKind(kind: StageKind) {
    return this.stages.findIndex(stage => stage.kind === kind) !== -1;
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
    this.numParticipants = 3;
    this.stages = [createTOSStage(), createProfileStage()];
    this.currentStageIndex = -1;
  }
}