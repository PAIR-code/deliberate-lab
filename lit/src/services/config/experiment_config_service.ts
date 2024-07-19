import { collection, getDocs } from "firebase/firestore";
import { computed, makeObservable, observable, toJS } from "mobx";

import { FirebaseService } from "../firebase_service";
import { Service } from "../service";

import { randstr, StageConfig, StageKind, validateStageConfigs } from "@llm-mediation-experiments/utils";
import {
  collectSnapshotWithId,
  convertExperimentStages,
  createInfoStage,
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

  @observable name = 'Untitled experiment';
  @observable publicName = 'Experiment';
  @observable numParticipants = 3;

  // Experiment group parameters.
  @observable isGroup = false;
  @observable group = "";
  @observable numExperiments = 1;

  @observable isMultiPart = false;
  private dividerStageId = "";

  @observable stages: StageConfig[] = [createTOSStage(), createProfileStage()];
  @observable currentStageIndex = -1;

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
      this.stages = stages;
      this.name = name;
    });
  }

  getMultiExperiments(numExperiments: number, stages: StageConfig[]) {
    const experiments = [];
    for (let i = 0; i < numExperiments; i++) {
      experiments.push({
        name: toJS(this.group + '_' + randstr(6)),
        publicName: toJS(this.publicName),
        group: toJS(this.group),
        stages: convertExperimentStages(toJS(stages)),
        numberOfParticipants: toJS(this.numParticipants),
      });
    }
    return experiments;
  }

  getExperiments() {
    // Single experiment.
    if (!this.isGroup) {
      return [
        {
          name: toJS(this.name),
          publicName: toJS(this.publicName),
          group: toJS(''),
          stages: toJS(this.stages),
          numberOfParticipants: toJS(this.numParticipants),
        }
      ];
    }

    const dividerIndex: number = this.stages.findIndex(stage => stage.id === this.dividerStageId);
    if (!this.isMultiPart || dividerIndex == -1) {
      return this.getMultiExperiments(this.numExperiments, this.stages);
    } else {
      const preStages = this.stages.slice(0, dividerIndex + 1);
      const postStages = this.stages.slice(dividerIndex + 1);

      const experiments = [];
      // Create one lobby.
      experiments.push({
        name: toJS(this.group + '_lobby'),
        publicName: toJS(this.publicName),
        group: toJS(this.group),
        stages: convertExperimentStages(toJS(preStages)),
        numberOfParticipants: toJS(this.numParticipants),
      });

      // Create multiExperiments.
      experiments.push(...this.getMultiExperiments(this.numExperiments, postStages));
      return experiments;
    }

  }



  // Converts and returns data required for experiment creation
  // (note that this adjusts some stage data, e.g., adds numbering to stages)
  getExperiment(experimentType = "default") {

    if (this.isGroup) {
      return {
        name: toJS(this.group + '_' + randstr(6)),
        publicName: toJS(this.publicName),
        group: toJS(this.group),
        stages: convertExperimentStages(toJS(this.stages)),
        numberOfParticipants: toJS(this.numParticipants),
      };
    }
    return {
      name: toJS(this.name),
      publicName: toJS(this.publicName),
      group: toJS(''),
      stages: toJS(this.stages),
      numberOfParticipants: toJS(this.numParticipants),
    };
  }

  getExperimentErrors() {
    const errors: string[] = validateStageConfigs(this.stages);

    if (this.isGroup) {
      if (this.group.length === 0) {
        errors.push("Experiment group name cannot be empty");
      }

      const alphanumRegex = /[^a-zA-Z0-9_-]/;
      if (alphanumRegex.test(this.group)) {
        errors.push("Only alphanumeric characters, underscores (_), and hyphens (-) are allowed.");
      }
    } else {
      if (this.name.length === 0) {
        errors.push("Experiment name cannot be empty");
      }
    }

    if (this.stages.length === 0) {
      errors.push("Experiment needs at least one stage");
    }

    if (this.numParticipants <= 0) {
      errors.push("Experiments needs more than 0 participants");
    }

    if (this.isMultiPart) {
      const dividerIndex = this.stages.findIndex(stage => stage.id === this.dividerStageId);
      if (dividerIndex !== -1 && dividerIndex == this.stages.length - 1) {
        errors.push("Divider stage cannot be the last stage.");
      }
    }
    return errors;
  }

  getStage(stageId: string) {
    return this.stages.find(stage => stage.id === stageId);
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

  // Update private experiment name
  updateName(name: string) {
    this.name = name;
  }

  // Update public experiment name
  updatePublicName(name: string) {
    this.publicName = name;
  }

  updateNumParticipants(num: number) {
    this.numParticipants = num;
  }

  updateIsExperimentGroup(checkbox: boolean) {
    this.isGroup = checkbox;
  }

  updateIsMultiPart(checkbox: boolean) {
    this.isMultiPart = checkbox;
    if (checkbox) {
      const dividerStage = createInfoStage({
        name: 'Lobby',
        description: 'Wait to be redirected.'
      });
      this.dividerStageId = dividerStage.id;
      this.addStage(dividerStage);
    } else {
      const dividerIndex = this.stages.findIndex(stage => stage.id === this.dividerStageId);
      if (dividerIndex !== -1) {
        this.deleteStage(dividerIndex);
      }
    }
  }


  updateGroupName(name: string) {
    this.group = name;
  }

  updateNumExperiments(num: number) {
    this.numExperiments = num;
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

  updateStagePopupText(popupText: string, stageIndex = this.currentStageIndex) {
    if (stageIndex >= 0 && stageIndex < this.stages.length) {
      this.stages[stageIndex].popupText = popupText;
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
    this.name = 'Untitled experiment';
    this.publicName = 'Experiment';
    this.numParticipants = 3;
    this.stages = [createTOSStage(), createProfileStage()];
    this.currentStageIndex = -1;
    this.isGroup = false;
    this.isMultiPart = false;
    this.group = '';
  }
}