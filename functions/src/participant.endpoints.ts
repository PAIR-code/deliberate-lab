import {Timestamp} from 'firebase-admin/firestore';
import {Value} from '@sinclair/typebox/value';
import {
  ChipStagePublicData,
  CreateParticipantData,
  Experiment,
  ParticipantProfileExtended,
  ParticipantStatus,
  ProfileStageConfig,
  ProfileType,
  RoleStagePublicData,
  SeedStrategy,
  StageKind,
  SurveyStagePublicData,
  StageConfig,
  TransferStageConfig,
  createParticipantProfileExtended,
  setProfile,
  VariableScope,
} from '@deliberation-lab/utils';
import {
  updateCohortStageUnlocked,
  updateParticipantNextStage,
  handleAutomaticTransfer,
} from './participant.utils';
import {generateVariablesForScope} from './variables.utils';

import {onCall, HttpsError} from 'firebase-functions/v2/https';

import {app} from './app';
import {AuthGuard} from './utils/auth-guard';
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
// Input structure: { experimentId, cohortId, isAnonymous, agentConfig }     //
// Optional: { prolificId }                                                  //
// Validation: utils/src/participant.validation.ts                           //
// ************************************************************************* //
export const createParticipant = onCall(async (request) => {
  const {data} = request;

  // Validate input
  const validInput = Value.Check(CreateParticipantData, data);
  if (!validInput) {
    handleCreateParticipantValidationErrors(data);
  }

  // Create initial participant config
  const participantConfig = createParticipantProfileExtended({
    currentCohortId: data.cohortId,
    prolificId: data.prolificId,
  });

  // Temporarily always mark participants as connected (PR #537)
  participantConfig.connected = true; // TODO: Remove this line

  // If agent config is specified, add to participant config
  if (data.agentConfig) {
    participantConfig.agentConfig = data.agentConfig;
    participantConfig.connected = true; // agent is always connected
  }

  // Define document reference
  const document = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(participantConfig.privateId);

  // Set random timeout to avoid data contention with transaction.
  // Note: This also mitigates (but doesn't eliminate) a race condition with
  // BalancedAssignment variables. The count/query used to determine assignment
  // happens inside the transaction, but Firestore transactions only lock
  // documents that are read—not aggregation queries. Two concurrent participants
  // could see the same count and receive the same assignment. For most experiments
  // with moderate join rates, the random delay provides sufficient distribution.
  await new Promise((resolve) => {
    setTimeout(resolve, Math.random() * 2000);
  });

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    // TODO: Confirm that cohort is not at max capacity

    // Confirm that cohort is not locked
    const experiment = (
      await app.firestore().doc(`experiments/${data.experimentId}`).get()
    ).data() as Experiment;
    if (experiment.cohortLockMap[data.cohortId]) {
      // TODO: Return failure and handle accordingly on frontend
      return;
    }

    // Set participant profile fields
    const numParticipants = (
      await app
        .firestore()
        .collection(`experiments/${data.experimentId}/participants`)
        .count()
        .get()
    ).data().count;

    // Set participant profile fields
    if (data.isAnonymous) {
      // Find the profile stage to determine which anonymous profile type to use
      const stages = (
        await app
          .firestore()
          .collection(`experiments/${data.experimentId}/stages`)
          .get()
      ).docs.map((doc) => doc.data());

      const profileStage = stages.find(
        (stage) => (stage as StageConfig).kind === StageKind.PROFILE,
      ) as ProfileStageConfig | undefined;
      const profileType =
        profileStage?.profileType || ProfileType.ANONYMOUS_ANIMAL;

      setProfile(numParticipants, participantConfig, true, profileType);
    } else {
      setProfile(numParticipants, participantConfig, false);
    }

    // Set current stage ID in participant config
    participantConfig.currentStageId = experiment.stageIds[0];

    // Add variable values at the participant level
    participantConfig.variableMap = await generateVariablesForScope(
      experiment.variableConfigs ?? [],
      {
        scope: VariableScope.PARTICIPANT,
        experimentId: data.experimentId,
        cohortId: data.cohortId,
        participantId: participantConfig.privateId,
      },
    );

    // Write new participant document
    transaction.set(document, participantConfig);
  });

  return {id: document.id};
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleCreateParticipantValidationErrors(data: any) {
  for (const error of Value.Errors(CreateParticipantData, data)) {
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
// updateParticipantAcceptedTOS for participants                             //
//                                                                           //
// Input structure: { experimentId, participantId, acceptedTOS }             //
// Validation: utils/src/participant.validation.ts                           //
// ************************************************************************* //
export const updateParticipantAcceptedTOS = onCall(async (request) => {
  const {data} = request;
  const privateId = data.participantId;
  const acceptedTOS = data.acceptedTOS;

  // Define document reference
  const document = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(privateId);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const participant = (
      await document.get()
    ).data() as ParticipantProfileExtended;
    participant.timestamps.acceptedTOS = acceptedTOS;
    transaction.set(document, participant);
  });

  return {success: true};
});

