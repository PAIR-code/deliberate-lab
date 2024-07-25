import { Experiment, ExperimentTemplate, ExperimentTemplateExtended, ParticipantProfile, ParticipantProfileExtended, StageConfig, lookupTable } from "@llm-mediation-experiments/utils";
import { Unsubscribe, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot } from "firebase/firestore";
import { computed, makeObservable, observable } from "mobx";
import { createExperimentCallable, createParticipantCallable, deleteExperimentCallable, deleteParticipantCallable } from "../shared/callables";
import { collectSnapshotWithId } from "../shared/utils";

import { FirebaseService } from "./firebase_service";
import { RouterService } from "./router_service";
import { Service } from "./service";

interface ServiceProvider {
  firebaseService: FirebaseService;
  routerService: RouterService;
}

interface CreateParticipantResponse {
  success: boolean;
  participant: ParticipantProfileExtended
}

/** Handle experimenter-related actions:
 * - List experiments
 * - List templates
 * - List experiment users
 * - Create experiments and templates
 * - Create, delete, and transfer participants
 */
export class ExperimenterService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  @observable experiments: Experiment[] = [];
  @observable templates: ExperimentTemplate[] = [];
  /* @observable templatesWithConfigs = new CacheMap((templateId: string) =>
    this.loadExperimentTemplate(templateId),
  ); */

  // Loading
  @observable unsubscribe: Unsubscribe[] = [];
  @observable areExperimentsLoading = true;
  @observable areTemplatesLoading = true;

  @computed get isLoading() {
    return this.areExperimentsLoading || this.areTemplatesLoading;
  }

  getUngroupedExperiments() {
    return this.experiments.filter(experiment => !experiment.group);
  }

  getGroupedExperiments() {
    return this.experiments.filter(experiment => experiment.group);
  }

  getExperimentsInGroup(group: string) {
    if (group == '') return [];

    return this.experiments.filter(experiment => experiment.group === group);
  }

  getGroupedExperimentsMap() {
    const groupMap = new Map<string, Experiment[]>();

    this.getGroupedExperiments().forEach(experiment => {
      const group = experiment.group!;
      if (!groupMap.has(group)) {
        groupMap.set(group, []);
      }
      groupMap.get(group)!.push(experiment);
    });

    return groupMap;
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
    /* this.templatesWithConfigs = new CacheMap((templateId: string) =>
      this.loadExperimentTemplate(templateId)
    ); */
  }

  private loadExperimentTemplate(
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
        publicName: templateDoc.data()!['publicName'],
        description: templateDoc.data()!['description'],
        author: templateDoc.data()!['author'],
        tags: templateDoc.data()!['tags'],
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
  async createExperiment(experiment: Partial<Experiment>, stages: StageConfig[]) {
    const name = experiment.name ?? '';
    const publicName = experiment.publicName ?? 'Experiment';
    const description = experiment.description ?? '';
    const tags = experiment.tags ?? [];
    const group = experiment.group ?? '';
    const numberOfParticipants = experiment.numberOfParticipants ?? 1;

    return createExperimentCallable(
      this.sp.firebaseService.functions,
      {
        type: 'experiments',
        metadata: { name, publicName, description, tags, group, numberOfParticipants },
        stages,
      }
    );
  }

  /** Create an experiment template.
   * @rights Experimenter
   */
  async createTemplate(experiment: Partial<Experiment>, stages: StageConfig[]) {
    const name = experiment.name ?? '';
    const publicName = experiment.publicName ?? 'Experiment';
    const description = experiment.description ?? '';
    const tags = experiment.tags ?? [];
    const group = experiment.group ?? '';
    const numberOfParticipants = experiment.numberOfParticipants ?? 1;

    return createExperimentCallable(
      this.sp.firebaseService.functions,
      {
        type: 'templates',
        metadata: { name, publicName, description, tags, group, numberOfParticipants },
        stages,
      }
    );
  }

  /** Adds a participant.
   */
  async createParticipant(experimentId: string, participantData: ParticipantProfile | null = null): Promise<CreateParticipantResponse> {
    return createParticipantCallable(this.sp.firebaseService.functions, {
      experimentId: experimentId,
      participantData: participantData,
    });
  }

  /** Deletes a participant. */
  async deleteParticipant(experimentId: string, participantId: string) {
    return deleteParticipantCallable(this.sp.firebaseService.functions, {
      experimentId: experimentId,
      participantId: participantId,
    });
  }

  /** Transfers a participant. */
  async transferParticipant(
    currentExperimentId: string,
    newExperimentId: string,
    participant: ParticipantProfileExtended
  ) {
    try {
      await this.createParticipant(newExperimentId, participant);
      await this.deleteParticipant(currentExperimentId, participant.privateId);
    } catch (error) {
      console.error('Error transferring participant: ', error);
      throw error;
    }
  }

  /** Delete an experiment.
   * @rights Experimenter
   */
  async deleteExperiment(experimentId: string) {
    return deleteExperimentCallable(this.sp.firebaseService.functions, {
      id: experimentId,
      type: 'experiments',
    });
  }
}
