import {
  ChatKind,
  DiscussItemsMessage,
  Experiment,
  MessageKind,
  ParticipantProfile,
  PublicChatData,
  PublicStageData,
  StageAnswer,
  StageConfig,
  StageKind,
  VoteForLeaderStagePublicData,
  allVoteScores,
  chooseLeader,
} from '@llm-mediation-experiments/utils';
import { Timestamp } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { app } from '../app';

/** Initialize the public stage data for a stage config when it is created */
export const initializePublicStageData = onDocumentWritten(
  'experiments/{experimentId}/stages/{stageId}',
  async (event) => {
    const data = event.data?.after.data() as StageConfig | undefined;
    if (!data) return;

    let publicData: PublicStageData | undefined;

    switch (data.kind) {
      case StageKind.VoteForLeader:
        publicData = {
          kind: data.kind,
          participantvotes: {},
          currentLeader: null,
        };
        break;
      case StageKind.TakeSurvey:
        publicData = {
          kind: data.kind,
          participantAnswers: {},
        };
        break;
      case StageKind.LostAtSeaSurvey:
        publicData = {
          kind: data.kind,
          participantAnswers: {},
        };
        break;
      case StageKind.GroupChat:
        // Initialize the custom chat data (depending on the chat kind)
        let chatData: PublicChatData;

        switch (data.chatConfig.kind) {
          case ChatKind.ChatAboutItems:
            chatData = {
              kind: ChatKind.ChatAboutItems,
              currentRatingIndex: 0,
              ratingsToDiscuss: data.chatConfig.ratingsToDiscuss,
            };
            break;
          default: // SimpleChat
            chatData = {
              kind: ChatKind.SimpleChat,
            };
        }

        // Read the number of participants from the experiment document
        const experimentDoc = await app
          .firestore()
          .doc(`experiments/${event.params.experimentId}`)
          .get();
        const { numberOfParticipants } = experimentDoc.data() as Experiment;

        publicData = {
          kind: data.kind,
          numberOfParticipants,
          readyToEndChat: {},
          chatData,
        };
        break;
      default:
        return;
    }

    // Write the public data into a document
    const publicStageData = app
      .firestore()
      .doc(`experiments/${event.params.experimentId}/publicStageData/${event.params.stageId}`);

    publicStageData.set(publicData);

    // If stage is Lost at Sea chat, create initial DiscussItemsMessage
    if (data.kind === StageKind.GroupChat && data.chatConfig.kind === ChatKind.ChatAboutItems) {
      const ratingsToDiscuss = data.chatConfig.ratingsToDiscuss;
      // Create the message
      const messageData: Omit<DiscussItemsMessage, 'uid'> = {
        kind: MessageKind.DiscussItemsMessage,
        itemPair: ratingsToDiscuss[0],
        text: `Discussion 1 of ${ratingsToDiscuss.length}`,
        timestamp: Timestamp.now(),
      };

      await app.firestore().runTransaction(async (transaction) => {
        const stageMessageData = await app
          .firestore()
          .collection(
            `experiments/${event.params.experimentId}/publicStageData/${event.params.stageId}/messages`,
          );

        transaction.set(stageMessageData.doc(), messageData);
      });
    }
  },
);

