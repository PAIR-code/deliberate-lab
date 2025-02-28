import {Value} from '@sinclair/typebox/value';
import {
  ChatStageConfig,
  ChatStageParticipantAnswer,
  CreateChatMessageData,
  StageConfig,
  StageKind,
  UpdateChatStageParticipantAnswerData,
} from '@deliberation-lab/utils';
import {updateCurrentDiscussionIndex} from './chat.utils';

import * as admin from 'firebase-admin';
import {Timestamp} from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import {onCall} from 'firebase-functions/v2/https';

import {app} from '../app';
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
//   experimentId, cohortId, stageId, chatMessage                            //
// }                                                                         //
// Validation: utils/src/chat.validation.ts                                  //
// ************************************************************************* //

export const createChatMessage = onCall(async (request) => {
  const {data} = request;

  // Define document reference
  const document = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('cohorts')
    .doc(data.cohortId)
    .collection('publicStageData')
    .doc(data.stageId)
    .collection('chats')
    .doc(data.chatMessage.id);

  const chatMessage = {...data.chatMessage, timestamp: Timestamp.now()};

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    // Add chat message
    // (see chat.triggers for auto-generated agent responses)
    transaction.set(document, chatMessage);
  });

  return {id: document.id};
});

// ************************************************************************* //
// updateChatAgents endpoint                                              //
//                                                                           //
// Input structure: { experimentId, stageId, agentList }                  //
// Validation: utils/src/stages/chat_stage.validation.ts                     //
// ************************************************************************* //

export const updateChatAgents = onCall(async (request) => {
  const {data} = request;

  const document = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('stages')
    .doc(data.stageId);

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    const stageConfig = (await document.get()).data() as StageConfig;
    if (!stageConfig || stageConfig.kind !== StageKind.CHAT) return {};

    stageConfig.agents = data.agentList;
    transaction.set(document, stageConfig);
  });

  return {success: true};
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

  // Define public stage document reference
  const publicDocument = app
    .firestore()
    .collection('experiments')
    .doc(data.experimentId)
    .collection('cohorts')
    .doc(data.cohortId)
    .collection('publicStageData')
    .doc(data.chatStageParticipantAnswer.id);

  // Set random timeout to avoid data contention with transaction
  await new Promise((resolve) => {
    setTimeout(resolve, Math.random() * 2000);
  });

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    transaction.set(document, data.chatStageParticipantAnswer);

    // Update public stage data
    const publicStageData = (
      await publicDocument.get()
    ).data() as StagePublicData;
    const discussionStatusMap =
      data.chatStageParticipantAnswer.discussionTimestampMap;

    for (const discussionId of Object.keys(discussionStatusMap)) {
      if (!publicStageData.discussionTimestampMap[discussionId]) {
        publicStageData.discussionTimestampMap[discussionId] = {};
      }
      publicStageData.discussionTimestampMap[discussionId][
        data.participantPublicId
      ] = discussionStatusMap[discussionId];
    }

    // Update current discussion ID if applicable
    await updateCurrentDiscussionIndex(
      data.experimentId,
      data.cohortId,
      data.chatStageParticipantAnswer.id,
      publicStageData,
    );

    transaction.set(publicDocument, publicStageData);
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

  throw new functions.https.HttpsError('invalid-argument', 'Invalid data');
}
