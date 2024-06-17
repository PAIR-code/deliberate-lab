import {
  ChatAnswer,
  ChatKind,
  DiscussItemsMessage,
  GroupChatStagePublicData,
  MessageKind,
} from '@llm-mediation-experiments/utils';
import { Timestamp } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { app } from '../app';

/** Expose participant "readyToEndChat" position to the public stage data for this chat in the parent experiment */
export const publishParticipantReadyToEndChat = onDocumentWritten(
  'experiments/{experimentId}/participants/{participantId}/chats/{chatId}',
  async (event) => {
    const data = event.data?.after.data() as ChatAnswer | undefined;
    if (!data) return;

    const { participantPublicId, readyToEndChat, stageName } = data;
    const { experimentId, chatId } = event.params;

    const publicChatData = app
      .firestore()
      .doc(`experiments/${experimentId}/publicStageData/${stageName}`);

    await publicChatData.update({
      [`readyToEndChat.${participantPublicId}`]: readyToEndChat,
    });

    // Check whether all participants are ready to end the chat
    // If the chat is a chat about items, increment the current item index,
    // and publish a message about the new pair (if there is one) to the chat of every participant
    const docData = (await publicChatData.get()).data() as GroupChatStagePublicData;
    const readys = Object.values(docData?.readyToEndChat ?? {});

    if (docData && readys.length === docData.numberOfParticipants && readys.every((r) => r)) {
      // Everyone is ready to end the chat
      if (docData['chatData'].kind === ChatKind.ChatAboutItems) {
        // 1. Increment the current item index
        const current = docData['chatData'].currentRatingIndex;
        await publicChatData.update({ [`chatData.currentRatingIndex`]: current + 1 });

        // 2. If there is not a new pair of items, skip the next two steps
        if (current + 1 >= docData['chatData'].ratingsToDiscuss.length) return;

        // 3. Reset all participants' readyToEndChat (for new discussion)
        for (const id of Object.keys(docData?.readyToEndChat ?? {})) {
          await publicChatData.update({
            [`readyToEndChat.${id}`]: false
          });
          // TODO: Also update participants' private ChatAnswer?
        }

        // 4. Publish a message about the new pair to the chat of every participant
        const itemPair = docData['chatData'].ratingsToDiscuss[current + 1];
        const messageData: Omit<DiscussItemsMessage, 'uid'> = {
          kind: MessageKind.DiscussItemsMessage,
          itemPair,
          text: 'New pair of objects',
          timestamp: Timestamp.now(),
        };

        // Fetch all participant IDs in order to send the message to all of them (everyone has a copy of the chat)
        const participantIds = (
          await app.firestore().collection(`experiments/${experimentId}/participants`).get()
        ).docs.map((doc) => doc.id);

        await Promise.all(
          participantIds.map(async (participantId) => {
            return app
              .firestore()
              .collection(
                `experiments/${experimentId}/participants/${participantId}/chats/${chatId}/messages`,
              )
              .doc()
              .create(messageData);
          }),
        );
      }
    }
  },
);