/** When a participant updates stage answers, publish the answers to  */
export const publishStageData = onDocumentWritten(
  'experiments/{experimentId}/participants/{participantId}/stages/{stageId}',
  async (event) => {
    const data = event.data?.after.data() as StageAnswer | undefined;
    if (!data) return;

    const { experimentId, participantId, stageId } = event.params;

    // Get the current participant's public ID
    const participantDoc = await app
      .firestore()
      .doc(`experiments/${experimentId}/participants/${participantId}`)
      .get();
    const participantPublicId = (participantDoc.data() as ParticipantProfile).publicId;

    // All participant IDs
    const participantIds = (
      await app.firestore().collection(`experiments/${experimentId}/participants`).get()
    ).docs.map((doc) => doc.id);

    switch (data.kind) {
      case StageKind.VoteForLeader:
        // Read the document 1st to avoid 2 writes
        const publicDoc = await app
          .firestore()
          .doc(`experiments/${experimentId}/publicStageData/${stageId}`)
          .get();
        const publicData = publicDoc.data() as VoteForLeaderStagePublicData;

        // Compute the updated votes
        const newVotes = publicData.participantvotes;
        newVotes[participantPublicId] = data.votes;

        // Compute the new leader with these votes
        const currentLeader = chooseLeader(allVoteScores(newVotes));

        // Update the public data
        await publicDoc.ref.update({
          participantvotes: newVotes,
          currentLeader,
        });

        break;
      case StageKind.TakeSurvey:
        const surveyParticipantDoc = await app
          .firestore()
          .doc(`experiments/${experimentId}/participants/${participantId}`)
          .get();
        const surveyParticipantPublicId = (surveyParticipantDoc.data() as ParticipantProfile)
          .publicId;

        const surveyDoc = await app
          .firestore()
          .doc(`experiments/${experimentId}/publicStageData/${stageId}`)
          .get();
        const surveyData = surveyDoc.data() as TakeSurveyStagePublicData;

        const newAnswers = surveyData.participantAnswers;

        newAnswers[surveyParticipantPublicId] = data.answers;

        await surveyDoc.ref.update({
          participantAnswers: newAnswers,
        });
        break;
      case StageKind.LostAtSeaSurvey:
        const lasSurveyParticipantDoc = await app
          .firestore()
          .doc(`experiments/${experimentId}/participants/${participantId}`)
          .get();
        const lasSurveyParticipantPublicId = (lasSurveyParticipantDoc.data() as ParticipantProfile)
          .publicId;

        const lasSurveyDoc = await app
          .firestore()
          .doc(`experiments/${experimentId}/publicStageData/${stageId}`)
          .get();
        const lasSurveyData = lasSurveyDoc.data() as LostAtSeaSurveyStagePublicData;

        const lasNewAnswers = lasSurveyData.participantAnswers;

        lasNewAnswers[lasSurveyParticipantPublicId] = data.answers;

        await lasSurveyDoc.ref.update({
          participantAnswers: lasNewAnswers,
        });
        break;
      case StageKind.GroupChat:
        const publicChatData = app
          .firestore()
          .doc(`experiments/${experimentId}/publicStageData/${stageId}`);

        const readyToEndChat = data.readyToEndChat;
        await publicChatData.update({
          [`readyToEndChat.${participantPublicId}`]: readyToEndChat,
        });

        // Check whether all participants are ready to end the chat
        // If the chat is a chat about items, increment the current item index,
        // and publish a message about the new pair (if there is one) to the chat of every participant
        const docData = (await publicChatData.get()).data() as GroupChatStagePublicData;
        const readys = Object.values(docData?.readyToEndChat ?? {});

        if (
          docData &&
          docData['chatData'].kind === ChatKind.ChatAboutItems &&
          readys.length === participantIds.length &&
          readys.every((r) => r)
        ) {
          // 1. Increment the current item index
          const current = docData['chatData'].currentRatingIndex;
          await publicChatData.update({ [`chatData.currentRatingIndex`]: current + 1 });

          // 2. If there is not a new pair of items, skip the next two steps
          const total = docData['chatData'].ratingsToDiscuss.length;
          if (current + 1 >= total) return;

          // 3. Reset all participants' readyToEndChat (for new discussion)
          await Promise.all(
            participantIds.map((participantId) =>
              app
                .firestore()
                .doc(`experiments/${experimentId}/participants/${participantId}/stages/${stageId}`)
                .update({
                  readyToEndChat: false,
                }),
            ),
          );

          // 4. Publish a message about the new pair to the chat
          const itemPair = docData['chatData'].ratingsToDiscuss[current + 1];
          const messageData: Omit<DiscussItemsMessage, 'uid'> = {
            kind: MessageKind.DiscussItemsMessage,
            itemPair,
            text: `Discussion ${current + 2} of ${total}`,
            timestamp: Timestamp.now(),
          };

          app
            .firestore()
            .collection(`experiments/${experimentId}/publicStageData/${stageId}/messages`)
            .doc()
            .create(messageData);
        } // end conditionally resetting readyToEndChat for group chat
        break;
      default:
        break;
    } // end switch
  },
);
