import { computed, makeObservable, observable } from "mobx";
import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";

import { Service } from "./service";
import { ExperimenterService } from "./experimenter_service";
import { FirebaseService } from "./firebase_service";
import { RouterService } from "./router_service";

import {
  Experiment,
  lookupTable,
  Message,
  ParticipantProfileExtended,
  PayoutCurrency,
  PublicStageData,
  StageAnswer,
  StageConfig,
  StageKind
} from "@llm-mediation-experiments/utils";
import {downloadJsonFile} from '../shared/file_utils';
import {getPayouts} from "../shared/utils";
import {ExperimentData, ExperimentDataStage, PayoutData} from "../shared/types";

interface ServiceProvider {
  experimenterService: ExperimenterService;
  firebaseService: FirebaseService;
  routerService: RouterService;
}

/** Handles data previews and downloads */
export class DataService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  // Loading
  @observable isDataLoading = false;

  @observable experimentId: string|null = null; // null if experiment group
  @observable groupId: string|null = null; // null if single experiment

  @observable experimentData: ExperimentData[] = [];

  @observable isDownloadExperimentJSON = true;

  @computed get isLoading() {
    return this.sp.experimenterService.isLoading || this.isDataLoading;
  }

  updateForCurrentRoute() {
    const experiment = this.sp.routerService.activeRoute.params["experiment"];
    const group = this.sp.routerService.activeRoute.params["experiment_group"];

    if (this.sp.experimenterService.isLoading) {
      return;
    }

    if (experiment !== this.experimentId || group !== this.groupId) {
      this.resetData();
      this.loadDataForCurrentRoute(experiment, group);
    }
  }

  resetData() {
    this.experimentId = null;
    this.groupId = null;
    this.experimentData = [];
  }

  loadDataForCurrentRoute(experimentId: string, groupId: string) {
    this.experimentId = experimentId;
    this.groupId = groupId;

    if (this.groupId) {
      this.loadGroup();
    } else if (this.experimentId) {
      this.loadExperiment();
    }
  }

  numDownloads() {
    let num = 0;
    if (this.isDownloadExperimentJSON) {
      num += 1;
    }

    return num;
  }

  toggleDownloadExperimentJSON() {
    this.isDownloadExperimentJSON = !this.isDownloadExperimentJSON;
  }

  downloadExperimentJSON() {
    if (this.groupId) {
      downloadJsonFile(
        { groupId: this.groupId, experiments: this.experimentData},
        `experiment_group_${this.groupId}.json`
      );
    } else if (this.experimentId) {
      this.experimentData.forEach((data) => {
        downloadJsonFile(data, `experiment_${data.experiment.id}.json`);
      });
    }
  }

  download() {
    if (this.isDownloadExperimentJSON) {
      this.downloadExperimentJSON()
    }
  }

  async loadGroup(groupId: string = this.groupId ?? '') {
    const experiments = this.sp.experimenterService.getExperimentsInGroup(groupId);
    for (const experiment of experiments) {
      await this.loadExperiment(experiment.id);
    }
  }

  async loadExperiment(experimentId: string = this.experimentId ?? '') {
    this.isDataLoading = true;
    console.log(`Loading data for experiment ${experimentId}`);

    const experiment: Experiment = {
      id: experimentId,
      ...(
        await getDoc(
          doc(
            this.sp.firebaseService.firestore,
            'experiments',
            experimentId
          )
        )
      ).data()
    } as Experiment;

    const participants: ParticipantProfileExtended[] = (
      await getDocs(
        collection(
          this.sp.firebaseService.firestore,
          'experiments',
          experimentId,
          'participants'
        )
      )
    ).docs.map((doc) => ({...doc.data(), privateId: doc.id} as ParticipantProfileExtended));
    const participantMap = lookupTable(participants, 'privateId');

    const configs: StageConfig[] = (
      await getDocs(
        collection(
          this.sp.firebaseService.firestore,
          'experiments',
          experimentId,
          'stages'
        )
      )
    ).docs.map((doc) => (doc.data() as StageConfig));

    // Get public stage data
    const stagePublicData = (
      await getDocs(
        collection(
          this.sp.firebaseService.firestore,
          'experiments',
          experimentId,
          'publicStageData'
        )
      )
    ).docs.map((doc) => ({...(doc.data() as PublicStageData), id: doc.id}));
    const publicStageDataMap = lookupTable(stagePublicData, 'id');

    // Get chat answers per stage
    const chats: Record<string, Message[]> = {};
    configs.forEach(async (config) => {
      if (config.kind === StageKind.GroupChat) {
        const messages = await getDocs(
          query(
            collection(
              this.sp.firebaseService.firestore,
              'experiments',
              experimentId,
              'publicStageData',
              config.id,
              'messages'
            ),
            orderBy('timestamp', 'asc')
          )
        );
        chats[config.id] = messages.docs.map((doc) => doc.data() as Message);
      }
    });

    // Get payout answers per stage
    const payouts: Record<string, PayoutData> = {};
    configs.forEach((config) => {
      if (config.kind === StageKind.Payout) {
        payouts[config.id] = getPayouts(config, participants, publicStageDataMap);
      }
    });

    // Get stage answers per participant.
    const stageAnswers = await Promise.all(
      participants.map(async (participant) => {
        return (
          await getDocs(
            collection(
              this.sp.firebaseService.firestore,
              'experiments',
              experimentId,
              'participants',
              participant.privateId,
              'stages'
            )
          )
        ).docs.map((doc) => ({...(doc.data() as StageAnswer), id: doc.id}));
      })
    );

    // Lookups
    const answersLookup = stageAnswers.reduce((acc, stageAnswers, index) => {
      const participantId = participants[index].publicId;

      stageAnswers.forEach((stageAnswer) => {
        if (!acc[stageAnswer.id]) acc[stageAnswer.id] = {};

        acc[stageAnswer.id][participantId] = stageAnswer as StageAnswer;
      });
      return acc;
    }, {} as Record<string, Record<string, StageAnswer>>);

    // Assemble map of stages with config, publicStageData, and private answers
    const stages: Record<string, ExperimentDataStage> = {};
    configs.forEach((config) => {
      const publicData = publicStageDataMap[config.id];
      const answers = answersLookup[config.id];
      stages[config.id] = {config, publicData, answers};
    });

    // Assemble experiment data
    const data: ExperimentData = {
      experiment,
      participants: participantMap,
      stages,
      chats,
      payouts,
    };
    this.experimentData.push(data);
    this.isDataLoading = false;
  }
}
