import {
  Experiment,
  ExperimentTemplate,
  ExperimentTemplateExtended,
  LobbyConfig,
  ParticipantConfig,
  ParticipantProfile,
  ParticipantProfileExtended,
  StageConfig,
  lookupTable,
} from '@llm-mediation-experiments/utils';
import {
  Unsubscribe,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import {computed, makeObservable, observable} from 'mobx';
import {
  createExperimentCallable,
  createParticipantCallable,
  deleteExperimentCallable,
  deleteParticipantCallable,
} from '../shared/callables';
import {collectSnapshotWithId} from '../shared/utils';

import {FirebaseService} from './firebase_service';
import {ParticipantService} from './participant_service';
import {RouterService} from './router_service';
import {Service} from './service';

interface ServiceProvider {
  firebaseService: FirebaseService;
  participantService: ParticipantService;
  routerService: RouterService;
}

interface CreateParticipantResponse {
  success: boolean;
  participant: ParticipantProfileExtended;
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
    // Sort by experiment creation time.
    return this.experiments
      .filter((experiment) => !experiment.group)
      .sort((a, b) => a.date.toDate().getTime() - b.date.toDate().getTime());
  }

  getGroupedExperiments() {
    return this.experiments.filter((experiment) => experiment.group);
  }

  getExperimentsInGroup(group: string) {
    if (group == '') return [];

    return this.experiments
      .filter((experiment) => experiment.group === group)
      .sort((a, b) => {
        // Prioritized lobbies.
        if (a.lobbyConfig.isLobby && !b.lobbyConfig.isLobby) return -1;
        if (!a.lobbyConfig.isLobby && b.lobbyConfig.isLobby) return 1;
        // Sort by name.
        return a.name.localeCompare(b.name);
      });
  }

  getGroupedExperimentsMap() {
    const groupMap = new Map<string, Experiment[]>();

    this.getGroupedExperiments().forEach((experiment) => {
      const group = experiment.group!;
      if (!groupMap.has(group)) {
        groupMap.set(group, []);
      }
      groupMap.get(group)!.push(experiment);
    });

    // Sort by ascending time.
    const sortedGroupMap = new Map(
      Array.from(groupMap.entries()).sort((a, b) => {
        const dateA = a[1][0].date.toDate().getTime();
        const dateB = b[1][0].date.toDate().getTime();
        return dateA - dateB;
      })
    );

    return sortedGroupMap;
  }

  subscribe() {
    // Subscribe to all experiment documents
    this.unsubscribe.push(
      onSnapshot(
        collection(this.sp.firebaseService.firestore, 'experiments'),
        (snapshot) => {
          this.experiments = collectSnapshotWithId<Experiment>(snapshot, 'id');
          this.areExperimentsLoading = false;
        }
      )
    );

    // Subscribe to all experiment template documents
    this.unsubscribe.push(
      onSnapshot(
        collection(this.sp.firebaseService.firestore, 'templates'),
        (snapshot) => {
          this.templates = collectSnapshotWithId<ExperimentTemplate>(
            snapshot,
            'id'
          );
          this.areTemplatesLoading = false;
        }
      )
    );
  }

  unsubscribeAll() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.unsubscribe = [];

    // Reset observables
    this.experiments = [];
    this.templates = [];
    /* this.templatesWithConfigs = new CacheMap((templateId: string) =>
      this.loadExperimentTemplate(templateId)
    ); */
  }

  private loadExperimentTemplate(templateId: string) {
    const template: {
      value: ExperimentTemplateExtended | undefined;
    } = {value: undefined};

    const templateDoc = getDoc(
      doc(this.sp.firebaseService.firestore, 'templates', templateId)
    ); // The template metadata
    const stagesDocs = getDocs(
      collection(
        this.sp.firebaseService.firestore,
        'templates',
        templateId,
        'stages'
      )
    ); // The actual config for every stage

    Promise.all([templateDoc, stagesDocs]).then(([templateDoc, stagesDocs]) => {
      template.value = {
        id: templateId,
        name: templateDoc.data()!['name'],
        publicName: templateDoc.data()!['publicName'],
        description: templateDoc.data()!['description'],
        author: templateDoc.data()!['author'],
        tags: templateDoc.data()!['tags'],
        starred: templateDoc.data()!['starred'],
        numberOfParticipants: templateDoc.data()!['numberOfParticipants'],
        participantConfig: templateDoc.data()!['participantConfig'],
        isGroup: templateDoc.data()!['isGroup'],
        numExperiments: templateDoc.data()!['numExperiments'],
        isMultiPart: templateDoc.data()!['isMultiPart'],
        dividerStageId: templateDoc.data()!['dividerStageId'],
        lobbyWaitSeconds: templateDoc.data()!['lobbyWaitSeconds'],
        prolificRedirectCode: templateDoc.data()!['prolificRedirectCode'],
        attentionCheckConfig: templateDoc.data()!['attentionCheckConfig'],
        stageIds: templateDoc.data()!['stageIds'],
        stageMap: lookupTable(
          collectSnapshotWithId(stagesDocs, 'name'),
          'name'
        ),
      };
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
    return deleteDoc(
      doc(this.sp.firebaseService.firestore, 'templates', templateId)
    );
  }

  private getDefaultLobbyConfig(): LobbyConfig {
    return {
      isLobby: false,
    };
  }

  private getDefaultParticipantConfig(): ParticipantConfig {
    return {
      waitForAllToStart: false,
      numberOfMaxParticipants: 0,
    };
  }

  /** Create an experiment.
   * @rights Experimenter
   */
  async createExperiment(
    experiment: Partial<Experiment>,
    stages: StageConfig[]
  ) {
    const name = experiment.name ?? '';
    const publicName = experiment.publicName ?? 'Experiment';
    const description = experiment.description ?? '';
    const tags = experiment.tags ?? [];
    const group = experiment.group ?? '';
    const numberOfParticipants = experiment.numberOfParticipants ?? 0;
    const prolificRedirectCode = experiment.prolificRedirectCode ?? '';
    const attentionCheckConfig = experiment.attentionCheckConfig ?? {};
    const lobbyConfig = experiment.lobbyConfig ?? this.getDefaultLobbyConfig();
    const participantConfig =
      experiment.participantConfig ?? this.getDefaultParticipantConfig();

    return createExperimentCallable(this.sp.firebaseService.functions, {
      type: 'experiments',
      metadata: {
        name,
        publicName,
        description,
        tags,
        group,
        numberOfParticipants,
        prolificRedirectCode,
        attentionCheckConfig,
        lobbyConfig,
        participantConfig,
      },
      stages,
    });
  }

  /** Create an experiment template.
   * @rights Experimenter
   */
  async createTemplate(experiment: Partial<ExperimentTemplate>, stages: StageConfig[]) {
    const name = experiment.name ?? '';
    const publicName = experiment.publicName ?? 'Experiment';
    const description = experiment.description ?? '';
    const tags = experiment.tags ?? [];
    const numberOfParticipants = experiment.numberOfParticipants ?? 0;
    const prolificRedirectCode = experiment.prolificRedirectCode ?? '';
    const attentionCheckConfig = experiment.attentionCheckConfig ?? {};
    const isGroup = experiment.isGroup ?? false;
    const numExperiments = experiment.numExperiments ?? 0;
    const isMultiPart = experiment.isMultiPart ?? false;
    const dividerStageId = experiment.dividerStageId ?? '';
    const lobbyWaitSeconds = experiment.lobbyWaitSeconds ?? 0;
    const participantConfig =
      experiment.participantConfig ?? this.getDefaultParticipantConfig();

    return createExperimentCallable(this.sp.firebaseService.functions, {
      type: 'templates',
      metadata: {
        name,
        publicName,
        description,
        tags,
        numberOfParticipants,
        prolificRedirectCode,
        attentionCheckConfig,
        participantConfig,
        isGroup,
        numExperiments,
        isMultiPart,
        dividerStageId,
        lobbyWaitSeconds,
      },
      stages,
    });
  }

  /** Adds a participant.
   */
  async createParticipant(
    experimentId: string,
    participantData: Partial<ParticipantProfile> | null = null,
    lobbyExperimentId: string | undefined = undefined // if participant is a transfer
  ): Promise<CreateParticipantResponse> {
    return createParticipantCallable(this.sp.firebaseService.functions, {
      experimentId,
      participantData,
      lobbyExperimentId,
    });
  }

  /** Deletes a participant. */
  async deleteParticipant(experimentId: string, participantId: string) {
    return deleteParticipantCallable(this.sp.firebaseService.functions, {
      experimentId,
      participantId,
    });
  }

  /** Transfers a participant. */
  async transferParticipant(
    currentExperimentId: string,
    newExperimentId: string,
    participant: ParticipantProfileExtended
  ) {
    try {
      // Create transfer participant in new experiment
      const response = await this.createParticipant(
        newExperimentId,
        participant,
        currentExperimentId
      );

      // Mark participant as transferred in old experiment
      const transferConfig = {
        experimentId: newExperimentId,
        participantId: response.participant.privateId,
      };

      return updateDoc(
        doc(
          this.sp.firebaseService.firestore,
          'experiments',
          currentExperimentId,
          'participants',
          participant.privateId
        ),
        {...participant, transferConfig}
      );
    } catch (error) {
      console.error('Error creating participant for transfer: ', error);
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
