import { Value } from '@sinclair/typebox/value';
import {
  ElectionStageParticipantAnswer,
  StageKind,
  ElectionStagePublicData,
  UpdateElectionStageParticipantAnswerData,
  getCondorcetElectionWinner,
} from '@deliberation-lab/utils';

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { onCall } from 'firebase-functions/v2/https';

import { app } from '../app';
import {
  checkConfigDataUnionOnPath,
  isUnionError,
  prettyPrintError,
  prettyPrintErrors,
} from '../utils/validation';

/** Endpoints for updating election stage participant answers. */

// ************************************************************************* //
// updateElectionStageParticipantAnswer endpoint                             //
//                                                                           //
// Input structure: { experimentId, cohortId, participantPublicId,           //
//                    participantPrivateId, stageId, rankingList }           //
// Validation: utils/src/stages/election_stage.validation.ts                 //
// ************************************************************************* //
export const updateElectionStageParticipantAnswer = onCall(async (request) => {
  const { data } = request;

  // Validate input
  const validInput = Value.Check(UpdateElectionStageParticipantAnswerData, data);
  if (!validInput) {
    handleUpdateElectionStageParticipantAnswerValidationErrors(data);
  }

  const answer: ElectionStageParticipantAnswer = {
    id: data.stageId,
    kind: StageKind.ELECTION,
    rankingList: data.rankingList,
  };

  // Define document reference
  const document = app.firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(data.participantPrivateId)
    .collection('stageData')
    .doc(data.stageId);

  const publicDocument = app.firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('cohorts')
    .doc(data.cohortId)
    .collection('publicStageData')
    .doc(data.stageId);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    // Update answer
    transaction.set(document, answer);

    // Update public stage data (current participant rankings, current winner)
    const publicStageData = (await publicDocument.get()).data() as ElectionStagePublicData;
    publicStageData.participantAnswerMap[data.participantPublicId] = data.rankingList;
    publicStageData.currentWinner = getCondorcetElectionWinner(publicStageData.participantAnswerMap);
    publicStageData.electionItems = data.electionItems;
    transaction.set(publicDocument, publicStageData);
  });

  return { id: document.id };
});

function handleUpdateElectionStageParticipantAnswerValidationErrors(data: any) {
  for (const error of Value.Errors(UpdateElectionStageParticipantAnswerData, data)) {
    if (isUnionError(error)) {
      const nested = checkConfigDataUnionOnPath(data, error.path);
      prettyPrintErrors(nested);
    } else {
      prettyPrintError(error);
    }
  }

  throw new functions.https.HttpsError('invalid-argument', 'Invalid data');
}
