/** Endpoints for interactions with experiments */

import {
  ChatAnswer,
  ExperimentCreationData,
  GroupChatStageConfig,
  ParticipantProfile,
  StageKind,
  participantPublicId,
} from '@llm-mediation-experiments/utils';
import { Value } from '@sinclair/typebox/value';
import { Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { onCall } from 'firebase-functions/v2/https';
import { app } from '../app';
import { AuthGuard } from '../utils/auth-guard';

/** Generic endpoint to create either experiments or experiment templates */
export const createExperiment = onCall(async (request) => {
  await AuthGuard.isExperimenter(request);

  const { data } = request;
  const numberOfParticipants = 3;

  if (Value.Check(ExperimentCreationData, data)) {
    // Run in a transaction to ensure consistency
    const document = app.firestore().collection(data.type).doc();

    await app.firestore().runTransaction(async (transaction) => {
      // Create the metadata document
      transaction.set(document, {
        ...data.metadata,
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
        });
      });
    });

    return { id: document.id };
  }

  throw new functions.https.HttpsError('invalid-argument', 'Invalid data');
});
