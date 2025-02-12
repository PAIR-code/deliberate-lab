import {Value} from '@sinclair/typebox/value';
import {
  RankingStageParticipantAnswer,
  RankingStagePublicData,
  StageKind,
  SurveyStagePublicData,
  UpdateRankingStageParticipantAnswerData,
  filterRankingsByCandidates,
  getCondorcetElectionWinner,
  getRankingCandidatesFromWTL,
  LAS_WTL_STAGE_ID,
  ElectionStrategy,
} from '@deliberation-lab/utils';

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {onCall} from 'firebase-functions/v2/https';

import {app} from '../app';
import {
  checkConfigDataUnionOnPath,
  isUnionError,
  prettyPrintError,
  prettyPrintErrors,
} from '../utils/validation';

/** Endpoints for updating ranking stage participant answers. */

// ************************************************************************* //
// updateRankingStageParticipantAnswer endpoint                             //
//                                                                           //
// Input structure: { experimentId, cohortId, participantPublicId,           //
//                    participantPrivateId, stageId, rankingList }           //
// Validation: utils/src/stages/ranking_stage.validation.ts                 //
// ************************************************************************* //
export const updateRankingStageParticipantAnswer = onCall(async (request) => {
  const {data} = request;

  // Validate input
  const validInput = Value.Check(UpdateRankingStageParticipantAnswerData, data);
  if (!validInput) {
    handleUpdateRankingStageParticipantAnswerValidationErrors(data);
  }

  const answer: RankingStageParticipantAnswer = {
    id: data.stageId,
    kind: StageKind.RANKING,
    rankingList: data.rankingList,
  };

  // Define document reference
  const document = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(data.participantPrivateId)
    .collection('stageData')
    .doc(data.stageId);

  const publicDocument = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('cohorts')
    .doc(data.cohortId)
    .collection('publicStageData')
    .doc(data.stageId);

  const wtlDoc = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('cohorts')
    .doc(data.cohortId)
    .collection('publicStageData')
    .doc(LAS_WTL_STAGE_ID);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    // Update answer
    transaction.set(document, answer);

    // Update public stage data (current participant rankings, current winner)
    const publicStageData = (
      await publicDocument.get()
    ).data() as RankingStagePublicData;
    publicStageData.participantAnswerMap[data.participantPublicId] =
      data.rankingList;

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

  return {id: document.id};
});

function handleUpdateRankingStageParticipantAnswerValidationErrors(data: any) {
  for (const error of Value.Errors(
    UpdateRankingStageParticipantAnswerData,
    data,
  )) {
    if (isUnionError(error)) {
      const nested = checkConfigDataUnionOnPath(data, error.path);
      prettyPrintErrors(nested);
    } else {
      prettyPrintError(error);
    }
  }

  throw new functions.https.HttpsError('invalid-argument', 'Invalid data');
}
