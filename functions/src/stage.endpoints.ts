import { Value } from '@sinclair/typebox/value';
import {
  ElectionStageParticipantAnswer,
  SurveyStageParticipantAnswer,
  StageKind,
  UpdateElectionStageParticipantAnswerData,
  UpdateSurveyStageParticipantAnswerData,
  getCondorcetElectionWinner,
} from '@deliberation-lab/utils';

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { onCall } from 'firebase-functions/v2/https';

import { app } from './app';
import { AuthGuard } from './utils/auth-guard';
import {
  checkConfigDataUnionOnPath,
  isUnionError,
  prettyPrintError,
  prettyPrintErrors,
} from './utils/validation';

/** Endpoints for updating stage participant answers. */

// ************************************************************************* //
// updateSurveyStageParticipantAnswer endpoint                               //
//                                                                           //
// Input structure: { experimentId, participantId,                           //
//                    surveyStageParticipantAnswer }                         //
// Validation: utils/src/stages/survey_stage.validation.ts                   //
// ************************************************************************* //

export const updateSurveyStageParticipantAnswer = onCall(async (request) => {
  const { data } = request;

  // Validate input
  const validInput = Value.Check(UpdateSurveyStageParticipantAnswerData, data);
  if (!validInput) {
    handleUpdateSurveyStageParticipantAnswerValidationErrors(data);
  }

  // Define document reference
  const document = app.firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(data.participantId)
    .collection('stageData')
    .doc(data.surveyStageParticipantAnswer.id);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    transaction.set(document, data.surveyStageParticipantAnswer);
  });

  return { id: document.id };
});

function handleUpdateSurveyStageParticipantAnswerValidationErrors(data: any) {
  for (const error of Value.Errors(UpdateSurveyStageParticipantAnswerData, data)) {
    if (isUnionError(error)) {
      const nested = checkConfigDataUnionOnPath(data, error.path);
      prettyPrintErrors(nested);
    } else {
      prettyPrintError(error);
    }
  }

  throw new functions.https.HttpsError('invalid-argument', 'Invalid data');
}

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

    // TODO: Initialize public stage data for election on cohort creation.
    // Update public stage data (current participant rankings, current winner)
    /* const publicStageData = publicDocument.get().data();
    publicStageData.participantAnswerMap[data.participantPublicId] = data.rankingList;
    publicStageData.currentWinner = getCondorcetElectionWinner(publicStageData.participantAnswerMap);
    transaction.set(publicDocument, publicStageData); */
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
