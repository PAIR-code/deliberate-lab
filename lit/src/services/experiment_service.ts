import { computed, observable, makeObservable } from "mobx";

import {
  collection,
  doc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';

import { Service } from "./service";
import { FirebaseService } from "./firebase_service";
import { RouterService } from "./router_service";

import { Snapshot } from "../shared/types";
import {
  Experiment,
  ParticipantProfileExtended,
  PublicStageData,
  StageConfig
} from "@llm-mediation-experiments/utils";
import { collectSnapshotWithId } from "../shared/utils";
import { deleteExperimentCallable } from "../shared/callables";

interface ServiceProvider {
  firebaseService: FirebaseService;
  routerService: RouterService;
}

/** Manages state for current experiment. */
export class ExperimentService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  @observable id: string | null = null;
  @observable experiment: Experiment | undefined = undefined;

  @observable stageConfigMap: Record<string, StageConfig> = {};
  @observable publicStageDataMap: Record<string, PublicStageData | undefined> = {};
  @observable stageNames: string[] = [];
  @observable participants: ParticipantProfileExtended[] = [];
  
  // Loading
  @observable unsubscribe: Unsubscribe[] = [];
  @observable isConfigLoading = false;
  @observable isPublicStageDataLoading = false;
  @observable isMetadataLoading = false;
  
  @computed get isLoading() {
    return this.isConfigLoading || this.isPublicStageDataLoading || this.isMetadataLoading;
  }
  set isLoading(value: boolean) {
    this.isConfigLoading = value;
    this.isPublicStageDataLoading = value;
    this.isMetadataLoading = value;
  }

  setExperimentId(id: string | null) {
    this.id = id;
    this.isLoading = true;
    this.loadStageData();
  }

  updateForCurrentRoute() {
    const id = this.sp.routerService.activeRoute.params["experiment"];
    if (id !== this.id) {
      this.setExperimentId(id);
    }
  }

  loadStageData() {
    this.unsubscribeAll();

    if (this.id === null) {
      this.isLoading = false;
      return;
    }
    
    // Subscribe to the experiment
    this.unsubscribe.push(
      onSnapshot(doc(this.sp.firebaseService.firestore, 'experiments', this.id), (doc) => {
        this.experiment = { id: doc.id, ...doc.data() } as Experiment;
        this.isMetadataLoading = false;
      }),
    );

    // Subscribe to the public stage data
    this.unsubscribe.push(
      onSnapshot(collection(this.sp.firebaseService.firestore, 'experiments', this.id, 'publicStageData'), (snapshot) => {
        let changedDocs = snapshot.docChanges().map((change) => change.doc);
        if (changedDocs.length === 0) changedDocs = snapshot.docs;

        // Update the public stage data signals
        changedDocs.forEach((doc) => {
          this.publicStageDataMap[doc.id] = doc.data() as PublicStageData;
        });

        this.isPublicStageDataLoading = false;
      }),
    );

    // Fetch the experiment config
    this.unsubscribe.push(onSnapshot(
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
      this.isConfigLoading = false;

      // Load participants
      this.loadExperimentParticipants();
    }));
  }

  private loadExperimentParticipants() {
    if (this.id !== null) {
      // Bind the array to the firestore collection
      this.unsubscribe.push(
        onSnapshot(collection(this.sp.firebaseService.firestore, 'experiments', this.id, 'participants'), (snapshot) => {
          // Replace the values in the array in place to not break the reference
          this.participants.splice(0, this.participants.length, ...collectSnapshotWithId<ParticipantProfileExtended>(snapshot, 'privateId'))
        }),
      );
    }
  }

  unsubscribeAll() {
    this.unsubscribe.forEach(unsubscribe => unsubscribe());
    this.unsubscribe = [];

    // Reset stage configs
    this.stageConfigMap = {};
    this.stageNames = [];
  }

  getStage(stageName: string) {
    return this.stageConfigMap[stageName];
  }

  /** Build a signal that tracks whether every participant has at least reached the given stage */
  everyoneReachedStage(targetStage: string): boolean {
    const participants = this.experiment?.participants;
    const stages = this.stageNames;
    const targetIndex = stages.indexOf(targetStage);

    if (!participants || targetIndex === -1) return false;

    return Object.values(participants).every(
      (participant) => stages.indexOf(participant.workingOnStageName) >= targetIndex,
    );
  }

  // ******************************************************************************************* //
  //                                           MUTATIONS                                         //
  // ******************************************************************************************* //

  /** Delete the experiment..
   * @rights Experimenter
   */
  async delete() {
    return deleteExperimentCallable(this.sp.firebaseService.functions, { type: 'experiments', id: this.id! });
  }
}
