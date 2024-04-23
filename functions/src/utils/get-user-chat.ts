/* eslint-disable @typescript-eslint/no-explicit-any */
import { app } from '../app';
import { StageKind } from '../validation/stages.validation';

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
