import { computed, makeObservable, observable } from "mobx";
import { FirebaseService } from "./firebase_service";
import { Service } from "./service";
import { RouterService } from "./router_service";
import { Timestamp, Unsubscribe, collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { ParticipantProfile, ParticipantProfileBase, QuestionAnswer, StageAnswer, StageKind, Votes, lookupTable } from "@llm-mediation-experiments/utils";
import { updateStageCallable } from "../shared/callables";


interface ServiceProvider {
  firebaseService: FirebaseService;
  routerService: RouterService;
}

export class ParticipantService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  @observable experimentId: string | null = null;
  @observable participantId: string | null = null;

  @observable profile: ParticipantProfile | undefined = undefined;
  @observable stageAnswers: Record<string, StageAnswer | undefined> = {};

  // Loading
  @observable unsubscribe: Unsubscribe[] = [];
  @observable isProfileLoading = false;
  @observable areAnswersLoading = false;

  @computed get isLoading() {
    return this.isProfileLoading || this.areAnswersLoading;
  }

  set isLoading(value: boolean) {
    this.isProfileLoading = value;
    this.areAnswersLoading = value;
  }

  setParticipant(experimentId: string | null, participantId: string | null) {
    this.experimentId = experimentId;
    this.participantId = participantId;
    this.isLoading = true;
    this.loadParticipantData();
  }

  isCurrentStage(
    stageName: string = this.sp.routerService.activeRoute.params["stage"]
  ) {
    return this.profile?.workingOnStageName === stageName;
  }

  updateForCurrentRoute() {
    const eid = this.sp.routerService.activeRoute.params["experiment"];
    const pid = this.sp.routerService.activeRoute.params["participant"];
    if (eid !== this.experimentId || pid !== this.participantId) {
      this.setParticipant(eid, pid);
    }
  }

  loadParticipantData() {
    this.unsubscribeAll();

    if(this.experimentId === null || this.participantId === null) {
      this.isLoading = false;
      return;
    }

    // Subscribe to the participant profile
    this.unsubscribe.push(
      onSnapshot(
        doc(this.sp.firebaseService.firestore, 'experiments', this.experimentId, 'participants', this.participantId),
        (doc) => {
          this.profile = doc.data() as ParticipantProfile;
          this.isProfileLoading = false;
        },
      ),
    );

    // Subscribe to the stage answers
    this.unsubscribe.push(
      onSnapshot(
        collection(this.sp.firebaseService.firestore, 'experiments', this.experimentId, 'participants', this.participantId, 'stages'),
        (snapshot) => {
          let changedDocs = snapshot.docChanges().map((change) => change.doc);
          if (changedDocs.length === 0) changedDocs = snapshot.docs;

          // Update the public stage data signals
          changedDocs.forEach((doc) => {
            this.stageAnswers[doc.id] = doc.data() as StageAnswer;
          });
          this.areAnswersLoading = false;
        },
      ),
    );
  }

  unsubscribeAll() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.unsubscribe = [];

    this.profile = undefined;
    this.stageAnswers = {};
  }
  
  // ******************************************************************************************* //
  //                                          MUTATIONS                                          //
  // ******************************************************************************************* //

  /** Update this participants's profile and acceptance of the Terms of Service.
   * @rights Participant
   */
  async updateProfile(data: Partial<ParticipantProfileBase>) {
    return updateDoc(
      doc(this.sp.firebaseService.firestore, 'experiments', this.experimentId!, 'participants', this.participantId!),
      data,
    );
  }

  /** Mark a participant as having finished the experiment
   * @rights Participant
   */
  async markExperimentCompleted() {
    return updateDoc(
      doc(this.sp.firebaseService.firestore, 'experiments', this.experimentId!, 'participants', this.participantId!),
      {
        completedExperiment: Timestamp.now(),
      },
    );
  }

  /** Update this participant's `workingOnStageName`
   * @rights Participant
   */
  async updateWorkingOnStageName(stageName: string) {
    return updateDoc(
      doc(this.sp.firebaseService.firestore, 'experiments', this.experimentId!, 'participants', this.participantId!),
      {
        workingOnStageName: stageName,
      },
    );
  }

  /** Update a survey stage for this participant
   * @rights Participant
   */
  async updateSurveyStage(stageName: string, answers: QuestionAnswer[]) {
    return updateStageCallable(
      this.sp.firebaseService.functions,
      {
      experimentId: this.experimentId!,
      participantId: this.participantId!,
      stageName,
      stage: {
        kind: StageKind.TakeSurvey,
        answers: lookupTable(answers, 'id'),
      },
    });
  }

  /** Update a vote for leader stage for this participant
   * @rights Participant
   */
  async updateVoteForLeaderStage(stageName: string, votes: Votes) {
    return updateStageCallable(
      this.sp.firebaseService.functions,
      {
      experimentId: this.experimentId!,
      participantId: this.participantId!,
      stageName,
      stage: {
        kind: StageKind.VoteForLeader,
        votes,
      },
    });
  }
}
