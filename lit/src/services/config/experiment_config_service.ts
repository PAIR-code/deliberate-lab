import { collection, getDocs } from "firebase/firestore";
import { computed, makeObservable, observable, toJS } from "mobx";

import { ExperimenterService } from "../experimenter_service";
import { FirebaseService } from "../firebase_service";
import { Pages, RouterService } from "../router_service";
import { Service } from "../service";

import { ExperimentTemplate, randstr, StageConfig, StageKind, validateStageConfigs } from "@llm-mediation-experiments/utils";
import {
  collectSnapshotWithId,
  convertExperimentStages,
  createInfoStage,
  createProfileStage,
  createTOSStage
} from "../../shared/utils";

interface ServiceProvider {
  experimenterService: ExperimenterService;
  firebaseService: FirebaseService;
  routerService: RouterService;
}

/** Manages metadata for new experiment config. */
export class ExperimentConfigService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  @observable name = '';
  @observable publicName = 'Experiment';
  @observable description = '';
  @observable numParticipants = 0;

  @observable hasMaxNumParticipants = false;
  @observable numMaxParticipants?: number = undefined;
  @observable waitForAllToStart = false;

  // Experiment group parameters.
  @observable isGroup = false;
  @observable numExperiments = 1;

  @observable isMultiPart = false;
  @observable dividerStageId = "";

  @observable stages: StageConfig[] = [createTOSStage(), createProfileStage()];
  @observable currentStageIndex = -1;


  // Prolific config.
  @observable isProlific = false;
  @observable prolificRedirectCode = "";

  // Loads template as current config
  loadTemplate(templateId: string, template: Partial<ExperimentTemplate>) {
    const templateCollection = collection(
      this.sp.firebaseService.firestore,
      'templates',
      templateId,
      'stages'
    );

    getDocs(templateCollection).then(stagesDocs => {
      const stages = (collectSnapshotWithId(stagesDocs, 'name') as StageConfig[]);
      this.stages = stages;
      this.name = template.name ?? 'Untitled';
      this.publicName = template.publicName ?? 'Experiment';
      this.description = template.description ?? '';
    });
  }

  getMultiExperiments(numExperiments: number, stages: StageConfig[]) {
    const experiments = [];
    for (let i = 0; i < numExperiments; i++) {
      experiments.push({
        name: toJS(this.name + '_' + (i + 1)),
        publicName: toJS(this.publicName),
        description: toJS(this.description),
        group: toJS(this.name),
        stages: convertExperimentStages(toJS(stages)),
        isLobby: false,
        numberOfParticipants: toJS(this.numParticipants),
        numberOfMaxParticipants: toJS(this.getNumMaxParticipants()),
        waitForAllToStart: this.waitForAllToStart,
        prolificRedirectCode: this.isProlific ? toJS(this.prolificRedirectCode) : '',
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
          description: toJS(this.description),
          group: toJS(''),
          stages: toJS(this.stages),
          isLobby: false,
          numberOfParticipants: toJS(this.numParticipants),
          numberOfMaxParticipants: toJS(this.getNumMaxParticipants()),
          waitForAllToStart: this.waitForAllToStart,
          prolificRedirectCode: this.isProlific ? toJS(this.prolificRedirectCode) : '',
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
        name: toJS(this.name + '_lobby'),
        publicName: toJS(this.publicName),
        description: toJS(this.description),
        group: toJS(this.name),
        stages: convertExperimentStages(toJS(preStages)),
        isLobby: true,
        numberOfParticipants: toJS(this.numParticipants),
        // No limit of participants to lobby.
        numberOfMaxParticipants: toJS(0),
        waitForAllToStart: false,
        prolificRedirectCode: this.isProlific ? toJS(this.prolificRedirectCode) : '',
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
        name: toJS(this.name + '_' + randstr(6)),
        publicName: toJS(this.publicName),
        description: toJS(this.description),
        group: toJS(this.name),
        stages: convertExperimentStages(toJS(this.stages)),
        numberOfParticipants: toJS(this.numParticipants),
        waitForAllToStart: this.waitForAllToStart,
        prolificRedirectCode: this.isProlific ? toJS(this.prolificRedirectCode) : '',
      };
    }
    return {
      name: toJS(this.name),
      publicName: toJS(this.publicName),
      description: toJS(this.description),
      group: toJS(''),
      stages: toJS(this.stages),
      numberOfParticipants: toJS(this.numParticipants),
      waitForAllToStart: this.waitForAllToStart,
      prolificRedirectCode: this.isProlific ? toJS(this.prolificRedirectCode) : '',
    };
  }

  getExperimentErrors() {
    const errors: string[] = validateStageConfigs(this.stages);

    if (this.isGroup) {
      if (this.name.length === 0) {
        errors.push("Experiment group name cannot be empty");
      }

      const alphanumRegex = /[^a-zA-Z0-9_-]/;
      if (alphanumRegex.test(this.name)) {
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

    if (this.isMultiPart) {
      const dividerIndex = this.stages.findIndex(stage => stage.id === this.dividerStageId);
      if (dividerIndex !== -1 && dividerIndex == this.stages.length - 1) {
        errors.push("Divider stage cannot be the last stage.");
      }
    }

    if (this.hasMaxNumParticipants && !this.numMaxParticipants) {
      errors.push("If limiting the number of participants, provide the maximum number of participants threshold.");
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
  
  getNumMaxParticipants() {
    if (!this.hasMaxNumParticipants) {
      return 0;
    } else {
      return this.numMaxParticipants;
    }
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

  updateNumMaxParticipants(num: number) {
    this.numMaxParticipants = num;
  }

  resetHasMaxNumParticipants() {
    this.hasMaxNumParticipants = false;
    this.numMaxParticipants = undefined;
    this.waitForAllToStart = false;
  }

  updateHasMaxNumParticipants(checkbox: boolean) {
    this.hasMaxNumParticipants = checkbox;
  }

  updateIsProlific(checkbox: boolean) {
    this.isProlific = checkbox;
    if (!checkbox) {
      this.prolificRedirectCode = '';
    }
  }


  updateProlificRedirectCode(code: string) {
    this.prolificRedirectCode = code;
  }

  updateWaitForAllToStart(checkbox: boolean) {
    this.waitForAllToStart = checkbox;
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

  updateNumExperiments(num: number) {
    this.numExperiments = num;
  }

  updateDescription(description: string) {
    this.description = description;
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
    this.name = '';
    this.publicName = 'Experiment';
    this.description = '';
    this.numParticipants = 0;
    this.resetHasMaxNumParticipants();
    this.stages = [createTOSStage(), createProfileStage()];
    this.currentStageIndex = -1;
    this.isGroup = false;
    this.isMultiPart = false;
  }

  async createTemplate() {
    const { name, publicName, description, stages, numberOfParticipants } =
      this.getExperiment();

    await this.sp.experimenterService.createTemplate(
      {
        name,
        description,
        publicName,
      }, stages
    );
  }

  async createExperiments() {
    const experiments = this.getExperiments();
    let experimentId = '';
    let groupId = '';

    for (let i = 0; i < experiments.length; i++) {
      const { name, publicName, description, stages, isLobby, numberOfParticipants, numberOfMaxParticipants, group, waitForAllToStart, prolificRedirectCode } = experiments[i];
      const experiment = await this.sp.experimenterService.createExperiment(
        {
          name,
          publicName,
          description,
          isLobby,
          numberOfParticipants,
          numberOfMaxParticipants,
          waitForAllToStart,
          group,
          prolificRedirectCode,
        },
        stages
      );
      experimentId = experiment.id;
      groupId = group;
    }

    // Navigate to the last created experiment (or group)
    if (groupId) {
      this.sp.routerService.navigate(
        Pages.EXPERIMENT_GROUP,
        { "experiment_group": groupId }
      );
    } else {
      this.sp.routerService.navigate(
        Pages.EXPERIMENT,
        { "experiment": experimentId }
      );
    }
  }
}