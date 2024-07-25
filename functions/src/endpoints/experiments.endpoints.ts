/** Endpoints for interactions with experiments, including
  * creating/deleting experiments and participants.
  */

import {
  ChatAnswer,
  ChatKind,
  DiscussItemsMessage,
  ExperimentCreationData,
  ExperimentDeletionData,
  GroupChatStageConfig,
  MessageKind,
  ParticipantProfile,
  ParticipantProfileExtended,
  PayoutBundle,
  PayoutBundleStrategy,
  PayoutItem,
  PayoutItemStrategy,
  StageKind,
  SurveyQuestionKind,
  getLostAtSeaPairAnswer,
  participantPublicId
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
      const { name, publicName, description, tags, isLobby, group } = data.metadata;

      numberOfParticipants = numberOfParticipants ?? DEFAULT_PARTICIPANT_COUNT;

      // Create the metadata document
      transaction.set(document, {
        name,
        publicName,
        description,
        tags,
        author: { uid: request.auth?.uid, displayName: request.auth?.token?.name ?? '' },
        starred: {},
        isLobby,
        ...(data.type === 'experiments'
          ? {
            date: Timestamp.now(),
            group: group,
            numberOfParticipants,
            stageIds: data.stages.map(stage => stage.id),
          }
          : {}),
      });

      // Create the stages
      for (const stage of data.stages) {
        // If payout stage, use payout config to generate scoring config
        if (stage.kind === StageKind.Payout) {
          const getScoringQuestion = (question: RatingQuestionConfig) => {
            return {
              id: question.id,
              questionText: question.questionText,
              questionOptions: [question.item1, question.item2],
              answer: getLostAtSeaPairAnswer(question.item1, question.item2),
            };
          };

          const getScoringItem = (payoutItem: PayoutItem) => {
            // To define scoring questions, convert survey stage questions
            const surveyStage = (data.stages).find(stage => stage.id === payoutItem.surveyStageId);
            let questions = surveyStage.questions.filter(
              question => question.kind === SurveyQuestionKind.Rating
            );

            // If strategy is "choose one," only use one question
            if (payoutItem.strategy === PayoutItemStrategy.ChooseOne) {
              questions = [questions[Math.floor(Math.random() * questions.length)]];
            }
            return {
              fixedCurrencyAmount: payoutItem.fixedCurrencyAmount,
              currencyAmountPerQuestion: payoutItem.currencyAmountPerQuestion,
              questions: questions.map(question => getScoringQuestion(question)),
              surveyStageId: payoutItem.surveyStageId,
              leaderStageId: payoutItem.leaderStageId ?? '',
            };
          };

          const getScoringBundle = (payoutBundle: PayoutBundle) => {
            const payoutItems = payoutBundle.payoutItems;
            // If strategy is "choose one," only use one payout item
            const items = payoutBundle.strategy === PayoutBundleStrategy.AddPayoutItems ?
              payoutItems : [payoutItems[Math.floor(Math.random() * payoutItems.length)]];
            return {
              name: payoutBundle.name,
              scoringItems: items.map(item => getScoringItem(item)),
            }
          };

          stage.scoring = stage.payouts.map(payout => getScoringBundle(payout));
        }

        // Set stage
        transaction.set(document.collection('stages').doc(stage.id), stage);
      }

      // Nothing more to do if this was a template
      if (data.type === 'templates') return;

      // Extract chats in order to pre-create the participant chat documents
      const chats: GroupChatStageConfig[] = data.stages.filter(
        (stage): stage is GroupChatStageConfig => stage.kind === StageKind.GroupChat,
      );
      const currentStageId = data.stages[0].id;

      // Create all participants
      Array.from({ length: numberOfParticipants }).forEach((_, i) => {
        const participant = document.collection('participants').doc();
        const participantData: ParticipantProfile = {
          publicId: participantPublicId(i),
          currentStageId,
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
            stageId: chat.id,
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
  for (const error of Value.Errors(ExperimentCreationData, data)) {
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

export const createParticipant = onCall(async (request) => {
  const { data } = request;

  // Validate the incoming data
  if (!data.experimentId) {
    throw new functions.https.HttpsError('invalid-argument', 'Experiment ID is required');
  }

  const experimentRef = app.firestore().doc(`experiments/${data.experimentId}`);
  let newParticipantData: ParticipantProfileExtended | null = null;
  await app.firestore().runTransaction(async (transaction) => {
    const experimentDoc = await transaction.get(experimentRef);
    if (!experimentDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Experiment not found');
    }

    const experimentData = experimentDoc.data();
    if (!experimentData) {
      throw new functions.https.HttpsError('internal', 'Experiment data is missing');
    }

    let currentStageId = experimentData.stageIds ? experimentData.stageIds[0] : null;
    if (!currentStageId) {
      throw new functions.https.HttpsError('internal', 'Experiment stages are missing');
    }

    // Create a new participant document
    const participantRef = experimentRef.collection('participants').doc();
    const participantData: ParticipantProfile = {
      publicId: participantPublicId(experimentData.numberOfParticipants),
      currentStageId: data.participantData?.currentStageId ?? currentStageId,
      pronouns: data.participantData?.pronouns ?? null,
      name: data.participantData?.name ?? null,
      avatarUrl: data.participantData?.avatarUrl ?? null,
      acceptTosTimestamp: data.participantData?.acceptTosTimestamp ?? null,
      completedExperiment: null
    };

    // Increment the number of participants in the experiment metadata
    transaction.update(experimentRef, {
      numberOfParticipants: experimentData.numberOfParticipants + 1,
    });

    transaction.set(participantRef, participantData);
    // Retrieve the new participant data
    newParticipantData = {
      ...participantData,
      privateId: participantRef.id,
    } as ParticipantProfileExtended;
    // TODO: Add chat stages.
    // TODO: Validate and don't allow adding new participants if experiment has started.
  });
  if (newParticipantData) {
    return { success: true, participant: newParticipantData };
  } else {
    throw new functions.https.HttpsError('internal', 'Failed to retrieve the new participant data');
  }
});

/** Function to delete a participant from an experiment */
export const deleteParticipant = onCall(async (request) => {
  await AuthGuard.isExperimenter(request);

  const { data } = request;

  // Validate the incoming data
  if (!data.experimentId || !data.participantId) {
    throw new functions.https.HttpsError('invalid-argument', 'Experiment ID and Participant ID are required');
  }

  const experimentRef = app.firestore().doc(`experiments/${data.experimentId}`);
  const participantRef = experimentRef.collection('participants').doc(data.participantId);

  await app.firestore().runTransaction(async (transaction) => {
    const experimentDoc = await transaction.get(experimentRef);
    const participantDoc = await transaction.get(participantRef);

    if (!experimentDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Experiment not found');
    }

    if (!participantDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Participant not found');
    }

    const experimentData = experimentDoc.data();
    if (!experimentData) {
      throw new functions.https.HttpsError('internal', 'Experiment data is missing');
    }

    // Decrement the number of participants in the experiment metadata
    transaction.update(experimentRef, {
      numberOfParticipants: experimentData.numberOfParticipants - 1,
    });

    // Delete the participant document
    transaction.delete(participantRef);

    // Delete the chat documents associated with the participant
    const chatsSnapshot = await participantRef.collection('chats').get();
    chatsSnapshot.forEach(chatDoc => {
      transaction.delete(chatDoc.ref);
    });
  });

  return { success: true };
});