import { v4 } from 'uuid';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const replaceChatStagesUuid = (stages: Record<string, any>) => {
  const stageUuids = Object.keys(stages);

  stageUuids.forEach((uuid) => {
    if (stages[uuid].kind === 'groupChat') {
      stages[uuid].config.chatId = v4();
    }
  });

  return stages;
};
