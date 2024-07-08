/** Endpoints for interactions with experiments */

import {
  ChatAnswer,
  ChatKind,
  DiscussItemsMessage,
  ExperimentCreationData,
  ExperimentDeletionData,
  GroupChatStageConfig,
  MessageKind,
  ParticipantProfile,
  participantPublicId,
  StageKind,
} from '@llm-mediation-experiments/utils';
import { Value } from '@sinclair/typebox/value';
import { Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { onCall } from 'firebase-functions/v2/https';
import { app } from '../app';
import { AuthGuard } from '../utils/auth-guard';
import {
  checkConfigDataUnionOnPath,
  isUnionError,
  prettyPrintError,
  prettyPrintErrors,
} from '../utils/validation';

const DEFAULT_PARTICIPANT_COUNT = 3;

/** Generic endpoint to create either experiments or experiment templates */
export const createExperiment = onCall(async (request) => {
  await AuthGuard.isExperimenter(request);

  const { data } = request;

  if (Value.Check(ExperimentCreationData, data)) {
    // Run in a transaction to ensure consistency
    const document = app.firestore().collection(data.type).doc();

    await app.firestore().runTransaction(async (transaction) => {
      let { numberOfParticipants } = data.metadata;
      const { name } = data.metadata;

      numberOfParticipants = numberOfParticipants ?? DEFAULT_PARTICIPANT_COUNT;

      // Create the metadata document
      transaction.set(document, {
        name,
        ...(data.type === 'experiments'
          ? {
              date: Timestamp.now(),
              numberOfParticipants,
            }
          : {}),
      });

      // Create the stages
      for (const stage of data.stages) {
        transaction.set(document.collection('stages').doc(stage.name), stage);
      }

      // Nothing more to do if this was a template
      if (data.type === 'templates') return;

      // Extract chats in order to pre-create the participant chat documents
      const chats: GroupChatStageConfig[] = data.stages.filter(
        (stage): stage is GroupChatStageConfig => stage.kind === StageKind.GroupChat,
      );
      const workingOnStageName = data.stages[0].name;

      // Create all participants
      Array.from({ length: numberOfParticipants }).forEach((_, i) => {
        const participant = document.collection('participants').doc();
        const participantData: ParticipantProfile = {
          publicId: participantPublicId(i),

          workingOnStageName,
          pronouns: null,
          name: null,
          avatarUrl: null,
          acceptTosTimestamp: null,
          completedExperiment: null,
        };

        // Create the participant document
        transaction.set(participant, participantData);

        // Create the chat documents
        chats.forEach((chat) => {
          const chatData: ChatAnswer = {
            participantPublicId: participantData.publicId,
            readyToEndChat: false,
            stageName: chat.name,
          };
          transaction.set(participant.collection('chats').doc(chat.chatId), chatData);

          // If the chat is a chat about items, create an initial DiscussItemsMessage to mention the first pair
          if (chat.chatConfig.kind === ChatKind.ChatAboutItems) {
            const firstPair = chat.chatConfig.ratingsToDiscuss[0];
            // Create the message
            const messageData: Omit<DiscussItemsMessage, 'uid'> = {
              kind: MessageKind.DiscussItemsMessage,
              itemPair: firstPair,
              text: `Discussion 1 of ${chat.chatConfig.ratingsToDiscuss.length}`,
              timestamp: Timestamp.now(),
            };

            // Write it to this participant's chat collection
            transaction.set(
              participant.collection('chats').doc(chat.chatId).collection('messages').doc(),
              messageData,
            );
          }
        });
      });
    });

    return { id: document.id };
  }

  // There was an error: try to extract more information
  const errors = [...Value.Errors(ExperimentCreationData, data)];

  for (const error of errors) {
    if (isUnionError(error)) {
      const nested = checkConfigDataUnionOnPath(data, error.path);
      prettyPrintErrors(nested);
    } else {
      prettyPrintError(error);
    }
  }

  throw new functions.https.HttpsError('invalid-argument', 'Invalid data');
});

/** Generic endpoint to recursively delete either experiments or experiment templates.
 * Recursive deletion is only supported server-side.
 */
export const deleteExperiment = onCall(async (request) => {
  await AuthGuard.isExperimenter(request);

  const { data } = request;

  if (Value.Check(ExperimentDeletionData, data)) {
    const doc = app.firestore().doc(`${data.type}/${data.id}`);
    app.firestore().recursiveDelete(doc);
    return { success: true };
  }

  throw new functions.https.HttpsError('invalid-argument', 'Invalid data');
});
