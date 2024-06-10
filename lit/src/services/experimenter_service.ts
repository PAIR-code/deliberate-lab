import { CacheMap, Experiment, ExperimentTemplate, ExperimentTemplateExtended, StageConfig, lookupTable } from "@llm-mediation-experiments/utils";
import { Unsubscribe, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot } from "firebase/firestore";
import { computed, makeObservable, observable } from "mobx";
import { createExperimentCallable, deleteExperimentCallable } from "../shared/callables";
import { collectSnapshotWithId } from "../shared/utils";

import { Service } from "./service";
import { FirebaseService } from "./firebase_service";
import { RouterService } from "./router_service";

interface ServiceProvider {
  firebaseService: FirebaseService;
  routerService: RouterService;
}

/** Handle experimenter-related data:
 * - List experiments
 * - List templates
 * - List experiment users
 * - Create experiments and templates
 */
export class ExperimenterService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  @observable experiments: Experiment[] = [];
  @observable templates: ExperimentTemplate[] = [];
  @observable templatesWithConfigs = new CacheMap((templateId: string) =>
    this.loadExperimentTemplate(templateId),
  );

  // Loading
  @observable unsubscribe: Unsubscribe[] = [];
  @observable areExperimentsLoading = true;
  @observable areTemplatesLoading = true;

  @computed get isLoading() {
    return this.areExperimentsLoading || this.areTemplatesLoading;
  }

  subscribe() {
    // Subscribe to all experiment documents
    this.unsubscribe.push(
      onSnapshot(collection(this.sp.firebaseService.firestore, 'experiments'), (snapshot) => {
        this.experiments = collectSnapshotWithId<Experiment>(snapshot, 'id');
        this.areExperimentsLoading = false;
      }),
    );

    // Subscribe to all experiment template documents
    this.unsubscribe.push(
      onSnapshot(collection(this.sp.firebaseService.firestore, 'templates'), (snapshot) => {
        this.templates = collectSnapshotWithId<ExperimentTemplate>(snapshot, 'id');
        this.areTemplatesLoading = false;
      }),
    );
  }

  unsubscribeAll() {
    this.unsubscribe.forEach(unsubscribe => unsubscribe());
    this.unsubscribe = [];

    // Reset observables
    this.experiments = [];
    this.templates = [];
    this.templatesWithConfigs = new CacheMap((templateId: string) =>
      this.loadExperimentTemplate(templateId)
    );
  }

  private loadExperimentTemplate (
    templateId: string,
   ) {
  const template: {
      value: ExperimentTemplateExtended | undefined
    } = { value: undefined };

  const templateDoc = getDoc(doc(this.sp.firebaseService.firestore, 'templates', templateId)); // The template metadata
  const stagesDocs = getDocs(collection(this.sp.firebaseService.firestore, 'templates', templateId, 'stages')); // The actual config for every stage

  Promise.all([templateDoc, stagesDocs]).then(([templateDoc, stagesDocs]) => {
    template.value = ({
      id: templateId,
      name: templateDoc.data()!['name'],
      stageMap: lookupTable(collectSnapshotWithId(stagesDocs, 'name'), 'name'),
    });
  });

  return template;
  }

  getExperiment(experimentId: string) {
    return this.experiments.find((exp) => exp.id === experimentId);
  }

  // ******************************************************************************************* //
  //                                          MUTATIONS                                          //
  // ******************************************************************************************* //

  /** Delete a template.
   * @rights Experimenter
   */
  async deleteTemplate(templateId: string) {
    return deleteDoc(doc(this.sp.firebaseService.firestore, 'templates', templateId));
  }

  /** Create an experiment.
   * @rights Experimenter
   */
  async createExperiment(name: string, stages: StageConfig[], numberOfParticipants?: number) {
    return createExperimentCallable(
      this.sp.firebaseService.functions,
      {
      type: 'experiments',
      metadata: { name, numberOfParticipants },
      stages,
    });
  }

  /** Create an experiment template.
   * @rights Experimenter
   */
  async createTemplate(name: string, stages: StageConfig[]) {
    return createExperimentCallable(
      this.sp.firebaseService.functions,
      {
      type: 'templates',
      metadata: { name },
      stages,
    });
  }

  /** Delete an experiment.
   * @rights Experimenter
   */
  async deleteExperiment(experimentId: string) {    
    // If experiment stages shown in sidenav, update sidenav view
    if (this.sp.routerService.sidenavExperimentId === experimentId) {
      this.sp.routerService.setSidenavExperiment(null);
    }

    return deleteExperimentCallable(this.sp.firebaseService.functions, {
      id: experimentId,
      type: 'experiments',
    })
  }
}
