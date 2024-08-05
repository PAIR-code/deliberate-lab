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
  MessageKind,
  ParticipantProfileExtended,
  PayoutCurrency,
  PublicStageData,
  StageAnswer,
  StageConfig,
  StageKind
} from "@llm-mediation-experiments/utils";
import {downloadCSV, downloadJSON} from '../shared/file_utils';
import {convertUnifiedTimestampToDate, getPayouts} from "../shared/utils";
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

  // Download options
  @observable isDownloadExperimentJSON = true;
  @observable isDownloadParticipantCSV = true;
  @observable isDownloadChatCSV = true;

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
    if (this.isDownloadParticipantCSV) {
      num += 1;
    }
    if (this.isDownloadChatCSV) {
      num += 1;
    }

    return num;
  }

  getFilePrefix() {
    if (this.groupId) {
      return `experiment_group_${this.groupId}`;
    } else if (this.experimentId) {
      return `experiment_${this.experimentId}`;
    }
    return '';
  }

  toggleDownloadExperimentJSON() {
    this.isDownloadExperimentJSON = !this.isDownloadExperimentJSON;
  }

  downloadExperimentJSON() {
    if (this.groupId) {
      downloadJSON(
        { groupId: this.groupId, experiments: this.experimentData},
        `${this.getFilePrefix()}.json`
      );
    } else if (this.experimentId) {
      this.experimentData.forEach((data) => {
        downloadJSON(data, `experiment_${data.experiment.id}.json`);
      });
    }
  }

  toggleDownloadChatCSV() {
    this.isDownloadChatCSV = !this.isDownloadChatCSV;
  }

  downloadChatCSV() {
    const headers: string[] = [
      'Timestamp',
      'Message Type',
      'User',
      'Text',
    ];

    this.experimentData.forEach((data) => {
      Object.keys(data.chats).forEach((chatId) => {
        const stage = data.chats[chatId];

        // Use unique private participant ID
        const getParticipantPrivateId = (publicId: string) => {
          return Object.values(data.participants).find(
            participant => participant.publicId === publicId
          )?.privateId ?? '';
        };

        // Get message name based on type
        const getMessageName = (message: Message) => {
          switch (message.kind) {
            case MessageKind.UserMessage:
              return getParticipantPrivateId(message.fromPublicParticipantId);
            case MessageKind.MediatorMessage:
              return message.name;
            default:
              return '';
          }
        };

        const messages: string[][] = stage.map(message =>
          [
            convertUnifiedTimestampToDate(message.timestamp),
            message.kind,
            getMessageName(message),
            message.text
          ]
        );

        downloadCSV(
          [headers, ...messages],
          `${this.getFilePrefix()}_experiment_${data.experiment.id}_chat_${chatId}.csv`
        );
      })
    })
  }

  toggleDownloadParticipantCSV() {
    this.isDownloadParticipantCSV = !this.isDownloadParticipantCSV;
  }

  downloadParticipantCSV() {
    const headers: string[] = [
      'Participant ID', // private ID
      'Prolific ID',
      'Name',
      'Avatar',
      'Pronouns',
      'Accepted Terms of Service',
      'Completed Experiment?',
      'Completion Type',
      'Current Stage',
      'Transfer Experiment ID',
      'Payout',
    ];

    const participantDataList: string[][] = [];
    // For each participant, match data to headers
    this.experimentData.forEach((data) => {
      Object.values(data.participants).forEach((participant) => {
        // Calculate payouts for current participant
        const totalPayouts = () => {
          let total = 0;
          Object.values(data.payouts).forEach((stage) => {
            if (stage.payouts[participant.publicId]) {
              total += stage.payouts[participant.publicId];
            }
          });
          return total;
        };

        // If transfer config is set, ignore for now and
        // add participant when reached in transfer experiment data object
        //
        // NOTE: This means that if you download only the lobby experiment,
        // transferred participants will not be included.
        if (participant.transferConfig === null) {
          participantDataList.push([
            participant.privateId,
            participant.prolificId ?? '',
            participant.name ?? '',
            participant.avatarUrl ?? '',
            participant.pronouns ?? '',
            participant.acceptTosTimestamp ? convertUnifiedTimestampToDate(participant.acceptTosTimestamp) : '',
            participant.completedExperiment ? convertUnifiedTimestampToDate(participant.completedExperiment) : '',
            participant.completionType ?? '',
            participant.currentStageId ?? '',
            data.experiment.lobbyConfig?.isLobby ? '' : data.experiment.id,
            data.experiment.lobbyConfig?.isLobby ? '' : totalPayouts().toString(),
          ]);
        }
      });
    });
    downloadCSV(
      [headers, ...participantDataList],
      `${this.getFilePrefix()}_participants_payouts.csv`
    );
  }

  download() {
    if (this.isDownloadExperimentJSON) {
      this.downloadExperimentJSON();
    }
    if (this.isDownloadParticipantCSV) {
      this.downloadParticipantCSV();
    }
    if (this.isDownloadChatCSV) {
      this.downloadChatCSV();
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
