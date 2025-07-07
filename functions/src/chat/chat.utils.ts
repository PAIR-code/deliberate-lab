import {ChatMessage, createChatMessage} from '@deliberation-lab/utils';
import {Timestamp} from 'firebase-admin/firestore';
import {app} from '../app';

/** Used for private chats if model response fails. */
export async function sendErrorPrivateChatMessage(
  experimentId: string,
  participantId: string,
  stageId: string,
  config: Partial<ChatMessage> = {},
) {
  const chatMessage = createChatMessage({
    ...config,
    timestamp: Timestamp.now(),
    isError: true,
  });

  const agentDocument = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('participants')
    .doc(participantId)
    .collection('stageData')
    .doc(stageId)
    .collection('privateChats')
    .doc(chatMessage.id);

  agentDocument.set(chatMessage);
}
