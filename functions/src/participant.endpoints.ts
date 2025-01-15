import { Timestamp } from 'firebase-admin/firestore';
import { Value } from '@sinclair/typebox/value';
import {
  ChipStagePublicData,
  CreateParticipantData,
  Experiment,
  ParticipantProfileExtended,
  ParticipantProfileExtendedData,
  ParticipantStatus,
  StageKind,
  SurveyStagePublicData,
  createParticipantProfileExtended,
  generateParticipantPublicId,
  setProfile,
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

/** Create, update, and delete participants. */

// ************************************************************************* //
// createParticipant endpoint                                                //
//                                                                           //
// Input structure: { experimentId, cohortId, isAnonymous }                  //
// Validation: utils/src/participant.validation.ts                           //
// ************************************************************************* //
export const createParticipant = onCall(async (request) => {
  const { data } = request;

  // Validate input
  const validInput = Value.Check(CreateParticipantData, data);
  if (!validInput) {
    handleCreateParticipantValidationErrors(data);
  }

  // TODO: Confirm that cohort is not locked or at max capacity

  // Create initial participant config
  const participantConfig = createParticipantProfileExtended({
    currentCohortId: data.cohortId,
    prolificId: data.prolificId,
  });

  // Define document reference
  const document = app.firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(participantConfig.privateId);

  // Set random timeout to avoid data contention with transaction
  await new Promise((resolve) => {
    setTimeout(resolve, Math.random() * 2000);
  });

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    // Set participant profile fields
    const numParticipants = (
      await app
      .firestore()
      .collection(`experiments/${data.experimentId}/participants`)
      .count().get())
    .data().count;

    setProfile(numParticipants, participantConfig, data.isAnonymous);

    // Set current stage ID in participant config
    const experiment = (
      await app.firestore().doc(`experiments/${data.experimentId}`).get()
    ).data() as Experiment;

    participantConfig.currentStageId = experiment.stageIds[0];

    // Write new participant document
    transaction.set(document, participantConfig);
  });

  return { id: document.id };
});

function handleCreateParticipantValidationErrors(data: any) {
  for (const error of Value.Errors(CreateParticipantData, data)) {
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
// updateParticipantAcceptedTOS for participants                             //
//                                                                           //
// Input structure: { experimentId, participantId, acceptedTOS }             //
// Validation: utils/src/participant.validation.ts                           //
// ************************************************************************* //
export const updateParticipantAcceptedTOS = onCall(async (request) => {
  const { data } = request;
  const privateId = data.participantId;
  const acceptedTOS = data.acceptedTOS;

  // Define document reference
  const document = app.firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(privateId);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const participant = (await document.get()).data() as ParticipantProfileExtended;
    participant.timestamps.acceptedTOS = acceptedTOS;
    transaction.set(document, participant);
  });

  return { success: true };
});

// ************************************************************************* //
// updateParticipantWaiting for participants                                 //
//                                                                           //
// Input structure: { experimentId, participantId, stageId }                 //
// Validation: utils/src/participant.validation.ts                           //
// ************************************************************************* //
export const updateParticipantWaiting = onCall(async (request) => {
  const { data } = request;
  const privateId = data.participantId;

  // Define document reference
  const document = app.firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(privateId);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const participant = (await document.get()).data() as ParticipantProfileExtended;
    participant.timestamps.completedWaiting[data.stageId] = Timestamp.now();
    transaction.set(document, participant);
  });

  return { success: true };
});

// ************************************************************************* //
// updateParticipantFailure for participants                                 //
//                                                                           //
// Input structure: { experimentId, participantId, status }                  //
// Validation: utils/src/participant.validation.ts                           //
// ************************************************************************* //
export const updateParticipantFailure = onCall(async (request) => {
  const { data } = request;
  const privateId = data.participantId;

  // Define document reference
  const document = app.firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(privateId);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const participant = (await document.get()).data() as ParticipantProfileExtended;
    participant.currentStatus = data.status;
    participant.timestamps.endExperiment = Timestamp.now();
    transaction.set(document, participant);
  });

  return { success: true };
});

// ************************************************************************* //
// updateParticipantProfile endpoint for participants                        //
//                                                                           //
// Input structure: { experimentId, participantId, participantProfileBase }  //
// Validation: utils/src/participant.validation.ts                           //
// ************************************************************************* //
export const updateParticipantProfile = onCall(async (request) => {
  const { data } = request;
  const privateId = data.participantId;
  const profile = data.participantProfileBase;

  // Define document reference
  const document = app.firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(privateId);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const participant = (await document.get()).data() as ParticipantProfileExtended;

    if (profile.name) {
      participant.name = profile.name;
    }
    if (profile.avatar) {
      participant.avatar = profile.avatar;
    }
    if (profile.pronouns) {
      participant.pronouns = profile.pronouns;
    }

    transaction.set(document, participant);
  });

  return { success: true };
});

