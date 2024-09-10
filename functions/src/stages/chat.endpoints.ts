import { Value } from '@sinclair/typebox/value';
import {
  ChatStageConfig,
  CreateChatMessageData,
  StageConfig,
  StageKind
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

/** Create chat messages. */

// ************************************************************************* //
// createChatMessage endpoint                                                //
//                                                                           //
// Input structure: {                                                        //
//   experimentId, cohortId, stageId, chatMessage, mediatorCalls             //
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

  // Run document write as transaction to ensure consistency
  await app.firestore().runTransaction(async (transaction) => {
    // Add chat message
    transaction.set(document, data.chatMessage);

    // Then, check for mediators configured and run on chat history

    // Get number of chats in collection
    const numChatsBeforeMediator = (
      await app
      .firestore()
      .collection(`experiments/${data.experimentId}/cohorts/${data.cohortId}/publicStageData/${data.stageId}/chats`)
      .count().get())
    .data().count;

    // TODO: Call API for mediator messages
    // Use experiment config to get ChatStageConfig with mediators.
    const stage = (
      await app.firestore().doc(`experiments/${data.experimentId}/stages/${data.stageId}`).get()
    ).data() as StageConfig;
    if (stage.kind !== StageKind.CHAT) { return; }

    // Call LLM API with given modelCall info
    // (prompt, experimenter ID to use for API key)

    // If number of chats has not changed, add mediator message
    const numChatsAfterMediator = (
      await app
      .firestore()
      .collection(`experiments/${data.experimentId}/cohorts/${data.cohortId}/publicStageData/${data.stageId}/chats`)
      .count().get())
    .data().count;
    if (numChatsAfterMediator > numChatsBeforeMediator) { return; }

    // TODO: Add mediator message
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
