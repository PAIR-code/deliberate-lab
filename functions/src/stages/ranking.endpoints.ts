import {Value} from '@sinclair/typebox/value';
import {
  RankingStageParticipantAnswer,
  StageKind,
  UpdateRankingStageParticipantAnswerData,
} from '@deliberation-lab/utils';

import {onCall, HttpsError} from 'firebase-functions/v2/https';

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

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    // Update answer
    transaction.set(document, answer);
  });

  return {id: document.id};
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  throw new HttpsError('invalid-argument', 'Invalid data');
}
