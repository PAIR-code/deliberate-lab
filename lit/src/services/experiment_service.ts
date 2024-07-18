import { computed, observable, makeObservable } from "mobx";

import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';

import { Service } from "./service";
import { FirebaseService } from "./firebase_service";
import { RouterService } from "./router_service";

import { Snapshot } from "../shared/types";
import {
  Experiment,
  lookupTable,
  Message,
  ParticipantProfile,
  ParticipantProfileExtended,
  PublicStageData,
  StageAnswer,
  StageConfig,
  StageKind
} from "@llm-mediation-experiments/utils";
import { collectSnapshotWithId, excludeName } from "../shared/utils";
import { deleteExperimentCallable } from "../shared/callables";
import { downloadJsonFile } from "../shared/file_utils";

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

  // Experimenter-accessible participant details (e.g., including private ID).
  // For participant access to profiles, use getParticipantProfile(s)
  @observable privateParticipants: ParticipantProfileExtended[] = [];
  
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
          this.privateParticipants.splice(0, this.privateParticipants.length, ...collectSnapshotWithId<ParticipantProfileExtended>(snapshot, 'privateId'))
        }),
      );
    }
  }

  unsubscribeAll() {
    this.unsubscribe.forEach(unsubscribe => unsubscribe());
    this.unsubscribe = [];

    // Reset stage configs
    this.stageConfigMap = {};
    this.publicStageDataMap = {};
    this.experiment = undefined;
  }

  @computed get stageIds(): string[] {
    return this.experiment?.stageIds ?? [];
  }

  getStage(stageId: string) {
    return this.stageConfigMap[stageId];
  }

  getStageName(stageId: string, withNumber = false) {
    if (this.isLoading) {
      return "Loading...";
    }

    const stageNumber = withNumber ? `${this.getStageIndex(stageId) + 1}. ` : '';
    return `${stageNumber}${this.stageConfigMap[stageId]?.name}`;
  }

  getStageIndex(stageId: string) {
    return this.stageIds.indexOf(stageId);
  }

  getNextStageId(stageId: string) {
    const currentIndex = this.getStageIndex(stageId);
    if (currentIndex >= 0 && currentIndex < this.stageIds.length - 1) {
      return this.stageIds[currentIndex + 1];
    }
    return null;
  }

  getPublicStageData(stageId: string) {
    return this.publicStageDataMap[stageId];
  }

  // Returns lists of participants who are/aren't past the given stage
  getParticipantsCompletedStage(stageId: string) {
    const completed: ParticipantProfile[] = [];
    const notCompleted: ParticipantProfile[] = [];

    const stageIndex = this.getStageIndex(stageId);

    if (stageIndex === -1) {
      return { completed, notCompleted };
    }

    this.getParticipantProfiles().forEach((participant) => {
      const index = this.getStageIndex(participant.currentStageId);
      if (index >= 0 && index > stageIndex) {
        completed.push(participant);
      } else {
        notCompleted.push(participant);
      }
    });

    return { completed, notCompleted };
  }

  // Returns lists of participants who have/haven't reached the given stage
  getParticipantsReadyForStage(stageId: string) {
    const ready: ParticipantProfile[] = [];
    const notReady: ParticipantProfile[] = [];

    const stageIndex = this.getStageIndex(stageId);
    if (stageIndex === -1) {
      return { ready, notReady };
    }

    this.getParticipantProfiles().forEach((participant) => {
      const index = this.getStageIndex(participant.currentStageId);
      if (index >= 0 && index >= stageIndex) {
        ready.push(participant);
      } else {
        notReady.push(participant);
      }
    });

    return { ready, notReady };
  }

  // Returns whether or not given participant is ready to end chat
  getParticipantReadyToEndChat(stageId: string, publicId: string) {
    const stage = this.publicStageDataMap[stageId];
    if (!stage || stage.kind !== StageKind.GroupChat) {
      return false;
    }

    return stage.readyToEndChat[publicId];
  }

  // Returns lists of participants who are/aren't ready to end chat
  getParticipantsReadyToEndChat(stageId: string) {
    const ready: ParticipantProfile[] = [];
    const notReady: ParticipantProfile[] = [];

    const stage = this.publicStageDataMap[stageId];

    if (!stage || stage.kind !== StageKind.GroupChat) {
      return { ready, notReady };
    }

    Object.keys(stage.readyToEndChat).forEach((publicId) => {
      const participant = this.getParticipantProfile(publicId);
      if (!participant) {
        return;
      }

      if (stage.readyToEndChat[publicId]) {
        ready.push(participant);
      } else {
        notReady.push(participant);
      }
    });

    return { ready, notReady };
  }

  getParticipantProfiles(): ParticipantProfile[] {
    return Object.values(this.experiment?.participants ?? {});
  }

  getParticipantProfile(publicId: string) {
    return this.experiment?.participants[publicId];
  }

  isReadyToEndChat(stageId: string, publicId: string) {
    const stage = this.publicStageDataMap[stageId];
    if (!stage || stage.kind !== StageKind.GroupChat) {
      return false;
    }

    return stage.readyToEndChat[publicId];
  }

  /** Build a signal that tracks whether every participant has at least reached the given stage */
  everyoneReachedStage(targetStageId: string): boolean {
    const participants = this.experiment?.participants;
    const targetIndex = this.getStageIndex(targetStageId);

    if (!participants || targetIndex === -1) return false;

    return Object.values(participants).every(
      (participant) => this.getStageIndex(participant.currentStageId) >= targetIndex,
    );
  }

  /** Download experiment as a single JSON file */
  async downloadExperiment() {
    if (!this.experiment) {
      return;
    }

    console.log(`Downloading experiment ${this.experiment.id}`);

    const experimentId = this.experiment.id;
    const participants = this.privateParticipants;
    const configs = Object.values(this.stageConfigMap);

    const stagePublicData = (
      await getDocs(collection(this.sp.firebaseService.firestore, 'experiments', this.experiment.id, 'publicStageData'))
    ).docs.map((doc) => ({ ...(doc.data() as PublicStageData), name: doc.id }));

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
              'stages',
            ),
          )
        ).docs.map((doc) => ({ ...(doc.data() as StageAnswer), name: doc.id }));
      }),
    );

    // Get chat data.
    // TODO: Technically, there are as many chat copies as there are participants
    // but because we do not change them, we will only download the first copy of
    // each chat here

    const chats = await getDocs(
      collection(
        this.sp.firebaseService.firestore,
        'experiments',
        experimentId,
        'participants',
        participants[0].privateId,
        'chats',
      ),
    );

    const chatMessages = await Promise.all(
      chats.docs.map((doc) =>
        getDocs(
          collection(
            this.sp.firebaseService.firestore,
            'experiments',
            experimentId,
            'participants',
            participants[0].privateId,
            'chats',
            doc.id,
            'messages',
          ),
        ),
      ),
    );

    // Lookups
    const publicData = lookupTable(stagePublicData, 'name');
    const answersLookup = stageAnswers.reduce(
      (acc, stageAnswers, index) => {
        const participantId = participants[index].publicId;

        stageAnswers.forEach((stageAnswer) => {
          if (!acc[stageAnswer.name]) acc[stageAnswer.name] = {};

          acc[stageAnswer.name][participantId] = excludeName(stageAnswer) as StageAnswer;
        });
        return acc;
      },
      {} as Record<string, Record<string, StageAnswer>>,
    );

    const data = {
      ...this.experiment,
      participants,

      stages: configs.map((config) => {
        const stagePublicData = publicData[config.name];
        const cleanedPublicData = stagePublicData ? excludeName(stagePublicData) : undefined;
        const answers = answersLookup[config.name];
        return { config, public: cleanedPublicData, answers };
      }),

      chats: chatMessages.reduce(
        (acc, chat, index) => {
          const messages = chat.docs.map((doc) => doc.data() as Message);
          acc[`chat-${index}`] = messages;
          return acc;
        },
        {} as Record<string, Message[]>,
      ),
    };

    downloadJsonFile(data, `${this.experiment.name}.json`);
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
