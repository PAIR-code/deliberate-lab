import { ChatAnswer } from '@llm-mediation-experiments/utils';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { app } from '../app';

/** Expose participant "readyToEndChat" position to the public stage data for this chat in the parent experiment */
export const publishParticipantReadyToEndChat = onDocumentWritten(
  'experiments/{experimentId}/participants/{participantId}/chats/{chatId}',
  async (event) => {
    const data = event.data?.after.data() as ChatAnswer | undefined;
    if (!data) return;

    const { participantPublicId, readyToEndChat, stageName } = data;

    const publicChatData = app
      .firestore()
      .doc(`experiments/${event.params.experimentId}/publicStageData/${stageName}`);

    publicChatData.update({
      [`readyToEndChat.${participantPublicId}`]: readyToEndChat,
    });
  },
);