// ************************************************************************* //
// updateParticipantToNextStage endpoint for participants                    //
//                                                                           //
// Input structure: { experimentId, participantId }                          //
// Validation: utils/src/participant.validation.ts                           //
// ************************************************************************* //
export const updateParticipantToNextStage = onCall(async (request) => {
  const { data } = request;
  const privateId = data.participantId;

  // Define document references
  const experimentDoc = app.firestore()
    .collection('experiments')
    .doc(data.experimentId);

  const participantDoc = app.firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(privateId);

  // Function to find next stage ID given experiment list of stage IDs
  const getNextStageId = (stageId: string, stageIds: string[]) => {
    const currentIndex = stageIds.indexOf(stageId);
    if (currentIndex >= 0 && currentIndex < stageIds.length - 1) {
      return stageIds[currentIndex + 1];
    }
    return null;
  };

  let response = { currentStageId: null, endExperiment: false };

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const experiment = (await experimentDoc.get()).data() as Experiment;
    const participant = (await participantDoc.get()).data() as ParticipantProfileExtended;

    response = updateParticipantNextStage(participant, experiment.stageIds);
    transaction.set(participantDoc, participant);
  });

  return response;
});

function updateParticipantNextStage(
  participant: ParticipantProfileExtended, stageIds: string[]
) {
  let response = { currentStageId: null, endExperiment: false };

  const currentStageId = participant.currentStageId;
  const currentStageIndex = stageIds.indexOf(currentStageId);

  // Mark current stage as completed
  const timestamp = Timestamp.now();
  participant.timestamps.completedStages[currentStageId] = timestamp;

  // If at end of experiment
  if (currentStageIndex + 1 === stageIds.length) {
    // Update end of experiment fields
    participant.timestamps.endExperiment = timestamp;
    participant.currentStatus = ParticipantStatus.SUCCESS;
    response.endExperiment = true;
  } else {
    // Else, progress to next stage
    const nextStageId = stageIds[currentStageIndex + 1];
    participant.currentStageId = nextStageId;
    response.currentStageId = nextStageId;
  }

  return response;
}

// ************************************************************************* //
// acceptParticipantExperimentStart endpoint for participants                //
//                                                                           //
// Input structure: { experimentId, participantId }                          //
// Validation: utils/src/participant.validation.ts                           //
// ************************************************************************* //
export const acceptParticipantExperimentStart = onCall(async (request) => {
  const { data } = request;
  const privateId = data.participantId;

  // Define document reference
  const document = app.firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(privateId);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const participant = (await document.get()).data() as ParticipantProfileExtended;
    participant.timestamps.startExperiment = Timestamp.now();
    transaction.set(document, participant);
  });

  return { success: true };
});

// ************************************************************************* //
// acceptParticipantCheck endpoint for participants                          //
//                                                                           //
// Input structure: { experimentId, participantId }                          //
// Validation: utils/src/participant.validation.ts                           //
// ************************************************************************* //
export const acceptParticipantCheck = onCall(async (request) => {
  const { data } = request;
  const privateId = data.participantId;

  // Define document reference
  const document = app.firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(privateId);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const participant = (await document.get()).data() as ParticipantProfileExtended;

    if (participant.transferCohortId) {
      participant.currentStatus = ParticipantStatus.TRANSFER_PENDING;
    } else {
      participant.currentStatus = ParticipantStatus.IN_PROGRESS;
    }

    // TODO: Reset custom message once field exists

    transaction.set(document, participant);
  });

  return { success: true };
});

