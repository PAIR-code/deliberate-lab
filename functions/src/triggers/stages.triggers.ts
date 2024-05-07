import {
  ChatKind,
  PublicChatData,
  PublicStageData,
  StageConfig,
  StageKind,
} from '@llm-mediation-experiments/utils';
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
        };
        break;
      case StageKind.GroupChat:
        // Initialize the custom chat data (depending on the chat kind)
        let chatData: PublicChatData | undefined;

        switch (data.chatConfig.kind) {
          case ChatKind.ChatAboutItems:
            chatData = {
              kind: ChatKind.ChatAboutItems,
              currentRatingIndex: 0,
            };
            break;
        }

        publicData = {
          kind: data.kind,
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
  },
);
