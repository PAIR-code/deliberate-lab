import {collection, getDocs} from 'firebase/firestore';
import {computed, makeObservable, observable, toJS} from 'mobx';

import {ExperimenterService} from '../experimenter_service';
import {FirebaseService} from '../firebase_service';
import {Pages, RouterService} from '../router_service';
import {Service} from '../service';

import {
  AttentionCheckConfig,
  ExperimentTemplate,
  ParticipantConfig,
  StageConfig,
  StageKind,
  randstr,
  validateStageConfigs,
} from '@llm-mediation-experiments/utils';
import {
  collectSnapshotWithId,
  convertExperimentStages,
  createInfoStage,
  createProfileStage,
  createTOSStage,
  generateId,
} from '../../shared/utils';

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

  // Participant config.
  @observable hasMaxNumParticipants = false;
  @observable numMaxParticipants?: number = undefined;
  @observable waitForAllToStart = false;

  // Experiment group parameters.
  @observable isGroup = false;
  @observable numExperiments = 1;

  // Attention check config.
  @observable hasAttentionCheck = false;
  @observable waitSeconds?: number = undefined;
  @observable popupSeconds?: number = undefined;
  @observable prolificAttentionFailRedirectCode?: string = '';

  // Lobby config.
  @observable isMultiPart = false;
  @observable dividerStageId = '';
  @observable lobbyWaitSeconds?: number = undefined;

  @observable stages: StageConfig[] = [createTOSStage(), createProfileStage()];
  @observable currentStageIndex = -1;

  // Prolific config.
  @observable isProlific = false;
  @observable prolificRedirectCode = '';


  // Loading (if writing experiment, template to Firebase)
  @observable isLoading = false;

  getAttentionCheckConfig(): AttentionCheckConfig | undefined {
    if (
      this.waitSeconds ||
      this.popupSeconds ||
      this.prolificAttentionFailRedirectCode
    ) {
      return {
        waitSeconds: this.waitSeconds,
        popupSeconds: this.popupSeconds,
        prolificAttentionFailRedirectCode:
          this.prolificAttentionFailRedirectCode || '',
      };
    }
    return undefined;
  }

  getParticipantConfig(): ParticipantConfig {
    return {
      numberOfMaxParticipants: this.numMaxParticipants ?? 0,
      waitForAllToStart: this.waitForAllToStart ?? 0,
    };
  }

  // Loads template as current config
  loadTemplate(templateId: string, template: Partial<ExperimentTemplate>) {
    const templateCollection = collection(
      this.sp.firebaseService.firestore,
      'templates',
      templateId,
      'stages'
    );

    getDocs(templateCollection).then((stagesDocs) => {
      // Set stages in order
      const stages = collectSnapshotWithId(stagesDocs, 'name') as StageConfig[];
      const stageIds = template.stageIds ?? [];
        this.stages = [];
      stageIds.forEach((id) => {
        const stage = stages.find((stage) => stage.id === id);
        if (stage) {
          this.stages.push(stage);
        }
      });

      this.name = ''; // Experimenters should explicitly choose a name
      this.publicName = template.publicName ?? 'Experiment';
      this.description = template.description ?? '';
      this.numParticipants = template.numberOfParticipants ?? 0;
      // Group
      this.isGroup = template.isGroup ?? false;
      this.numExperiments = template.numExperiments ?? 0;
      // Prolific redirect code
      this.isProlific = template.prolificRedirectCode ? true : false;
      this.prolificRedirectCode = template.prolificRedirectCode ?? '';
      // Attention Check config
      this.waitSeconds = template.attentionCheckConfig?.waitSeconds ?? 0;
      this.popupSeconds = template.attentionCheckConfig?.popupSeconds ?? 0;
      this.prolificAttentionFailRedirectCode = template.attentionCheckConfig?.prolificAttentionFailRedirectCode ?? '';
      // Participant config
      this.hasMaxNumParticipants = (template.participantConfig?.numberOfMaxParticipants ?? 0) > 0;
      this.numMaxParticipants = template.participantConfig?.numberOfMaxParticipants ?? 0;
      this.waitForAllToStart = template.participantConfig?.waitForAllToStart ?? false;
      // Lobby config
      this.isMultiPart = template.isMultiPart ?? false;
      this.dividerStageId = template.dividerStageId ?? '';
      this.lobbyWaitSeconds = template.lobbyWaitSeconds ?? 0;
    });
  }

  getMultiExperiments(groupId: string, numExperiments: number, stages: StageConfig[]) {
    const experiments = [];
    for (let i = 0; i < numExperiments; i++) {
      experiments.push({
        name: toJS(this.name + '_' + (i + 1)),
        publicName: toJS(this.publicName),
        description: toJS(this.description),
        group: groupId,
        stages: convertExperimentStages(toJS(stages)),
        numberOfParticipants: toJS(this.numParticipants),
        prolificRedirectCode: this.isProlific
          ? toJS(this.prolificRedirectCode)
          : '',
        attentionCheckConfig: this.getAttentionCheckConfig(),
        participantConfig: this.getParticipantConfig(),
        lobbyConfig: {isLobby: false, waitSeconds: 0},
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
          numberOfParticipants: toJS(this.numParticipants),
          prolificRedirectCode: this.isProlific
            ? toJS(this.prolificRedirectCode)
            : '',
          attentionCheckConfig: this.getAttentionCheckConfig() || {},
          lobbyConfig: {isLobby: false, waitSeconds: 0},
          participantConfig: this.getParticipantConfig(),
        },
      ];
    }

    const groupId = generateId(); // This must be unique to the group
    const dividerIndex: number = this.stages.findIndex(
      (stage) => stage.id === this.dividerStageId
    );

    if (!this.isMultiPart || dividerIndex == -1) {
      return this.getMultiExperiments(groupId, this.numExperiments, this.stages);
    } else {
      const preStages = this.stages.slice(0, dividerIndex + 1);
      const postStages = this.stages.slice(dividerIndex + 1);

      const experiments = [];
      // Create one lobby.
      experiments.push({
        name: toJS(this.name + '_lobby'),
        publicName: toJS(this.publicName),
        description: toJS(this.description),
        group: groupId,
        stages: convertExperimentStages(toJS(preStages)),
        numberOfParticipants: toJS(this.numParticipants),
        prolificRedirectCode: this.isProlific
          ? toJS(this.prolificRedirectCode)
          : '',
        attentionCheckConfig: this.getAttentionCheckConfig(),
        lobbyConfig: {
          isLobby: true,
          waitSeconds: this.lobbyWaitSeconds ?? 0,
        },
        participantConfig: {
          // No max number of participants in the lobby.
          waitForAllToStart: false,
          numberOfMaxParticipants: 0,
        },
      });

      // Create multiExperiments.
      experiments.push(
        ...this.getMultiExperiments(groupId, this.numExperiments, this.stages)
      );
      return experiments;
    }
  }

  // Converts and returns data required for experiment creation
  // (note that this adjusts some stage data, e.g., adds numbering to stages)
  getExperiment(experimentType = 'default') {
    if (this.isGroup) {
      return {
        name: toJS(this.name + '_' + randstr(6)),
        publicName: toJS(this.publicName),
        description: toJS(this.description),
        group: toJS(this.name),
        stages: convertExperimentStages(toJS(this.stages)),
        numberOfParticipants: toJS(this.numParticipants),
        lobbyConfig: {
          isLobby: false,
          waitSeconds: 0,
        },

        participantConfig: {
          numberOfMaxParticipants: this.numMaxParticipants ?? 0,
          waitForAllToStart: this.waitForAllToStart ?? 0,
        },
        prolificRedirectCode: this.isProlific
          ? toJS(this.prolificRedirectCode)
          : '',
        attentionCheckConfig: this.getAttentionCheckConfig(),
      };
    }
    return {
      name: toJS(this.name),
      publicName: toJS(this.publicName),
      description: toJS(this.description),
      group: toJS(''),
      stages: toJS(this.stages),
      numberOfParticipants: toJS(this.numParticipants),
      participantConfig: {
        numberOfMaxParticipants: this.numMaxParticipants ?? 0,
        waitForAllToStart: this.waitForAllToStart,
      },
      prolificRedirectCode: this.isProlific
        ? toJS(this.prolificRedirectCode)
        : '',
      attentionCheckConfig: this.getAttentionCheckConfig(),
      lobbyConfig: {
        isLobby: false,
        waitSeconds: 0,
      },
    };
  }

  getExperimentErrors() {
    const errors: string[] = validateStageConfigs(this.stages);

    if (this.isGroup) {
      if (this.name.length === 0) {
        errors.push('Experiment group name cannot be empty');
      }

      const alphanumRegex = /[^a-zA-Z0-9_-]/;
      if (alphanumRegex.test(this.name)) {
        errors.push(
          'Only alphanumeric characters, underscores (_), and hyphens (-) are allowed.'
        );
      }
    } else {
      if (this.name.length === 0) {
        errors.push('Internal experiment name cannot be empty');
      }
    }

    if (this.stages.length === 0) {
      errors.push('Experiment needs at least one stage');
    }

    if (this.isMultiPart) {
      const dividerIndex = this.stages.findIndex(
        (stage) => stage.id === this.dividerStageId
      );
      if (dividerIndex !== -1 && dividerIndex == this.stages.length - 1) {
        errors.push('Divider stage cannot be the last stage.');
      }
    }

    if (this.isProlific && !this.prolificRedirectCode) {
      errors.push('A prolific redirect code must be provided.');
    }
    if (this.hasMaxNumParticipants && !this.numMaxParticipants) {
      errors.push(
        'If limiting the number of participants, provide the maximum number of participants threshold.'
      );
    }

    if (this.hasAttentionCheck && !this.waitSeconds) {
      errors.push(
        'The amount of time before an attention check must be provided if attention checks are enabled.'
      );
    }
    if (
      (this.popupSeconds && !this.waitSeconds) ||
      (this.waitSeconds && !this.popupSeconds)
    ) {
      errors.push(
        'Both a wait time and a popup display time must be provided if attention checks are enabled.'
      );
    }

    return errors;
  }

  getStage(stageId: string) {
    return this.stages.find((stage) => stage.id === stageId);
  }

  setCurrentStageIndex(index: number) {
    this.currentStageIndex = index;
  }

  setCurrentStageIndexToLast() {
    this.currentStageIndex = this.stages.length - 1;
  }

  @computed get currentStage() {
    if (
      this.currentStageIndex < 0 ||
      this.currentStageIndex >= this.stages.length
    ) {
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
    this.numMaxParticipants = 0;
    this.waitForAllToStart = false;
  }

  updateHasMaxNumParticipants(checkbox: boolean) {
    this.hasMaxNumParticipants = checkbox;
  }

  updateIsProlific(checkbox: boolean) {
    this.isProlific = checkbox;
    if (!checkbox) {
      this.prolificRedirectCode = '';
      this.prolificAttentionFailRedirectCode = undefined;
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
        description: 'Wait to be redirected.',
      });
      this.dividerStageId = dividerStage.id;
      this.addStage(dividerStage);
    } else {
      const dividerIndex = this.stages.findIndex(
        (stage) => stage.id === this.dividerStageId
      );
      if (dividerIndex !== -1) {
        this.deleteStage(dividerIndex);
      }
    }
  }

  updateWaitSeconds(num: number) {
    this.waitSeconds = num;
  }

  updatePopupSeconds(num: number) {
    this.popupSeconds = num;
  }

  updateProlificFailCode(code: string) {
    this.prolificAttentionFailRedirectCode = code;
  }

  resetAttentionCheck() {
    this.hasAttentionCheck = false;
    this.waitSeconds = undefined;
    this.popupSeconds = undefined;
    this.prolificAttentionFailRedirectCode = undefined;
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

  updateStageDescription(
    description: string,
    stageIndex = this.currentStageIndex
  ) {
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
      ...this.stages.slice(index + 1),
    ];
  }

  hasStageKind(kind: StageKind) {
    return this.stages.findIndex((stage) => stage.kind === kind) !== -1;
  }

  moveStageUp(index: number) {
    this.stages = [
      ...this.stages.slice(0, index - 1),
      ...this.stages.slice(index, index + 1),
      ...this.stages.slice(index - 1, index),
      ...this.stages.slice(index + 1),
    ];
  }

  moveStageDown(index: number) {
    this.stages = [
      ...this.stages.slice(0, index),
      ...this.stages.slice(index + 1, index + 2),
      ...this.stages.slice(index, index + 1),
      ...this.stages.slice(index + 2),
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
    this.isLoading = true;

    await this.sp.experimenterService.createTemplate(
      {
        name: toJS(this.name),
        publicName: toJS(this.publicName),
        description: toJS(this.description),
        numberOfParticipants: toJS(this.numParticipants),
        participantConfig: {
          numberOfMaxParticipants: this.numMaxParticipants ?? 0,
          waitForAllToStart: this.waitForAllToStart,
        },
        prolificRedirectCode: this.isProlific
          ? toJS(this.prolificRedirectCode)
          : '',
        attentionCheckConfig: this.getAttentionCheckConfig(),
        isGroup: this.isGroup,
        numExperiments: this.numExperiments,
        isMultiPart: this.isMultiPart,
        dividerStageId: this.dividerStageId,
        lobbyWaitSeconds: this.lobbyWaitSeconds,
      },
      toJS(this.stages)
    );
    this.isLoading = false;
  }

  async createExperiments() {
    this.isLoading = true;
    const experiments = this.getExperiments();
    let experimentId = '';
    let groupId = '';

    for (let i = 0; i < experiments.length; i++) {
      const {
        name,
        publicName,
        description,
        stages,
        numberOfParticipants,
        group,
        prolificRedirectCode,
        attentionCheckConfig,
        lobbyConfig,
        participantConfig,
      } = experiments[i];
      const experiment = await this.sp.experimenterService.createExperiment(
        {
          name,
          publicName,
          description,
          numberOfParticipants,
          group,
          prolificRedirectCode,
          attentionCheckConfig,
          lobbyConfig,
          participantConfig,
        },
        stages
      );
      experimentId = experiment.id;
      groupId = group;
    }

    this.isLoading = false;

    // Navigate to the last created experiment (or group)
    if (groupId) {
      this.sp.routerService.navigate(Pages.EXPERIMENT_GROUP, {
        experiment_group: groupId,
      });
    } else {
      this.sp.routerService.navigate(Pages.EXPERIMENT, {
        experiment: experimentId,
      });
    }
  }
}