// ************************************************************************* //
// acceptParticipantTransfer endpoint for participants                       //
//                                                                           //
// Input structure: { experimentId, participantId }                          //
// Validation: utils/src/participant.validation.ts                           //
// ************************************************************************* //
export const acceptParticipantTransfer = onCall(async (request) => {
  const { data } = request;
  const privateId = data.participantId;

  // Define document reference
  const document = app.firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(privateId);

  const experimentDoc = app.firestore()
    .collection('experiments')
    .doc(data.experimentId);

  let response = { currentStageId: null, endExperiment: false };

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const participant = (await document.get()).data() as ParticipantProfileExtended;
    if (!participant.transferCohortId) {
      success = false;
      return;
    }

    // Update cohort ID
    // TODO: Validate cohort ID?
    const timestamp = Timestamp.now();
    participant.timestamps.cohortTransfers[participant.currentCohortId] = timestamp;
    participant.currentCohortId = participant.transferCohortId;
    participant.transferCohortId = null;
    participant.currentStatus = ParticipantStatus.IN_PROGRESS;

    // If participant is currently on a transfer stage,
    // proceed to the next stage
    const currentStage = (await app.firestore().doc(`experiments/${data.experimentId}/stages/${participant.currentStageId}`).get()).data() as StageConfig;
    if (currentStage.kind === StageKind.TRANSFER) {
      const experiment = (await experimentDoc.get()).data() as Experiment;
      response = updateParticipantNextStage(participant, experiment.stageIds);
    }

    // Set document
    transaction.set(document, participant);

    // Migrate shared cohort data
    const publicId = participant.publicId;
    const stageData =
      await app.firestore().collection(`experiments/${data.experimentId}/participants/${privateId}/stageData`)
      .get();

    const stageAnswers = stageData.docs.map(stage => stage.data());
    // For each relevant answer, add to current cohort's public stage data
    for (const stage of stageAnswers) {
      const publicDocument = app.firestore()
        .collection('experiments')
        .doc(data.experimentId)
        .collection('cohorts')
        .doc(participant.currentCohortId)
        .collection('publicStageData')
        .doc(stage.id);

      switch (stage.kind) {
        case StageKind.SURVEY:
          const publicSurveyData = (await publicDocument.get()).data() as SurveyStagePublicData;
          publicSurveyData.participantAnswerMap[publicId] = stage.answerMap;
          transaction.set(publicDocument, publicSurveyData);
          break;
        case StageKind.CHIP:
          const publicChipData = (await publicDocument.get()).data() as ChipStagePublicData;
          publicChipData.participantChipMap[publicId] = stage.chipMap;
          publicChipData.participantChipValueMap[publicId] = stage.chipValueMap;
          transaction.set(publicDocument, publicChipData);
          break;
        default:
          break;
      }
    }
  });

  return response;
});

// ************************************************************************* //
// sendParticipantCheck endpoint for experimenters                           //
//                                                                           //
// Input structure: { experimentId, participantId, status, customMessage }   //
// Validation: utils/src/participant.validation.ts                           //
// ************************************************************************* //
export const sendParticipantCheck = onCall(async (request) => {
  // TODO: Only allow creator, admins, and readers to manage transfers
  await AuthGuard.isExperimenter(request);

  const { data } = request;
  const privateId = data.participantId;

  // Define document reference
  const document = app.firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(privateId);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const participant = (await document.get()).data() as ParticipantProfileExtended;
    participant.currentStatus = data.status;
    // TODO: Set custom message once field is available
    transaction.set(document, participant);
  });

  return { success: true };
});

// ************************************************************************* //
// bootParticipant endpoint for experimenters                                //
//                                                                           //
// Input structure: { experimentId, participantId }                          //
// Validation: utils/src/participant.validation.ts                           //
// ************************************************************************* //
export const bootParticipant = onCall(async (request) => {
  // TODO: Only allow creator, admins, and readers to manage transfers
  await AuthGuard.isExperimenter(request);

  const { data } = request;
  const privateId = data.participantId;

  // Define document reference
  const document = app.firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(privateId);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const participant = (await document.get()).data() as ParticipantProfileExtended;

    if (participant.currentStatus === ParticipantStatus.ATTENTION_CHECK) {
      participant.currentStatus = ParticipantStatus.ATTENTION_TIMEOUT;
    } else {
      participant.currentStatus = ParticipantStatus.BOOTED_OUT;
    }

    participant.timestamps.endExperiment = Timestamp.now();
    transaction.set(document, participant);
  });

  // TODO: If currently participating in chip stage,
  // handle accordingly.

  return { success: true };
});

// ************************************************************************* //
// initiateParticipantTransfer endpoint for experimenters                    //
//                                                                           //
// Input structure: { experimentId, cohortId, participantId }                //
// Validation: utils/src/participant.validation.ts                           //
// ************************************************************************* //
export const initiateParticipantTransfer = onCall(async (request) => {
  // TODO: Only allow creator, admins, and readers to manage transfers
  await AuthGuard.isExperimenter(request);

  const { data } = request;
  const privateId = data.participantId;

  // Define document reference
  const document = app.firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(privateId);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const participant = (await document.get()).data() as ParticipantProfileExtended;
    // TODO: Validate transfer cohort ID?
    participant.transferCohortId = data.cohortId;
    participant.currentStatus = ParticipantStatus.TRANSFER_PENDING;
    transaction.set(document, participant);
  });

  return { success: true };
});