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
  AssetAllocation,
  AssetAllocationStageParticipantAnswer,
  ParticipantProfileBase,
  RankingStageParticipantAnswer,
  StageKind,
  StageParticipantAnswer,
  StockAllocation,
  StockInfoStageParticipantAnswer,
  SurveyAnswer,
  createAssetAllocationStageParticipantAnswer,
  createComprehensionStageParticipantAnswer,
  createRankingStageParticipantAnswer,
  createStockInfoStageParticipantAnswer,
  createSurveyPerParticipantStageParticipantAnswer,
  createSurveyStageParticipantAnswer,
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

  getAssetAllocation(stageId: string) {
    const answer = this.answerMap[stageId];
    if (!answer || answer.kind !== StageKind.ASSET_ALLOCATION) return undefined;
    return answer.allocation;
  }

  isAssetAllocationConfirmed(stageId: string) {
    const answer = this.answerMap[stageId];
    if (!answer || answer.kind !== StageKind.ASSET_ALLOCATION) return false;
    return answer.confirmed;
  }

  getAssetAllocationParticipantAnswer(
    stageId: string,
  ): AssetAllocationStageParticipantAnswer | null {
    const answer = this.answerMap[stageId];
    if (!answer || answer.kind !== StageKind.ASSET_ALLOCATION) return null;
    return answer as AssetAllocationStageParticipantAnswer;
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

  getStockInfoAnswer(stageId: string): StockInfoStageParticipantAnswer | null {
    const answer = this.answerMap[stageId];
    if (!answer || answer.kind !== StageKind.STOCKINFO) return null;
    return answer as StockInfoStageParticipantAnswer;
  }

  getViewedStockIds(stageId: string): string[] {
    const answer = this.getStockInfoAnswer(stageId);
    return answer?.viewedStockIds ?? [];
  }

  getCurrentStockIndex(stageId: string): number {
    const answer = this.getStockInfoAnswer(stageId);
    return answer?.currentStockIndex ?? 0;
  }

  updateStockInfoAnswer(
    stageId: string,
    updates: Partial<{viewedStockIds: string[]; currentStockIndex: number}>,
  ) {
    let answer = this.answerMap[stageId];
    if (!answer || answer.kind !== StageKind.STOCKINFO) {
      answer = createStockInfoStageParticipantAnswer(stageId);
    }

    if (updates.viewedStockIds !== undefined) {
      answer.viewedStockIds = updates.viewedStockIds;
    }
    if (updates.currentStockIndex !== undefined) {
      answer.currentStockIndex = updates.currentStockIndex;
    }
    this.answerMap[stageId] = answer;
  }

  updateAssetAllocation(
    stageId: string,
    allocation: AssetAllocation,
    confirmed: boolean,
  ) {
    let answer = this.answerMap[stageId];
    if (!answer || answer.kind !== StageKind.ASSET_ALLOCATION) {
      // If no answer exists, create one with the provided allocation
      answer = createAssetAllocationStageParticipantAnswer({
        id: stageId,
        allocation: allocation,
      });
    }

    answer.allocation = allocation;
    answer.confirmed = confirmed;
    this.answerMap[stageId] = answer;
  }

  /** Used in MultiAssetAllocation stage. */
  updateStockAllocation(stageId: string, allocation: StockAllocation) {
    let answer = this.answerMap[stageId];
    if (!answer || answer.kind !== StageKind.MULTI_ASSET_ALLOCATION) {
      answer = {
        id: stageId,
        kind: StageKind.MULTI_ASSET_ALLOCATION,
        allocationMap: {},
        isConfirmed: false,
        confirmedTimestamp: null,
      };
    }
    answer.allocationMap[allocation.id] = allocation;
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

  async saveFlipCardAnswers(stageId: string) {
    const answer = this.answerMap[stageId];
    if (!answer || answer.kind !== StageKind.FLIPCARD) return;
    await this.sp.participantService.updateFlipCardStageParticipantAnswer(
      stageId,
      answer,
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

  async saveAssetAllocationAnswer(stageId: string) {
    const answer = this.answerMap[stageId];
    if (!answer || answer.kind !== StageKind.ASSET_ALLOCATION) return;
    await this.sp.participantService.updateAssetAllocationStageParticipantAnswer(
      stageId,
      answer.allocation,
      answer.confirmed,
    );
  }

  async saveMultiAssetAllocationAnswer(stageId: string) {
    const answer = this.answerMap[stageId];
    if (!answer || answer.kind !== StageKind.MULTI_ASSET_ALLOCATION) return;
    await this.sp.participantService.updateMultiAssetAllocationStageParticipantAnswer(
      stageId,
      answer,
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
