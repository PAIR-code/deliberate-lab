import { Value } from '@sinclair/typebox/value';
import {
  ChatStageConfig,
  CreateChatMessageData,
  StageConfig,
} from '@deliberation-lab/utils';

import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { onCall } from 'firebase-functions/v2/https';

import { app } from '../app';
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
  const { data } = request;

  // Validate input
  /* const validInput = Value.Check(CreateChatMessageData, data);
  if (!validInput) {
    handleCreateChatMessageValidationErrors(data);
  } */

  // Define document reference
  const document = app.firestore()
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
    // (see chat.triggers for auto-generated mediator responses)
    transaction.set(document, chatMessage);
  });

  return { id: document.id };
});

function handleCreateChatMessageValidationErrors(data: any) {
  for (const error of Value.Errors(CreateChatMessageData, data)) {
    if (isUnionError(error)) {
      const nested = checkConfigDataUnionOnPath(data, error.path);
      prettyPrintErrors(nested);
    } else {
      prettyPrintError(error);
    }
  }

  throw new functions.https.HttpsError('invalid-argument', 'Invalid data');
}
