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

    const { participantPublicId, readyToEndChat, stageId } = data;
    const { experimentId, chatId } = event.params;

    const publicChatData = app
      .firestore()
      .doc(`experiments/${experimentId}/publicStageData/${stageId}`);

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
        const total = docData['chatData'].ratingsToDiscuss.length;
        if (current + 1 >= total) return;

        // Fetch all participant IDs in order to
        // - Reset their "readyToEndChat" status
        // - Send the message to all of them (everyone has a copy of the chat)
        const participantIds = (
          await app.firestore().collection(`experiments/${experimentId}/participants`).get()
        ).docs.map((doc) => doc.id);

        // 3. Reset all participants' readyToEndChat (for new discussion)
        await Promise.all(
          participantIds.map((participantId) =>
            app
              .firestore()
              .doc(`experiments/${experimentId}/participants/${participantId}/chats/${chatId}`)
              .update({
                readyToEndChat: false,
              }),
          ),
        );

        // 4. Publish a message about the new pair to the chat of every participant
        const itemPair = docData['chatData'].ratingsToDiscuss[current + 1];
        const messageData: Omit<DiscussItemsMessage, 'uid'> = {
          kind: MessageKind.DiscussItemsMessage,
          itemPair,
          text: `Discussion ${current + 2} of ${total}`,
          timestamp: Timestamp.now(),
        };

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
