import { Value } from '@sinclair/typebox/value';
import {
  SurveyStageParticipantAnswer,
  UpdateSurveyStageParticipantAnswerData
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
// Validation: utils/src/stage.validation.ts                                 //
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