import {Value} from '@sinclair/typebox/value';
import {
  UpdateAssetAllocationStageParticipantAnswerData,
  createAssetAllocationStageParticipantAnswer,
} from '@deliberation-lab/utils';

import * as admin from 'firebase-admin';
import {onCall, HttpsError} from 'firebase-functions/v2/https';

import {app} from '../app';
import {
  checkConfigDataUnionOnPath,
  isUnionError,
  prettyPrintError,
  prettyPrintErrors,
} from '../utils/validation';
import {getFirestoreParticipantAnswerRef} from '../utils/firestore';

/** Endpoints for AssetAllocation stage operations. */

// ************************************************************************* //
// updateAssetAllocationStageParticipantAnswer endpoint                      //
//                                                                           //
// Updates participant's AssetAllocation answer (public data updated by      //
// trigger)                                                                  //
// Input structure: { experimentId, cohortId, participantPrivateId,          //
//                    stageId, allocation, confirmed }                       //
// Validation: utils/src/stages/asset_allocation_stage.validation.ts         //
// ************************************************************************* //

export const updateAssetAllocationStageParticipantAnswer = onCall(
  async (request) => {
    const {data} = request;

    // Validate input
    const validInput = Value.Check(
      UpdateAssetAllocationStageParticipantAnswerData,
      data,
    );
    if (!validInput) {
      handleUpdateAssetAllocationStageParticipantAnswerValidationErrors(data);
    }

    // Create participant answer from the input data
    const participantAnswer = createAssetAllocationStageParticipantAnswer({
      id: data.stageId,
      allocation: data.allocation,
      confirmed: data.confirmed,
      timestamp: admin.firestore.Timestamp.now(),
    });

    // Define participant answer document reference
    const participantDocument = app
      .firestore()
      .collection('experiments')
      .doc(data.experimentId)
      .collection('participants')
      .doc(data.participantPrivateId)
      .collection('stageData')
      .doc(data.stageId);

    // Update participant answer only (public data will be updated by trigger)
    await app.firestore().runTransaction(async (transaction) => {
      transaction.set(participantDocument, participantAnswer);
    });

    return {success: true, id: data.stageId};
  },
);

/* eslint-disable @typescript-eslint/no-explicit-any */
function handleUpdateAssetAllocationStageParticipantAnswerValidationErrors(
  data: any,
) {
  for (const error of Value.Errors(
    UpdateAssetAllocationStageParticipantAnswerData,
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
/* eslint-enable @typescript-eslint/no-explicit-any */

// ************************************************************************* //
// updateMultiAssetAllocationStageParticipantAnswer endpoint                 //
//                                                                           //
// Updates participant's MultiAssetAllocation answer (public data updated by //
// trigger)                                                                  //
// Input structure: { experimentId, cohortId, participantPrivateId, answer } //
// Validation: utils/src/stages/asset_allocation_stage.validation.ts         //
// ************************************************************************* //

export const updateMultiAssetAllocationStageParticipantAnswer = onCall(
  async (request) => {
    const {data} = request;

    // Define participant answer document reference
    const participantDocument = getFirestoreParticipantAnswerRef(
      data.experimentId,
      data.participantPrivateId,
      data.stageId,
    );

    // Update participant answer only (public data will be updated by trigger)
    await app.firestore().runTransaction(async (transaction) => {
      transaction.set(participantDocument, data.answer);
    });

    return {success: true, id: data.stageId};
  },
);
