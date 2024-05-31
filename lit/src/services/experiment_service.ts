import { computed, observable, makeObservable } from "mobx";

import {
  collection,
  doc,
  onSnapshot,
} from 'firebase/firestore';

import { Service } from "./service";
import { FirebaseService } from "./firebase_service";

import { EXPERIMENT_EXAMPLE_STAGES } from "../shared/constants";
import { ExperimentStage, Snapshot, StageConfig } from "../shared/types";
import { createBlankChatStage, createBlankInfoStage } from "../shared/utils";

interface ServiceProvider {
  firebaseService: FirebaseService;
}

/** Manages state for current experiment. */
export class ExperimentService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  // TODO: Delete stages
  @observable stages: ExperimentStage[] = [];
  // TODO: Delete current stage
  @observable currentStage: ExperimentStage|undefined = undefined;

  @observable id: string|null = null;
  @observable stageConfigMap: Record<string, StageConfig> = {};
  @observable stageNames: string[] = [];
  @observable isLoading = false;

  setExperimentId(id: string|null) {
    this.id = id;
    this.isLoading = true;
    this.loadStageData();
  }

  loadStageData() {
    // Fetch the experiment config (no subscription needed)
    const unsubscribe = onSnapshot(
      collection(
        this.sp.firebaseService.firestore, 'experiments', this.id, 'stages'
    ), (snapshot) => {
      let changedDocs = snapshot.docChanges().map((change) => change.doc);
      if (changedDocs.length === 0) {
        changedDocs = snapshot.docs;
      }

      changedDocs.forEach((doc) => {
        const data = doc.data() as StageConfig;
        this.stageConfigMap[doc.id] = data;
      });

      // Load the stage names
      this.stageNames = Object.keys(this.stageConfigMap);
      this.isLoading = false;
    });
  }

  getStage(stageName: string) {
    return this.stageConfigMap[stageName];
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
    ] as ExperimentStage[]);
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
    ] as ExperimentStage[]);
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
