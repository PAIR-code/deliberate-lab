import {computed, makeObservable, observable} from 'mobx';
import {FirebaseService} from './firebase.service';
import {Service} from './service';
import {ExperimentService} from './experiment.service';
import {ParticipantService} from './participant.service';
import {RouterService} from './router.service';
import {
  Timestamp,
  Unsubscribe,
  collection,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import {
  ParticipantProfileBase,
  RankingStageParticipantAnswer,
  StageKind,
  StageParticipantAnswer,
  SurveyAnswer,
  SurveyStageConfig,
  SurveyStageParticipantAnswer,
  SurveyQuestionKind,
  createChipOffer,
  createComprehensionStageParticipantAnswer,
  createRankingStageParticipantAnswer,
  createSurveyPerParticipantStageParticipantAnswer,
  createSurveyStageParticipantAnswer,
  ChipOffer,
} from '@deliberation-lab/utils';

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
  // Map of stage ID to current chat input
  @observable chatInputMap: Record<string, string> = {};
  // Profile
  @observable profile: ParticipantProfileBase | null = null;

  // Loading
  @observable areAnswersLoading = false;

  @computed get isLoading() {
    return this.areAnswersLoading;
  }

  set isLoading(value: boolean) {
    this.areAnswersLoading = value;
  }

  getRankingList(stageId: string) {
    const answer = this.answerMap[stageId];
    if (!answer || answer.kind !== StageKind.RANKING) return [];
    return answer.rankingList;
  }

  getSurveyAnswer(stageId: string, questionId: string) {
    const answer = this.answerMap[stageId];
    if (!answer || answer.kind !== StageKind.SURVEY) return undefined;
    return answer.answerMap ? answer.answerMap[questionId] : undefined;
  }

  getSurveyPerParticipantAnswer(
    stageId: string,
    questionId: string,
    participantId: string,
  ) {
    const answer = this.answerMap[stageId];
    if (!answer || answer.kind !== StageKind.SURVEY_PER_PARTICIPANT)
      return undefined;
    return answer.answerMap && answer.answerMap[participantId]
      ? answer.answerMap[participantId][questionId]
      : undefined;
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

  setProfile(profile: ParticipantProfileBase) {
    this.profile = profile;
  }

  addAnswer(stageId: string, answer: StageParticipantAnswer) {
    this.areAnswersLoading = true;
    this.answerMap[stageId] = answer;
    this.areAnswersLoading = false;
  }

  @computed get isProfileCompleted() {
    if (!this.profile) return false;

    return this.profile.name && this.profile.pronouns && this.profile.avatar;
  }

  getNumRankings(stageId: string) {
    const answer = this.answerMap[stageId];
    if (!answer || answer.kind !== StageKind.RANKING) return 0;
    return answer.rankingList.length;
  }

  getComprehensionAnswerMap(stageId: string) {
    const answer = this.answerMap[stageId];
    if (!answer || answer.kind !== StageKind.COMPREHENSION) return {};
    return answer.answerMap;
  }

  getComprehensionAnswer(stageId: string, questionId: string) {
    const answerMap = this.getComprehensionAnswerMap(stageId);
    if (!answerMap) return null;
    return answerMap[questionId];
  }

  updateComprehensionAnswer(
    stageId: string,
    questionId: string,
    answer: string,
  ) {
    let answerData = this.answerMap[stageId];
    if (!answerData || answerData.kind !== StageKind.COMPREHENSION) {
      answerData = createComprehensionStageParticipantAnswer({id: stageId});
    }

    answerData.answerMap[questionId] = answer;
    this.answerMap[stageId] = answerData;
  }

  getNumSurveyAnswers(stageId: string) {
    return this.getSurveyAnswerIDs(stageId).length;
  }

  getSurveyAnswerMap(stageId: string) {
    const answer = this.answerMap[stageId];
    if (!answer || answer.kind !== StageKind.SURVEY) return {};
    return answer.answerMap;
  }

  getSurveyAnswerIDs(stageId: string) {
    const answer = this.answerMap[stageId];
    if (!answer || answer.kind !== StageKind.SURVEY) return [];
    return Object.keys(answer.answerMap);
  }

  getSurveyPerParticipantAnswerMap(stageId: string, participantId: string) {
    const answer = this.answerMap[stageId];
    if (
      !answer ||
      answer.kind !== StageKind.SURVEY_PER_PARTICIPANT ||
      !answer.answerMap[participantId]
    ) {
      return {};
    }
    return answer.answerMap[participantId];
  }

  getSurveyPerParticipantAnswerIDs(stageId: string, participantId: string) {
    const answer = this.answerMap[stageId];
    if (
      !answer ||
      answer.kind !== StageKind.SURVEY_PER_PARTICIPANT ||
      !answer.answerMap[participantId]
    ) {
      return [];
    }
    return Object.keys(answer.answerMap[participantId]);
  }

  updateChatInput(stageId: string, chatInput: string) {
    this.chatInputMap[stageId] = chatInput;
  }

  getChatInput(stageId: string) {
    return this.chatInputMap[stageId] ?? '';
  }

  updateProfile(config: Partial<ParticipantProfileBase>) {
    if (!this.profile) return;
    this.profile = {...this.profile, ...config};
  }

  updateRankingAnswer(stageId: string, rankingList: string[]) {
    const answer: RankingStageParticipantAnswer =
      createRankingStageParticipantAnswer({id: stageId});
    answer.rankingList = rankingList;
    this.answerMap[stageId] = answer;
  }

  updateSurveyAnswer(stageId: string, surveyAnswer: SurveyAnswer) {
    let answer = this.answerMap[stageId];
    if (!answer || answer.kind !== StageKind.SURVEY) {
      answer = createSurveyStageParticipantAnswer({id: stageId});
    }

    answer.answerMap[surveyAnswer.id] = surveyAnswer;
    this.answerMap[stageId] = answer;
  }

  updateSurveyPerParticipantAnswer(
    stageId: string,
    surveyAnswer: SurveyAnswer,
    participantId: string,
  ) {
    let answer = this.answerMap[stageId];
    if (!answer || answer.kind !== StageKind.SURVEY_PER_PARTICIPANT) {
      answer = createSurveyPerParticipantStageParticipantAnswer({id: stageId});
    }
    if (!answer.answerMap[participantId]) {
      answer.answerMap[participantId] = {};
    }

    answer.answerMap[participantId][surveyAnswer.id] = surveyAnswer;
    this.answerMap[stageId] = answer;
  }

  async setChipTurn(stageId: string) {
    await this.sp.participantService.setChipTurn(stageId);
  }

  async saveSurveyAnswers(stageId: string) {
    const answer = this.answerMap[stageId];
    if (!answer || answer.kind !== StageKind.SURVEY) return;
    await this.sp.participantService.updateSurveyStageParticipantAnswerMap(
      stageId,
      answer.answerMap,
    );
  }

  async saveSurveyPerParticipantAnswers(stageId: string) {
    const answer = this.answerMap[stageId];
    if (!answer || answer.kind !== StageKind.SURVEY_PER_PARTICIPANT) return;
    await this.sp.participantService.updateSurveyPerParticipantStageParticipantAnswerMap(
      stageId,
      answer.answerMap,
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
