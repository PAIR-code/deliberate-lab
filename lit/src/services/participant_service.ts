import { makeObservable, observable } from "mobx";
import { AuthService } from "./auth_service";
import { FirebaseService } from "./firebase_service";
import { Service } from "./service";
import { SettingsService } from "./settings_service";
import { Unsubscribe, collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { ParticipantProfile, ParticipantProfileBase, QuestionAnswer, StageAnswer, StageKind, Votes, lookupTable } from "@llm-mediation-experiments/utils";
import { updateStageCallable } from "../shared/callables";


interface ServiceProvider {
  authService: AuthService;
  settingsService: SettingsService;
  firebaseService: FirebaseService;
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

  @observable unsubscribe: Unsubscribe[] = [];
  @observable isLoading = false;

  setParticipant(experimentId: string | null, participantId: string | null) {
    this.experimentId = experimentId;
    this.participantId = participantId;
    this.isLoading = true;
    this.loadParticipantData();
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
        },
      ),
    );
  }

  unsubscribeAll() {
    this.unsubscribe.forEach((unsubscribe) => unsubscribe());
    this.unsubscribe = [];
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

  /** Update this participant's `workingOnStageName`
   * @rights Participant
   */
  async workOnStage(stageName: string) {
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
