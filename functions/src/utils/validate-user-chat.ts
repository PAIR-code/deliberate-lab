/** Validate that a user exists and that they can post to a chat */

import { app } from '../app';
import { StageKind } from '../validation/stages.validation';

export const validateUserChat = async (participantId: string, chatId: string) => {
  // Get the user from the database
  const user = await app.firestore().collection('participants').doc(participantId).get();

  const stageMap = user.data()?.stageMap;
  if (!user.exists || !stageMap) return false;

  // Iterate through the user's stages, and find the first chat with the correct chat ID
  for (const stage of Object.values(stageMap as object)) {
    if (stage.kind === StageKind.GroupChat && stage.config.chatId === chatId) return true;
  }

  return false;
};
