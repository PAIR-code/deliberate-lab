import { v4 } from 'uuid';

/** Replaces all chatIds with new ones in order to create a brand new experiment.
 * Returns the list of all new chat ids.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const replaceChatStagesUuid = (stages: Record<string, any>) => {
  const stageUuids = Object.keys(stages);
  const chatUuids: string[] = [];

  stageUuids.forEach((uuid) => {
    if (stages[uuid].kind === 'groupChat') {
      const chatId = v4();
      stages[uuid].config.chatId = chatId;
      chatUuids.push(chatId);
    }
  });

  return chatUuids;
};