// ************************************************************************* //
// updateParticipantWaiting for participants                                 //
//                                                                           //
// Input structure: { experimentId, participantId, stageId }                 //
// Validation: utils/src/participant.validation.ts                           //
// ************************************************************************* //
// The "readyStages" map tracks when the participant has
// reached each stage --> this endpoint updates whether the participant
// is ready to begin the stage. (Waiting is now determined by whether
// or not the stage is unlocked in CohortConfig)
export const updateParticipantWaiting = onCall(async (request) => {
  const {data} = request;
  const privateId = data.participantId;

  // Define document reference
  const document = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(privateId);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const participant = (
      await document.get()
    ).data() as ParticipantProfileExtended;
    participant.timestamps.readyStages[data.stageId] = Timestamp.now();

    // Unlock the given stage for this cohort if all active participants
    // have reached the stage
    await updateCohortStageUnlocked(
      data.experimentId,
      participant.currentCohortId,
      participant.currentStageId,
      participant.privateId,
    );

    transaction.set(document, participant);
  });

  return {success: true};
});

// ************************************************************************* //
// updateParticipantFailure for participants                                 //
//                                                                           //
// Input structure: { experimentId, participantId, status }                  //
// Validation: utils/src/participant.validation.ts                           //
// ************************************************************************* //
export const updateParticipantFailure = onCall(async (request) => {
  const {data} = request;
  const privateId = data.participantId;

  // Define document reference
  const document = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(privateId);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const participant = (
      await document.get()
    ).data() as ParticipantProfileExtended;
    participant.currentStatus = data.status;
    participant.timestamps.endExperiment = Timestamp.now();
    transaction.set(document, participant);
  });

  return {success: true};
});

// ************************************************************************* //
// updateParticipantProfile endpoint for participants                        //
//                                                                           //
// Input structure: { experimentId, participantId, participantProfileBase }  //
// Validation: utils/src/participant.validation.ts                           //
// ************************************************************************* //
export const updateParticipantProfile = onCall(async (request) => {
  const {data} = request;
  const privateId = data.participantId;
  const profile = data.participantProfileBase;

  // Define document reference
  const document = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(privateId);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const participant = (
      await document.get()
    ).data() as ParticipantProfileExtended;

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

  return {success: true};
});

