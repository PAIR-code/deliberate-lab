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
  ParticipantProfileExtended,
  StageKind,
  StageParticipantAnswer,
  SurveyAnswer,
  SurveyStageConfig,
  SurveyStageParticipantAnswer,
  SurveyQuestionKind,
  createSurveyStageParticipantAnswer,
} from "@deliberation-lab/utils";

interface ServiceProvider {
  experimentService: ExperimentService;
  firebaseService: FirebaseService;
  participantService: ParticipantService;
  routerService: RouterService;
}

/** Handles participant responses to frontend stages
  * (e.g., before sending to backend) */
export class ParticipantAnswerService extends Service {
  constructor(private readonly sp: ServiceProvider) {
    super();
    makeObservable(this);
  }

  @observable experimentId: string | null = null;
  @observable participantId: string | null = null;

  // Map of stage ID to map of participant answers
  @observable answerMap: Record<string, StageParticipantAnswer> = {};
  // Profile
  @observable profile: ParticipantProfileExtended | null = null;

  // Loading
  @observable areAnswersLoading = false;

  @computed get isLoading() {
    return this.areAnswersLoading;
  }

  set isLoading(value: boolean) {
    this.areAnswersLoading = value;
  }

  getSurveyAnswer(stageId: string, questionId: string) {
    const answer = this.answerMap[stageId];
    if (!answer || answer.kind !== StageKind.SURVEY) return undefined;
    return answer.answerMap ? answer.answerMap[questionId] : undefined;
  }

  setIds(experimentId: string, participantId: string) {
    this.experimentId = experimentId;
    this.participantId = participantId;
  }

  reset() {
    this.experimentId = null;
    this.participantId = null;
    this.resetData();
  }

  resetData() {
    this.answerMap = {};
    this.profile = null;
  }

  setProfile(profile: ParticipantProfileExtended) {
    this.profile = profile;
  }

  addAnswer(stageId: string, answer: StageParticipantAnswer) {
    switch (answer.kind) {
      case StageKind.SURVEY:
        return this.addSurveyAnswer(stageId, answer);
    }
  }

  addSurveyAnswer(stageId: string, answer: SurveyStageParticipantAnswer) {
    this.areAnswersLoading = true;
    this.answerMap[stageId] = answer;
    this.areAnswersLoading = false;
  }

  @computed get isProfileCompleted() {
    if (!this.profile) return false;

    return this.profile.name
      && this.profile.pronouns
      && this.profile.avatar;
  }

  getNumSurveyAnswers(stageId: string) {
    const answer = this.answerMap[stageId];
    if (!answer || answer.kind !== StageKind.SURVEY) return 0;
    return Object.keys(answer.answerMap).length;
  }

  updateProfile(config: Partial<ParticipantProfileExtended>) {
    if (!this.profile) return;
    this.profile = {...this.profile, ...config};
  }

  updateSurveyAnswer(stageId: string, surveyAnswer: SurveyAnswer) {
    let answer = this.answerMap[stageId];
    if (!answer || answer.kind !== StageKind.SURVEY) {
      answer = createSurveyStageParticipantAnswer({ id: stageId });
    }

    answer.answerMap[surveyAnswer.id] = surveyAnswer;
    this.answerMap[stageId] = answer;
  }

  async saveSurveyAnswers(stageId: string) {
    const answer = this.answerMap[stageId];
    if (!answer || answer.kind !== StageKind.SURVEY) return;
    await this.sp.participantService.updateSurveyStageParticipantAnswerMap(
      stageId,
      answer.answerMap
    );
  }

  updateForRoute(
    eid: string, // experiment ID
    pid: string, // participant ID
  ) {
    if (eid !== this.experimentId || pid !== this.participantId) {
      this.setIds(eid, pid);
    }
  }
}
