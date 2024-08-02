import { computed, makeObservable, observable } from 'mobx';

import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';

import { updateStageCallable } from '../shared/callables';
import { ExperimenterService } from './experimenter_service';
import { FirebaseService } from './firebase_service';
import { Pages, RouterService } from './router_service';
import { Service } from './service';

import {
  Experiment,
  lookupTable,
  LostAtSeaQuestionAnswer,
  LostAtSeaSurveyStagePublicData,
  Message,
  PARTICIPANT_COMPLETION_TYPE,
  ParticipantProfile,
  ParticipantProfileExtended,
  PayoutCurrency,
  PayoutStageConfig,
  PublicStageData,
  ScoringBundle,
  ScoringItem,
  StageAnswer,
  StageConfig,
  StageKind,
  VoteForLeaderStagePublicData,
} from '@llm-mediation-experiments/utils';
import { downloadJsonFile } from '../shared/file_utils';
import { AnswerItem } from '../shared/types';
import { collectSnapshotWithId } from '../shared/utils';

interface ServiceProvider {
  experimenterService: ExperimenterService;
  firebaseService: FirebaseService;
  routerService: RouterService;
}

/** Manages state for current experiment.
 * This includes adding, transferring, and deleting participants.
 */
export class ExperimentService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  @observable id: string | null = null;
  @observable experiment: Experiment | undefined = undefined;

  @observable stageConfigMap: Record<string, StageConfig> = {};
  @observable publicStageDataMap: Record<string, PublicStageData | undefined> =
    {};

  // Experimenter-accessible participant details (e.g., including private ID).
  // For participant access to profiles, use getParticipantProfile(s)
  @observable privateParticipants: ParticipantProfileExtended[] = [];

  // Loading
  @observable unsubscribe: Unsubscribe[] = [];
  @observable isConfigLoading = false;
  @observable isPublicStageDataLoading = false;
  @observable isMetadataLoading = false;

  @computed get isLoading() {
    return (
      this.isConfigLoading ||
      this.isPublicStageDataLoading ||
      this.isMetadataLoading
    );
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
    const id = this.sp.routerService.activeRoute.params['experiment'];
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
      onSnapshot(
        doc(this.sp.firebaseService.firestore, 'experiments', this.id),
        (doc) => {
          this.experiment = {id: doc.id, ...doc.data()} as Experiment;
          this.isMetadataLoading = false;
        }
      )
    );

    // Subscribe to the public stage data
    this.unsubscribe.push(
      onSnapshot(
        collection(
          this.sp.firebaseService.firestore,
          'experiments',
          this.id,
          'publicStageData'
        ),
        (snapshot) => {
          let changedDocs = snapshot.docChanges().map((change) => change.doc);
          if (changedDocs.length === 0) changedDocs = snapshot.docs;

          // Update the public stage data signals
          changedDocs.forEach((doc) => {
            this.publicStageDataMap[doc.id] = doc.data() as PublicStageData;
          });

          this.isPublicStageDataLoading = false;
        }
      )
    );

    // Fetch the experiment config
    this.unsubscribe.push(
      onSnapshot(
        collection(
          this.sp.firebaseService.firestore,
          'experiments',
          this.id,
          'stages'
        ),
        (snapshot) => {
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
        }
      )
    );
  }

  private loadExperimentParticipants() {
    if (this.id !== null) {
      // Bind the array to the firestore collection
      this.unsubscribe.push(
        onSnapshot(
          collection(
            this.sp.firebaseService.firestore,
            'experiments',
            this.id,
            'participants'
          ),
          (snapshot) => {
            // Replace the values in the array in place to not break the reference
            this.privateParticipants.splice(
              0,
              this.privateParticipants.length,
              ...collectSnapshotWithId<ParticipantProfileExtended>(
                snapshot,
                'privateId'
              )
            );
          }
        )
      );
    }
  }

  unsubscribeAll() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.unsubscribe = [];

    // Reset stage configs
    this.stageConfigMap = {};
    this.publicStageDataMap = {};
    this.experiment = undefined;
  }

  @computed get stageIds(): string[] {
    return this.experiment?.stageIds ?? [];
  }

  private isInactive(participant: ParticipantProfile) {
    return (
      participant.completedExperiment &&
      participant.completionType !== PARTICIPANT_COMPLETION_TYPE.SUCCESS
    );
  }

  getStage(stageId: string) {
    return this.stageConfigMap[stageId];
  }

  getStageName(stageId: string, withNumber = false) {
    if (this.isLoading) {
      return 'Loading...';
    }

    const stageNumber = withNumber
      ? `${this.getStageIndex(stageId) + 1}. `
      : '';
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
      return {completed, notCompleted};
    }

    this.getParticipantProfiles().forEach((participant) => {
      const index = this.getStageIndex(participant.currentStageId);
      if (index >= 0 && index > stageIndex) {
        completed.push(participant);
      } else {
        notCompleted.push(participant);
      }
    });

    return {completed, notCompleted};
  }

  // Returns lists of participants who have/haven't reached the given stage
  getParticipantsReadyForStage(stageId: string) {
    const ready: ParticipantProfile[] = [];
    const notReady: ParticipantProfile[] = [];

    const stageIndex = this.getStageIndex(stageId);
    if (stageIndex === -1) {
      return {ready, notReady};
    }

    this.getParticipantProfiles().forEach((participant) => {
      const index = this.getStageIndex(participant.currentStageId);
      if ((index >= 0 && index >= stageIndex) || this.isInactive(participant)) {
        ready.push(participant);
      } else {
        notReady.push(participant);
      }
    });

    return {ready, notReady};
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
      return {ready, notReady};
    }

    Object.keys(stage.readyToEndChat).forEach((publicId) => {
      const participant = this.getParticipantProfile(publicId);
      if (!participant) {
        return;
      }

      if (this.isInactive(participant) || stage.readyToEndChat[publicId]) {
        ready.push(participant);
      } else {
        notReady.push(participant);
      }
    });

    return {ready, notReady};
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

  async markParticipantReadyToEndChat(
    readyToEndChat: boolean,
    participantId: string,
    stageId: string
  ) {
    return updateStageCallable(this.sp.firebaseService.functions, {
      experimentId: this.experiment?.id!,
      participantId: participantId,
      stageId: stageId,
      stage: {
        kind: StageKind.GroupChat,
        readyToEndChat,
      },
    });
  }

  markParticipantCompleted(publicId: string) {
    // Mark the participant as completed in any chats.
    for (const stageId of Object.keys(this.publicStageDataMap)) {
      const stage = this.publicStageDataMap[stageId];
      if (stage && stage!.kind === StageKind.GroupChat) {
        this.markParticipantReadyToEndChat(true, publicId, stageId);
      }
    }
  }

  canAddParticipant() {
    if (!this.experiment?.participantConfig.numberOfMaxParticipants) {
      return true;
    } else {
      return (
        this.experiment?.numberOfParticipants! <
        this.experiment?.participantConfig.numberOfMaxParticipants!
      );
    }
  }

  canStartExperiment() {
    if (
      !this.experiment?.participantConfig.waitForAllToStart ||
      !this.experiment?.participantConfig.numberOfMaxParticipants
    ) {
      return true;
    }
    return (
      this.experiment?.numberOfParticipants! ==
      this.experiment?.participantConfig.numberOfMaxParticipants!
    );
  }

  /** Build a signal that tracks whether every participant has at least reached the given stage */
  everyoneReachedStage(targetStageId: string): boolean {
    const participants = this.experiment?.participants;
    const targetIndex = this.getStageIndex(targetStageId);

    if (!participants || targetIndex === -1) return false;

    return Object.values(participants).every(
      (participant) =>
        this.getStageIndex(participant.currentStageId) >= targetIndex ||
        this.isInactive(participant)
    );
  }

  /** Calculate experiment payouts for current payout stage.
   * Return currency, payout map from participant public ID to value.
   */
  getPayouts(stage: PayoutStageConfig) {
    const payouts: Record<string, number> = {}; // participant ID, amount
    this.privateParticipants.forEach((participant) => {
      const getAnswerItems = (item: ScoringItem): AnswerItem[] => {
        // Use leader's answers if indicated, else current participant's answers
        if (item.leaderStageId && item.leaderStageId.length > 0) {
          const leaderPublicId =
            (
              this.publicStageDataMap[
                item.leaderStageId
              ] as VoteForLeaderStagePublicData
            ).currentLeader ?? '';
          const leaderAnswers = (
            this.publicStageDataMap[
              item.surveyStageId
            ] as LostAtSeaSurveyStagePublicData
          ).participantAnswers[leaderPublicId];

          if (!leaderAnswers) return [];

          return item.questions.map((question) => {
            return {
              ...question,
              leaderPublicId,
              userAnswer: (
                leaderAnswers[question.id] as LostAtSeaQuestionAnswer
              ).choice,
            };
          });
        }

        const userAnswers = (
          this.publicStageDataMap[
            item.surveyStageId
          ] as LostAtSeaSurveyStagePublicData
        ).participantAnswers[participant.publicId];
        if (!userAnswers) return [];
        return item.questions.map((question) => {
          return {
            ...question,
            userAnswer: (userAnswers[question.id] as LostAtSeaQuestionAnswer)
              .choice,
          };
        });
      };

      // Calculate score for bundle
      const getBundleScore = (bundle: ScoringBundle) => {
        let score = 0;
        bundle.scoringItems.forEach((item) => {
          // Calculate score for item
          const answerItems: AnswerItem[] = getAnswerItems(item);

          if (answerItems.length === 0) {
            return item.fixedCurrencyAmount;
          }

          const numCorrect = () => {
            let count = 0;
            answerItems.forEach((answer) => {
              if (answer.userAnswer === answer.answer) {
                count += 1;
              }
            });
            return count;
          };
          score +=
            item.fixedCurrencyAmount +
            item.currencyAmountPerQuestion * numCorrect();
        });
        return score;
      };

      // Add up all bundles to get total score
      const getTotalScore = () => {
        let score = 0;
        const scoring: ScoringBundle[] = stage.scoring ?? [];
        scoring.forEach((bundle) => {
          score += getBundleScore(bundle);
        });
        return score;
      };

      // Assign payout for participant
      payouts[participant.publicId] = getTotalScore();
    });

    return {currency: stage.currency, payouts};
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
      await getDocs(
        collection(
          this.sp.firebaseService.firestore,
          'experiments',
          experimentId,
          'publicStageData'
        )
      )
    ).docs.map((doc) => ({...(doc.data() as PublicStageData), id: doc.id}));

    // Get chat answers per stage
    const chats: Record<string, Message[]> = {};
    configs.forEach(async (config) => {
      if (config.kind === StageKind.GroupChat) {
        const messages = await getDocs(
          collection(
            this.sp.firebaseService.firestore,
            'experiments',
            experimentId,
            'publicStageData',
            config.id,
            'messages'
          )
        );
        chats[config.id] = messages.docs.map((doc) => doc.data() as Message);
      }
    });

    // Get payout answers per stage
    const payouts: Record<
      string,
      {currency: PayoutCurrency; payouts: Record<string, number>}
    > = {};
    configs.forEach((config) => {
      if (config.kind === StageKind.Payout) {
        payouts[config.id] = this.getPayouts(config);
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
    const publicData = lookupTable(stagePublicData, 'id');
    const answersLookup = stageAnswers.reduce((acc, stageAnswers, index) => {
      const participantId = participants[index].publicId;

      stageAnswers.forEach((stageAnswer) => {
        if (!acc[stageAnswer.id]) acc[stageAnswer.id] = {};

        acc[stageAnswer.id][participantId] = stageAnswer as StageAnswer;
      });
      return acc;
    }, {} as Record<string, Record<string, StageAnswer>>);

    const stages: Record<
      string,
      {
        config: StageConfig;
        public: PublicStageData;
        answers: Record<string, StageAnswer>;
      }
    > = {};
    configs.forEach((config) => {
      const stagePublicData = publicData[config.id];
      const answers = answersLookup[config.id];
      stages[config.id] = {config, public: stagePublicData, answers};
    });

    const data = {
      ...this.experiment,
      participants,
      stages,
      chats,
      payouts,
    };

    downloadJsonFile(data, `${this.experiment.name}.json`);
  }

  // ******************************************************************************************* //
  //                                           MUTATIONS                                         //
  // ******************************************************************************************* //

  /**
   * Join the current experiment as a participant.
   */
  async join(participantData: Partial<ParticipantProfile>) {
    if (!this.id) {
      return;
    }

    try {
      const response = await this.sp.experimenterService.createParticipant(
        this.id!,
        participantData
      );
      const participant = response.participant;

      // Navigate to page for created participant
      this.sp.routerService.navigate(Pages.PARTICIPANT, {
        experiment: this.id!,
        participant: participant.privateId,
      });
      this.sp.routerService.setExperimenterNav(false);
    } catch (error) {
      console.log('Error creating participant for: ', error);
      throw error;
    }
  }

  /** Delete the experiment..
   * @rights Experimenter
   */
  async delete() {
    return this.sp.experimenterService.deleteExperiment(this.id!);
  }
}
