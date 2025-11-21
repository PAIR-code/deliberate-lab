import {Value} from '@sinclair/typebox/value';
import {
  UpdateSurveyPerParticipantStageParticipantAnswerData,
  UpdateSurveyStageParticipantAnswerData,
} from '@deliberation-lab/utils';

import {onCall, HttpsError} from 'firebase-functions/v2/https';

import {app} from '../app';
import {
  checkConfigDataUnionOnPath,
  isUnionError,
  prettyPrintError,
  prettyPrintErrors,
} from '../utils/validation';

/** Endpoints for updating survey stage participant answers. */

// ************************************************************************* //
// updateSurveyStageParticipantAnswer endpoint                               //
//                                                                           //
// Input structure: { experimentId, cohortId, participantPrivateId,          //
//                    participantPublicId, surveyStageParticipantAnswer }    //
// Validation: utils/src/stages/survey_stage.validation.ts                   //
// ************************************************************************* //

export const updateSurveyStageParticipantAnswer = onCall(async (request) => {
  const {data} = request;

  // Validate input
  const validInput = Value.Check(UpdateSurveyStageParticipantAnswerData, data);
  if (!validInput) {
    handleUpdateSurveyStageParticipantAnswerValidationErrors(data);
  }

  // Define document reference
  const document = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(data.participantPrivateId)
    .collection('stageData')
    .doc(data.surveyStageParticipantAnswer.id);

  // Define public stage document reference
  const publicDocument = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('cohorts')
    .doc(data.cohortId)
    .collection('publicStageData')
    .doc(data.surveyStageParticipantAnswer.id);

  const participantAnswerMap = {
    [data.participantPublicId]: data.surveyStageParticipantAnswer.answerMap,
  };

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    transaction.set(document, data.surveyStageParticipantAnswer);
  });

  return {id: document.id};
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleUpdateSurveyStageParticipantAnswerValidationErrors(data: any) {
  for (const error of Value.Errors(
    UpdateSurveyStageParticipantAnswerData,
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

// ************************************************************************* //
// updateSurveyPerParticipantStageParticipantAnswer endpoint                 //
//                                                                           //
// Input structure: { experimentId, participantPrivateId,                    //
//                    surveyPerParticipantStageParticipantAnswer }           //

// Validation: utils/src/stages/survey_stage.validation.ts                   //
// ************************************************************************* //

export const updateSurveyPerParticipantStageParticipantAnswer = onCall(
  async (request) => {
    const {data} = request;

    // Validate input
    const validInput = Value.Check(
      UpdateSurveyPerParticipantStageParticipantAnswerData,
      data,
    );
    if (!validInput) {
      handleUpdateSurveyPerParticipantStageParticipantAnswerValidationErrors(
        data,
      );
    }

    // Define document reference
    const document = app
      .firestore()
      .collection('experiments')
      .doc(data.experimentId)
      .collection('participants')
      .doc(data.participantPrivateId)
      .collection('stageData')
      .doc(data.surveyPerParticipantStageParticipantAnswer.id);

    // Run document write as transaction to ensure consistency
    await app.firestore().runTransaction(async (transaction) => {
      transaction.set(
        document,
        data.surveyPerParticipantStageParticipantAnswer,
      );
    });

    return {id: document.id};
  },
);

function handleUpdateSurveyPerParticipantStageParticipantAnswerValidationErrors(
  data: any, // eslint-disable-line @typescript-eslint/no-explicit-any
) {
  for (const error of Value.Errors(
    UpdateSurveyPerParticipantStageParticipantAnswerData,
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
