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
  TextSurveyAnswer,
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
export class SurveyService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  @observable experimentId: string | null = null;
  @observable participantId: string | null = null;
  @observable stageId = '';

  // Map of stage ID to map of text answers
  @observable textAnswersMap: Record<string, Record<string, string>> = {};

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
  }

  addSurveyAnswer(answer: SurveyStageParticipantAnswer) {
    this.areAnswersLoading = true;

    const stage = this.sp.experimentService.getStage(answer.id);
    if (!stage) {
      this.areAnswersLoading = false;
      return;
    }

    const textAnswers: Record<string, string> = {};
    Object.values(answer.answerMap).filter(
      item => item.kind === SurveyQuestionKind.TEXT
    ).forEach(item => {
      textAnswers[item.id] = (item as TextSurveyAnswer).answer;
    });

    this.textAnswersMap[stage.id] = textAnswers;
    this.areAnswersLoading = false;
  }

  updateTextAnswer(id: string, answer: string) {
    if (!this.textAnswersMap[this.stageId]) {
      this.textAnswersMap[this.stageId] = {};
    }
    this.textAnswersMap[this.stageId][id] = answer;
  }

  isAllTextAnswersValid() {
    if (!this.textAnswersMap[this.stageId]) return true;
    for (const answer of Object.values(this.textAnswersMap[this.stageId])) {
      if (answer === '') {
        return false;
      }
    }
    return true;
  }

  getNumTextAnswers() {
    if (!this.textAnswersMap[this.stageId]) return 0;
    return Object.keys(this.textAnswersMap[this.stageId]).length;
  }

  getTextAnswer(questionId: string) {
    const stageAnswers = this.textAnswersMap[this.stageId];
    if (!stageAnswers) return '';

    return stageAnswers[questionId];
  }

  async saveTextAnswers() {
    const stageAnswerMap = this.textAnswersMap[this.stageId];
    if (!stageAnswerMap) return;
    for (const id of Object.keys(stageAnswerMap)) {
      const answer: TextSurveyAnswer = {
        id,
        kind: SurveyQuestionKind.TEXT,
        answer: stageAnswerMap[id] ?? '',
      };
      // Save text answer
      await this.sp.participantService.updateSurveyStageParticipantAnswer(
        this.stageId,
        answer
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