// ************************************************************************* //
// updateParticipantToNextStage endpoint for participants                    //
//                                                                           //
// Input structure: { experimentId, participantId }                          //
// Validation: utils/src/participant.validation.ts                           //
// ************************************************************************* //
export const updateParticipantToNextStage = onCall(async (request) => {
  const {data} = request;
  const privateId = data.participantId;

  // Define document references
  const experimentDoc = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId);

  const participantDoc = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(privateId);

  let response: {currentStageId: string | null; endExperiment: boolean} = {
    currentStageId: null,
    endExperiment: false,
  };

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const experiment = (await experimentDoc.get()).data() as Experiment;
    const participant = (
      await participantDoc.get()
    ).data() as ParticipantProfileExtended;

    response = await updateParticipantNextStage(
      data.experimentId,
      participant,
      experiment.stageIds,
    );

    // Check if the next stage is a transfer stage
    const nextStageConfig = (
      await app
        .firestore()
        .collection('experiments')
        .doc(data.experimentId)
        .collection('stages')
        .doc(participant.currentStageId)
        .get()
    ).data() as StageConfig;

    if (nextStageConfig?.kind === StageKind.TRANSFER) {
      const automaticTransferResponse = await handleAutomaticTransfer(
        transaction,
        data.experimentId,
        nextStageConfig as TransferStageConfig,
        participant,
      );

      if (automaticTransferResponse) {
        response = automaticTransferResponse;
      }
    }

    transaction.set(participantDoc, participant);
  });

  return response;
});

// ************************************************************************* //
// acceptParticipantExperimentStart endpoint for participants                //
//                                                                           //
// Input structure: { experimentId, participantId }                          //
// Validation: utils/src/participant.validation.ts                           //
// ************************************************************************* //
export const acceptParticipantExperimentStart = onCall(async (request) => {
  const {data} = request;
  const privateId = data.participantId;

  // Define document reference
  const document = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(privateId);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const participant = (
      await document.get()
    ).data() as ParticipantProfileExtended;
    participant.timestamps.startExperiment = Timestamp.now();

    // Set current stage as ready to start
    const currentStageId = participant.currentStageId;
    participant.timestamps.readyStages[currentStageId] = Timestamp.now();

    // If all active participants have reached the next stage,
    // unlock that stage in CohortConfig
    await updateCohortStageUnlocked(
      data.experimentId,
      participant.currentCohortId,
      participant.currentStageId,
      participant.privateId,
    );

    transaction.set(document, participant);
  });

  return {success: true};
});

// ************************************************************************* //
// acceptParticipantCheck endpoint for participants                          //
//                                                                           //
// Input structure: { experimentId, participantId }                          //
// Validation: utils/src/participant.validation.ts                           //
// ************************************************************************* //
export const acceptParticipantCheck = onCall(async (request) => {
  const {data} = request;
  const privateId = data.participantId;

  // Define document reference
  const document = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(privateId);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const participant = (
      await document.get()
    ).data() as ParticipantProfileExtended;

    if (participant.transferCohortId) {
      participant.currentStatus = ParticipantStatus.TRANSFER_PENDING;
    } else {
      participant.currentStatus = ParticipantStatus.IN_PROGRESS;
    }

    // TODO: Handle case where participant has completed experiment
    // TODO: Reset custom message once field exists

    transaction.set(document, participant);
  });

  return {success: true};
});

