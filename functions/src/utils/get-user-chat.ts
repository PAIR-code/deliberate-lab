/* eslint-disable @typescript-eslint/no-explicit-any */
import { app } from '../app';
import { StageKind } from '../validation/stages.validation';
import { Document } from './type-aliases';

/** Get data for a chat stage from a participant */
export const getUserChat = async (
  transaction: FirebaseFirestore.Transaction,
  participantId: string,
  chatId: string,
): Promise<any | null> => {
  const participant = await transaction.get(
    app.firestore().collection('participants').doc(participantId),
  );

  const stageMap: Record<string, any> | undefined = participant.data()?.stageMap;

  if (!participant.exists || !stageMap) {
    return null;
  }

  for (const stage of Object.values(stageMap)) {
    if (stage.kind === StageKind.GroupChat && stage.config.chatId === chatId) {
      return stage;
    }
  }

  return null;
};

/** Extract all chat ids from a participant data */
export const getUserChatIds = (participant: Document) => {
  const chatIds: string[] = [];

  const stageMap: Record<string, any> | undefined = participant.data()?.stageMap;

  if (!stageMap) {
    return chatIds;
  }

  for (const stage of Object.values(stageMap)) {
    if (stage.kind === StageKind.GroupChat) {
      chatIds.push(stage.config.chatId);
    }
  }

  return chatIds;
};
