import { ChatAnswer, ChatKind } from '@llm-mediation-experiments/utils';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { app } from '../app';

/** Expose participant "readyToEndChat" position to the public stage data for this chat in the parent experiment */
export const publishParticipantReadyToEndChat = onDocumentWritten(
  'experiments/{experimentId}/participants/{participantId}/chats/{chatId}',
  async (event) => {
    const data = event.data?.after.data() as ChatAnswer | undefined;
    if (!data) return;

    const { participantPublicId, readyToEndChat, stageName } = data;
    const { experimentId } = event.params;

    const publicChatData = app
      .firestore()
      .doc(`experiments/${experimentId}/publicStageData/${stageName}`);

    await publicChatData.update({
      [`readyToEndChat.${participantPublicId}`]: readyToEndChat,
    });

    // Check whether all participants are ready to end the chat
    // If the chat is a chat about items, increment the current item index
    const docData = (await publicChatData.get()).data();

    if (docData && Object.values(docData['readyToEndChat']).every((bool) => !bool)) {
      // Everyone is ready to end the chat
      if (docData['chatData'].kind === ChatKind.ChatAboutItems) {
        // Increment the current item index
        const current = docData['chatData'].currentRatingIndex;
        await publicChatData.update({ [`chatData.currentRatingIndex`]: current + 1 });
      }
    }
  },
);
