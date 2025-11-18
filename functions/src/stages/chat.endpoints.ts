import {Value} from '@sinclair/typebox/value';
import {
  StageKind,
  UpdateChatStageParticipantAnswerData,
} from '@deliberation-lab/utils';
import {Timestamp} from 'firebase-admin/firestore';
import {onCall, HttpsError} from 'firebase-functions/v2/https';

import {app} from '../app';
import {getFirestoreStage} from '../utils/firestore';
import {
  checkConfigDataUnionOnPath,
  isUnionError,
  prettyPrintError,
  prettyPrintErrors,
} from '../utils/validation';

/** Create chat messages. */

// ************************************************************************* //
// createChatMessage endpoint                                                //
//                                                                           //
// Input structure: {                                                        //
//   experimentId, cohortId, stageId, participantId (private), chatMessage   //
// }                                                                         //
// Validation: utils/src/chat.validation.ts                                  //
// ************************************************************************* //

export const createChatMessage = onCall(async (request) => {
  const {data} = request;

  // Define document references
  const privateChatDocument = data.participantId
    ? app
        .firestore()
        .collection('experiments')
        .doc(data.experimentId)
        .collection('participants')
        .doc(data.participantId)
        .collection('stageData')
        .doc(data.stageId)
        .collection('privateChats')
        .doc(data.chatMessage.id)
    : null;

  const groupChatDocument = data.cohortId
    ? app
        .firestore()
        .collection('experiments')
        .doc(data.experimentId)
        .collection('cohorts')
        .doc(data.cohortId)
        .collection('publicStageData')
        .doc(data.stageId)
        .collection('chats')
        .doc(data.chatMessage.id)
    : null;

  const chatMessage = {...data.chatMessage, timestamp: Timestamp.now()};

  const stage = await getFirestoreStage(data.experimentId, data.stageId);

  if (!stage) {
    throw new HttpsError(
      'not-found',
      `Stage ${data.stageId} not found in experiment ${data.experimentId}`,
    );
  }

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    // Add chat message
    // (see chat.triggers for auto-generated agent responses)
    switch (stage.kind) {
      case StageKind.PRIVATE_CHAT:
        if (!privateChatDocument) {
          throw new HttpsError(
            'invalid-argument',
            'Participant ID is required for private chat',
          );
        }
        transaction.set(privateChatDocument, chatMessage);
        return {id: privateChatDocument.id};
      default:
        // Otherwise, write to public data
        if (!groupChatDocument) {
          throw new HttpsError(
            'invalid-argument',
            'Cohort ID is required for group chat',
          );
        }
        transaction.set(groupChatDocument, chatMessage);
        return {id: groupChatDocument.id};
    }
  });

  return {id: ''};
});

// ************************************************************************* //
// updateChatStageParticipantAnswer endpoint                                 //
//                                                                           //
// Input structure: { experimentId, cohortId, participantPrivateId,          //
//                    participantPublicId, chatStageParticipantAnswer }      //
// Validation: utils/src/stages/chat_stage.validation.ts                     //
// ************************************************************************* //

export const updateChatStageParticipantAnswer = onCall(async (request) => {
  const {data} = request;

  // Validate input
  const validInput = Value.Check(UpdateChatStageParticipantAnswerData, data);
  if (!validInput) {
    handleUpdateChatStageParticipantAnswerValidationErrors(data);
  }

  // Define document reference
  const document = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('participants')
    .doc(data.participantPrivateId)
    .collection('stageData')
    .doc(data.chatStageParticipantAnswer.id);

  // Set random timeout to avoid data contention with transaction
  await new Promise((resolve) => {
    setTimeout(resolve, Math.random() * 2000);
  });

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    transaction.set(document, data.chatStageParticipantAnswer);
  });

  return {id: document.id};
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleUpdateChatStageParticipantAnswerValidationErrors(data: any) {
  for (const error of Value.Errors(
    UpdateChatStageParticipantAnswerData,
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
