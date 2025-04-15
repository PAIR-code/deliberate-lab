import {
  Experiment,
  ParticipantProfileExtended,
  RankingStageParticipantAnswer,
  StageConfig,
  StageKind,
  getChatStagePromptContext,
  getInfoStagePromptContext,
  getRankingStagePromptContext,
  getSurveyStagePromptContext,
  getTOSStagePromptContext,
} from '@deliberation-lab/utils';
import {getChatMessages} from './chat.utils';
import {app} from '../app';

/** Assemble context from past stages for prompt. */
export async function getPastStagesPromptContext(
  experimentId: string,
  stageId: string, // current stage
  participantPrivateId: string,
  includeStageInfo: boolean,
) {
  const experiment = (
    await app.firestore().collection('experiments').doc(experimentId).get()
  ).data() as Experiment;
  const stageIds = experiment.stageIds;
  // Only consider stages leading up to current stage
  const pastStageIds = stageIds.slice(
    0,
    stageIds.findIndex((id) => id === stageId),
  );

  const context: string[] = [];
  for (const stageId of pastStageIds) {
    const stageContext = await getStagePromptContext(
      experimentId,
      stageId,
      participantPrivateId,
      includeStageInfo,
    );
    if (stageContext.length > 0) {
      context.push(stageContext);
    }
  }

  return context.join('\n');
}

/** Assemble context from given stage. */
export async function getStagePromptContext(
  experimentId,
  stageId,
  participantPrivateId: string,
  includeStageInfo: boolean,
) {
  const stageConfig = (
    await app
      .firestore()
      .collection('experiments')
      .doc(experimentId)
      .collection('stages')
      .doc(stageId)
      .get()
  ).data() as StageConfig;
  const participant = (
    await app
      .firestore()
      .collection('experiments')
      .doc(experimentId)
      .collection('participants')
      .doc(participantPrivateId)
      .get()
  ).data() as ParticipantProfileExtended;
  const answerData = await app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('participants')
    .doc(participantPrivateId)
    .collection('stageData')
    .doc(stageId)
    .get();

  switch (stageConfig.kind) {
    case StageKind.INFO:
      return getInfoStagePromptContext(stageConfig, includeStageInfo);
    case StageKind.TOS:
      return getTOSStagePromptContext(stageConfig, includeStageInfo);
    case StageKind.RANKING:
      const rankingList = answerData.exists
        ? (answerData.data() as RankingStageParticipantAnswer).rankingList
        : [];
      return getRankingStagePromptContext(
        stageConfig,
        includeStageInfo,
        rankingList,
      );
    case StageKind.SURVEY:
      const surveyAnswerMap = answerData.exists
        ? (answerData.data() as SurveyStageParticipantAnswer).answerMap
        : {};
      return getSurveyStagePromptContext(
        stageConfig,
        includeStageInfo,
        stageConfig.questions,
        surveyAnswerMap,
      );
    case StageKind.CHAT:
      // TODO: Use cohort at time participant was in stage,
      // NOT participant's current cohort
      const chatMessages = getChatMessages(
        experimentId,
        participant.currentCohortId,
        stageId,
      );
      return getChatStagePromptContext(
        chatMessages,
        stageConfig,
        includeStageInfo,
      );
    default:
      return '';
  }
}
