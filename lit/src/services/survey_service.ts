import { computed, makeObservable, observable } from "mobx";
import { FirebaseService } from "./firebase_service";
import { Service } from "./service";
import { ExperimentService } from "./experiment_service";
import { ParticipantService } from "./participant_service";
import { RouterService } from "./router_service";
import { Timestamp, Unsubscribe, collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import {
  TextQuestionAnswer,
  StageKind,
  SurveyStageAnswer,
  SurveyStageConfig,
  SurveyQuestionKind,
} from "@llm-mediation-experiments/utils";
import { updateStageCallable } from "../shared/callables";

interface ServiceProvider {
  experimentService: ExperimentService;
  firebaseService: FirebaseService;
  participantService: ParticipantService;
  routerService: RouterService;
}

/** Handles frontend survey stage (e.g., before sending to backend) */
export class SurveyService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  @observable experimentId: string | null = null;
  @observable participantId: string | null = null;
  @observable stageId = '';
  @observable textAnswers: Record<number, string> = {};

  // Loading
  @observable areAnswersLoading = false;

  @computed get isLoading() {
    return this.areAnswersLoading;
  }

  set isLoading(value: boolean) {
    this.areAnswersLoading = value;
  }

  setSurvey(experimentId: string, participantId: string, stageId: string) {
    this.experimentId = experimentId;
    this.participantId = participantId;
    this.stageId = stageId;
    this.areAnswersLoading = true;
    this.loadSurveyAnswers();
  }

  loadSurveyAnswers() {
    const stage = (this.sp.experimentService.getStage(this.stageId) as SurveyStageConfig);
    const answer = (this.sp.participantService.stageAnswers[this.stageId] as SurveyStageAnswer);
    this.textAnswers = {};

    if (stage) {
      for (const question of stage.questions.filter(question => question.kind === SurveyQuestionKind.Text)) {
        this.textAnswers[question.id] = answer ? (
          answer.answers[question.id] as TextQuestionAnswer
        ).answerText ?? '' : '';
      }
    }
    this.areAnswersLoading = false;
  }

  updateTextAnswer(id: number, answer: string) {
    this.textAnswers[id] = answer;
  }

  isAllTextAnswersValid() {
    for (const answer of Object.values(this.textAnswers)) {
      if (answer === '') {
        return false;
      }
    }
    return true;
  }

  getNumTextAnswers() {
    return Object.keys(this.textAnswers).length;
  }

  async saveTextAnswers() {
    for (const key in Object.keys(this.textAnswers)) {
      const id = Number(key);
      const answer: TextQuestionAnswer = {
        id,
        kind: SurveyQuestionKind.Text,
        answerText: this.textAnswers[id] ?? '',
      }
      await this.sp.participantService.updateSurveyStage(
        this.sp.participantService.profile!.currentStageId,
        [answer]
      );
    }
  }

  updateForCurrentRoute() {
    const eid = this.sp.routerService.activeRoute.params["experiment"];
    const pid = this.sp.routerService.activeRoute.params["participant"];
    const stageId = this.sp.routerService.activeRoute.params["stage"];
    if (eid !== this.experimentId || pid !== this.participantId || stageId !== this.stageId) {
      this.setSurvey(eid, pid, stageId);
    }
  }
}
