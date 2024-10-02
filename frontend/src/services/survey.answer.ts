import { computed, makeObservable, observable } from "mobx";
import { FirebaseService } from "./firebase.service";
import { Service } from "./service";
import { ExperimentService } from "./experiment.service";
import { ParticipantService } from "./participant.service";
import { RouterService } from "./router.service";
import {
  Timestamp,
  Unsubscribe,
  collection,
  doc,
  onSnapshot
} from "firebase/firestore";
  import {
  StageKind,
  SurveyAnswer,
  SurveyStageConfig,
  SurveyStageParticipantAnswer,
  SurveyQuestionKind,
} from "@deliberation-lab/utils";

interface ServiceProvider {
  experimentService: ExperimentService;
  firebaseService: FirebaseService;
  participantService: ParticipantService;
  routerService: RouterService;
}

/** Handles participant responses to frontend survey stage
  * (e.g., before sending to backend) */
export class SurveyAnswerService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  @observable experimentId: string | null = null;
  @observable participantId: string | null = null;
  @observable stageId = '';

  // Map of stage ID to map of survey answers
  @observable answerMap: Record<string, Record<string, SurveyAnswer>> = {};

  // Loading
  @observable areAnswersLoading = false;

  @computed get isLoading() {
    return this.areAnswersLoading;
  }

  set isLoading(value: boolean) {
    this.areAnswersLoading = value;
  }

  getAnswer(stageId: string, questionId: string) {
    const answerMap = this.answerMap[stageId];
    return answerMap ? answerMap[questionId] : undefined;
  }

  setSurvey(experimentId: string, participantId: string, stageId: string) {
    this.experimentId = experimentId;
    this.participantId = participantId;
    this.stageId = stageId;
  }

  resetAnswers() {
    this.answerMap = {};
  }

  addSurveyAnswer(stageId: string, answer: SurveyStageParticipantAnswer) {
    this.areAnswersLoading = true;
    this.answerMap[stageId] = answer.answerMap;
    this.areAnswersLoading = false;
  }

  getNumAnswers(stageId: string) {
    if (!this.answerMap[stageId]) return 0;
    return Object.keys(this.answerMap[stageId]).length;
  }

  updateAnswer(stageId: string, answer: SurveyAnswer) {
    if (!this.answerMap[stageId]) {
      this.answerMap[stageId] = {};
    }
    this.answerMap[stageId][answer.id] = answer;
  }

  async saveAnswers() {
    const answers = this.answerMap[this.stageId];
    if (!answers) return;
    await this.sp.participantService.updateSurveyStageParticipantAnswerMap(
      this.stageId,
      answers
    );
  }

  updateForRoute(
    eid: string, // experiment ID
    pid: string, // participant ID
    stageId: string, // stage ID
  ) {
    if (eid !== this.experimentId || pid !== this.participantId || stageId !== this.stageId) {
      this.setSurvey(eid, pid, stageId);
    }
  }
}