// ************************************************************************* //
// acceptParticipantTransfer endpoint for participants                       //
//                                                                           //
// Input structure: { experimentId, participantId }                          //
// Validation: utils/src/participant.validation.ts                           //
// ************************************************************************* //
export const acceptParticipantTransfer = onCall(async (request) => {
  const {data} = request;
  const privateId = data.participantId;

  // Define document reference
  const document = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(privateId);

  const experimentDoc = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId);

  let response: {currentStageId: string | null; endExperiment: boolean} = {
    currentStageId: null,
    endExperiment: false,
  };

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const participant = (
      await document.get()
    ).data() as ParticipantProfileExtended;
    if (!participant.transferCohortId) {
      return {success: false};
    }

    // Update cohort ID
    // TODO: Validate cohort ID?
    const timestamp = Timestamp.now();
    participant.timestamps.cohortTransfers[participant.currentCohortId] =
      timestamp;
    participant.currentCohortId = participant.transferCohortId;
    participant.transferCohortId = null;
    participant.currentStatus = ParticipantStatus.IN_PROGRESS;

    // If participant is currently on a transfer stage,
    // proceed to the next stage
    const currentStage = (
      await app
        .firestore()
        .doc(
          `experiments/${data.experimentId}/stages/${participant.currentStageId}`,
        )
        .get()
    ).data() as StageConfig;
    if (currentStage.kind === StageKind.TRANSFER) {
      const experiment = (await experimentDoc.get()).data() as Experiment;
      response = await updateParticipantNextStage(
        data.experimentId,
        participant,
        experiment.stageIds,
      );
    }

    // Set document
    transaction.set(document, participant);

    // Migrate shared cohort data
    const publicId = participant.publicId;
    const stageData = await app
      .firestore()
      .collection(
        `experiments/${data.experimentId}/participants/${privateId}/stageData`,
      )
      .get();

    const stageAnswers = stageData.docs.map((stage) => stage.data());
    // For each relevant answer, add to current cohort's public stage data
    for (const stage of stageAnswers) {
      const publicDocument = app
        .firestore()
        .collection('experiments')
        .doc(data.experimentId)
        .collection('cohorts')
        .doc(participant.currentCohortId)
        .collection('publicStageData')
        .doc(stage.id);

      switch (stage.kind) {
        case StageKind.SURVEY:
          const publicSurveyData = (
            await publicDocument.get()
          ).data() as SurveyStagePublicData;
          publicSurveyData.participantAnswerMap[publicId] = stage.answerMap;
          transaction.set(publicDocument, publicSurveyData);
          break;
        case StageKind.CHIP:
          const publicChipData = (
            await publicDocument.get()
          ).data() as ChipStagePublicData;
          publicChipData.participantChipMap[publicId] = stage.chipMap;
          publicChipData.participantChipValueMap[publicId] = stage.chipValueMap;
          transaction.set(publicDocument, publicChipData);
          break;
        case StageKind.ROLE:
          const publicRoleData = (
            await publicDocument.get()
          ).data() as RoleStagePublicData;
          // TODO: Assign new role to participant (or move role over)
          transaction.set(publicDocument, publicRoleData);
          break;
        default:
          break;
      }
    }
    return {success: true};
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

  const {data} = request;
  const privateId = data.participantId;

  // Define document reference
  const document = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(privateId);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const participant = (
      await document.get()
    ).data() as ParticipantProfileExtended;
    participant.currentStatus = data.status;
    // TODO: Set custom message once field is available
    transaction.set(document, participant);
  });

  return {success: true};
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

  const {data} = request;
  const privateId = data.participantId;

  // Define document reference
  const document = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(privateId);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const participant = (
      await document.get()
    ).data() as ParticipantProfileExtended;

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

  return {success: true};
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

  const {data} = request;
  const privateId = data.participantId;

  // Define document reference
  const document = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(privateId);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const participant = (
      await document.get()
    ).data() as ParticipantProfileExtended;
    // TODO: Validate transfer cohort ID?
    participant.transferCohortId = data.cohortId;
    participant.currentStatus = ParticipantStatus.TRANSFER_PENDING;
    transaction.set(document, participant);
  });

  return {success: true};
});

// ************************************************************************* //
// updateParticipantStatus endpoint for experimenters                        //
//                                                                           //
// Input structure: { experimentId, participantId, status }                  //
// Validation: utils/src/participant.validation.ts                           //
// ************************************************************************* //
export const updateParticipantStatus = onCall(async (request) => {
  // TODO: Only allow creator, admins, and readers to manage transfers
  await AuthGuard.isExperimenter(request);

  const {data} = request;

  // Define document reference
  const document = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(data.participantId);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const participant = (
      await document.get()
    ).data() as ParticipantProfileExtended;

    participant.currentStatus = data.status;
    transaction.set(document, participant);
  });

  return {success: true};
});
