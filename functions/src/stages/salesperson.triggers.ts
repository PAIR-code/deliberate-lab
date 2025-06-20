import {Timestamp} from 'firebase-admin/firestore';
import {
  onDocumentCreated,
  onDocumentUpdated,
  onDocumentWritten,
} from 'firebase-functions/v2/firestore';
import {
  ChatMessage,
  Experiment,
  ExperimenterData,
  ParticipantStatus,
  StageConfig,
  StageKind,
  createAgentChatPromptConfig,
  createParticipantChatMessage,
} from '@deliberation-lab/utils';
import {
  getAgentChatAPIResponse,
  getAgentChatPrompt,
  getChatMessages,
  sendAgentChatMessage,
} from './chat.utils';
import {sendAgentParticipantSalespersonMessage} from './salesperson.agent';
import {getSalespersonChatPrompt} from './salesperson.utils';
import {getPastStagesPromptContext} from './stage.utils';
import {getFirestoreActiveParticipants} from '../utils/firestore';
import {app} from '../app';

/** When chat message is created in salesperson stage,
 * generate agent participant response.
 */
export const createAgentParticipantSalespersonMessage = onDocumentCreated(
  {
    document:
      'experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}/chats/{chatId}',
    timeoutSeconds: 60, // Maximum timeout of 1 minute for typing delay.
  },
  async (event) => {
    const data = event.data?.data() as ChatMessage | undefined;
    const stage = (
      await app
        .firestore()
        .collection('experiments')
        .doc(event.params.experimentId)
        .collection('stages')
        .doc(event.params.stageId)
        .get()
    ).data() as StageConfig;
    if (stage?.kind !== StageKind.SALESPERSON) {
      return;
    }
    sendAgentParticipantSalespersonMessage(
      event.params.experimentId,
      event.params.cohortId,
      event.params.stageId,
      stage,
      event.params.chatId,
    );
  },
);
