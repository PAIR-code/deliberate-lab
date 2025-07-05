import {onDocumentCreated} from 'firebase-functions/v2/firestore';
import {StageKind} from '@deliberation-lab/utils';
import {
  getFirestoreActiveMediators,
  getFirestoreActiveParticipants,
  getFirestoreStage,
  getFirestoreStagePublicData,
} from '../utils/firestore';
import {createAgentChatMessageFromPrompt} from '../chat/chat.agent';
import {startTimeElapsed} from '../stages/chat.time';
import {sendAgentParticipantSalespersonMessage} from '../stages/salesperson.agent';

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
        // TODO: Add API calls for salesperson back in
        return; // Don't call any of the usual chat functions
      default:
        break;
    }

    // Send agent mediator messages
    const mediators = await getFirestoreActiveMediators(
      event.params.experimentId,
      event.params.cohortId,
      stage.id,
      true,
    );
    mediators.forEach((mediator) => {
      createAgentChatMessageFromPrompt(
        event.params.experimentId,
        event.params.cohortId,
        stage.id,
        event.params.chatId,
        mediator,
      );
    });

    // Send agent participant messages
    const participants = await getFirestoreActiveParticipants(
      event.params.experimentId,
      event.params.cohortId,
      stage.id,
      true,
    );
    participants.forEach((participant) => {
      createAgentChatMessageFromPrompt(
        event.params.experimentId,
        event.params.cohortId,
        stage.id,
        event.params.chatId,
        participant,
      );
    });
  },
);
