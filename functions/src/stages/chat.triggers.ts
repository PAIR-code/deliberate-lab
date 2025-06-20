import {onDocumentCreated} from 'firebase-functions/v2/firestore';
import {StageKind} from '@deliberation-lab/utils';
import {
  getFirestoreStage,
  getFirestoreStagePublicData,
} from '../utils/firestore';
import {
  checkAgentsReadyToEndChat,
  sendAgentMediatorMessage,
  sendAgentParticipantMessage,
} from './chat.agent';
import {startTimeElapsed} from './chat.time';
import {sendAgentParticipantSalespersonMessage} from './salesperson.agent';

// ************************************************************************* //
// TRIGGER FUNCTIONS                                                         //
// ************************************************************************* //

/** When a chat message is created */
export const onChatMessageCreated = onDocumentCreated(
  'experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}/chats/{chatId}',
  async (event) => {
    const stage = await getFirestoreStage(
      event.params.experimentId,
      event.params.stageId,
    );
    if (!stage) return;

    const publicStageData = await getFirestoreStagePublicData(
      event.params.experimentId,
      event.params.cohortId,
      event.params.stageId,
    );
    if (!publicStageData) return;

    // Take action for specific stages
    switch (stage.kind) {
      case StageKind.CHAT:
        // Start tracking elapsed time
        startTimeElapsed(
          event.params.experimentId,
          event.params.cohortId,
          publicStageData,
        );
        break;
      case StageKind.SALESPERSON:
        sendAgentParticipantSalespersonMessage(
          event.params.experimentId,
          event.params.cohortId,
          event.params.stageId,
          stage,
          event.params.chatId,
        );
        return; // Don't call any of the usual chat functions
      default:
        break;
    }

    // Send agent mediator messages
    sendAgentMediatorMessage(
      event.params.experimentId,
      event.params.cohortId,
      stage,
      publicStageData,
      event.params.chatId,
    );
    // Send agent participant messages
    sendAgentParticipantMessage(
      event.params.experimentId,
      event.params.cohortId,
      stage,
      publicStageData,
      event.params.chatId,
    );
    // Check ready to end chat
    checkAgentsReadyToEndChat(
      event.params.experimentId,
      event.params.cohortId,
      stage,
      publicStageData,
    );
  },
);
