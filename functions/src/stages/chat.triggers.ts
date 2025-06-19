import {onDocumentCreated} from 'firebase-functions/v2/firestore';
import {StageKind} from '@deliberation-lab/utils';
import {
  checkAgentsReadyToEndChat,
  sendAgentMediatorMessage,
  sendAgentParticipantMessage,
} from './chat.agent';
import {getChatStage, getChatStagePublicData} from './chat.utils';
import {
  getFirestoreStage,
  getFirestoreStagePublicData,
} from '../utils/firestore';
import {startTimeElapsed} from './chat.time';

// ************************************************************************* //
// TRIGGER FUNCTIONS                                                         //
// ************************************************************************* //

/** When a chat message is created */
export const onChatMessageCreated = onDocumentCreated(
  'experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}/chats/{chatId}',
  async (event) => {
    // TODO: Add agent chat response logic here

    const stage = await getChatStage(
      event.params.experimentId,
      event.params.stageId,
    );
    if (!stage) return;

    const publicStageData = await getChatStagePublicData(
      event.params.experimentId,
      event.params.cohortId,
      event.params.stageId,
    );
    if (!publicStageData) return;

    // Start tracking elapsed time
    startTimeElapsed(
      event.params.experimentId,
      event.params.cohortId,
      publicStageData,
    );
  },
);

/** When chat message is created, generate mediator agent response if relevant. */
export const createAgentMessage = onDocumentCreated(
  {
    document:
      'experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}/chats/{chatId}',
    timeoutSeconds: 60, // Maximum timeout of 1 minute for typing delay.
  },
  async (event) => {
    const data = event.data?.data() as ChatMessage | undefined;
    const experimentId = event.params.experimentId;
    const cohortId = event.params.cohortId;
    const stageId = event.params.stageId;

    // Use experiment config to get ChatStageConfig with agents.
    const stage = await getChatStage(experimentId, stageId);
    if (!stage) {
      return;
    }

    const publicStageData = await getChatStagePublicData(
      experimentId,
      cohortId,
      stageId,
    );

    sendAgentMediatorMessage(
      experimentId,
      cohortId,
      stage,
      publicStageData,
      event.params.chatId,
    );
  },
);

/** When chat message is created, generate agent participant response. */
export const createAgentParticipantMessage = onDocumentCreated(
  {
    document:
      'experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}/chats/{chatId}',
    timeoutSeconds: 60, // Maximum timeout of 1 minute for typing delay.
  },
  async (event) => {
    const data = event.data?.data() as ChatMessage | undefined;
    const experimentId = event.params.experimentId;
    const stageId = event.params.stageId;
    const cohortId = event.params.cohortId;

    // Use experiment config to get ChatStageConfig with agents.
    const stage = await getChatStage(experimentId, stageId);
    if (!stage || stage.kind !== StageKind.CHAT) {
      return;
    }

    const publicStageData = await getChatStagePublicData(
      experimentId,
      cohortId,
      stageId,
    );

    sendAgentParticipantMessage(
      experimentId,
      cohortId,
      stage,
      publicStageData,
      event.params.chatId,
    );
  },
);

/** When chat message is created, check if agent participants are
 * ready to end chat.
 */
export const checkReadyToEndChat = onDocumentCreated(
  {
    document:
      'experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}/chats/{chatId}',
    timeoutSeconds: 60, // Maximum timeout of 1 minute for typing delay.
  },
  async (event) => {
    const data = event.data?.data() as ChatMessage | undefined;
    const publicStageData = await getFirestoreStagePublicData(
      event.params.experimentId,
      event.params.cohortId,
      event.params.stageId,
    );
    const stage = await getFirestoreStage(
      event.params.experimentId,
      event.params.stageId,
    );

    checkAgentsReadyToEndChat(
      event.params.experimentId,
      event.params.cohortId,
      stage,
      publicStageData,
    );
  },
);
