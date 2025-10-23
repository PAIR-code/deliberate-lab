import {
  ParticipantProfileExtended,
  RankingStageConfig,
  RankingStageParticipantAnswer,
  RankingStagePublicData,
  RankingType,
  StageKind,
  SurveyStagePublicData,
  filterRankingsByCandidates,
  getCondorcetElectionWinner,
  getRankingCandidatesFromWTL,
  LAS_WTL_STAGE_ID,
} from '@deliberation-lab/utils';
import {getFirestoreActiveParticipants} from '../utils/firestore';

import {app} from '../app';

/** Update ranking stage public data to include participant private data. */
export async function addParticipantAnswerToRankingStagePublicData(
  experimentId: string,
  stage: RankingStageConfig,
  participant: ParticipantProfileExtended,
  answer: RankingStageParticipantAnswer,
) {
  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const publicDocument = app
      .firestore()
      .collection('experiments')
      .doc(experimentId)
      .collection('cohorts')
      .doc(participant.currentCohortId)
      .collection('publicStageData')
      .doc(stage.id);

    // For hardcoded WTL stage in LAS game only
    const wtlDoc = app
      .firestore()
      .collection('experiments')
      .doc(experimentId)
      .collection('cohorts')
      .doc(participant.currentCohortId)
      .collection('publicStageData')
      .doc(LAS_WTL_STAGE_ID);
    // Update public stage data (current participant rankings, current winner)
    const publicStageData = (
      await publicDocument.get()
    ).data() as RankingStagePublicData;
    publicStageData.participantAnswerMap[participant.publicId] =
      answer.rankingList;

    // Calculate rankings
    let participantAnswerMap = publicStageData.participantAnswerMap;

    // If experiment has hardcoded WTL stage (for LAS game), use the WTL
    // stage/question IDs to only consider top ranking participants
    const wtlResponse = await wtlDoc.get();
    if (wtlResponse.exists) {
      const wtlData = wtlResponse.data() as SurveyStagePublicData;

      if (wtlData?.kind === StageKind.SURVEY) {
        const candidateList = getRankingCandidatesFromWTL(wtlData);
        participantAnswerMap = filterRankingsByCandidates(
          participantAnswerMap,
          candidateList,
        );
      }
    }

    // Calculate winner (not used in frontend if strategy is none)
    publicStageData.winnerId = getCondorcetElectionWinner(participantAnswerMap);

    transaction.set(publicDocument, publicStageData);
  });
}

/** Get list of participants to rank in ranking stage. */
export async function getParticipantsToRankInRankingStage(
  experimentId: string,
  cohortId: string,
  stage: rankingStageConfig,
  participantId: string, // current participant's public ID
): Promise<ParticipantProfileExtended[]> {
  if (stage.rankingType !== RankingType.PARTICIPANTS) {
    return [];
  }
  const participants = await getFirestoreActiveParticipants(
    experimentId,
    cohortId,
  );
  if (stage.enableSelfVoting) {
    return participants;
  }
  return participants.filter(
    (participant) => participant.publicId !== participantId,
  );
}
