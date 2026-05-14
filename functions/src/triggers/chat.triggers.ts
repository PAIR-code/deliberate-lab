import {onDocumentCreated} from 'firebase-functions/v2/firestore';
import {
  ChatMessage,
  ParticipantStatus,
  StageKind,
  UserType,
  createParticipantProfileBase,
} from '@deliberation-lab/utils';
import {
  getFirestoreActiveMediators,
  getFirestoreActiveParticipants,
  getFirestoreExperiment,
  getFirestoreParticipant,
  getFirestoreParticipantAnswerRef,
  getFirestoreParticipantRef,
  getFirestoreStage,
  getFirestoreStagePublicData,
} from '../utils/firestore';
import {
  createAgentChatMessageFromPrompt,
  AgentMessageResult,
} from '../chat/chat.agent';
import {sendErrorPrivateChatMessage} from '../chat/chat.utils';
import {updateParticipantNextStage} from '../participant.utils';
import {startTimeElapsed} from '../stages/chat.time';
import {app} from '../app';

// ************************************************************************* //
// TRIGGER FUNCTIONS                                                         //
// ************************************************************************* //

/** When a chat message is created under publicStageData */
export const onPublicChatMessageCreated = onDocumentCreated(
  {
    document:
      'experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}/chats/{chatId}',
    memory: '1GiB',
    timeoutSeconds: 300,
  },
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

    // Get all participants for context
    const allParticipants = await getFirestoreActiveParticipants(
      event.params.experimentId,
      event.params.cohortId,
      stage.id,
      false, // Get all participants, not just agents
    );

    const allParticipantIds = allParticipants.map((p) => p.privateId);

    // Send agent mediator messages
    const mediators = await getFirestoreActiveMediators(
      event.params.experimentId,
      event.params.cohortId,
      stage.id,
      true,
    );
    await Promise.all(
      mediators.map((mediator) =>
        createAgentChatMessageFromPrompt(
          event.params.experimentId,
          event.params.cohortId,
          allParticipantIds, // Provide all participant IDs for full context
          stage.id,
          event.params.chatId,
          mediator,
        ),
      ),
    );

    // Send agent participant messages for agents who are still completing
    // the experiment
    const agentParticipants = allParticipants.filter(
      (p) => p.agentConfig && p.currentStatus === ParticipantStatus.IN_PROGRESS,
    );
    await Promise.all(
      agentParticipants.map((participant) =>
        createAgentChatMessageFromPrompt(
          event.params.experimentId,
          event.params.cohortId,
          [participant.privateId], // Pass agent's own ID as array
          stage.id,
          event.params.chatId,
          participant,
        ),
      ),
    );
  },
);

/** When a chat message is created under private participant stageData */
export const onPrivateChatMessageCreated = onDocumentCreated(
  {
    document:
      'experiments/{experimentId}/participants/{participantId}/stageData/{stageId}/privateChats/{chatId}',
    memory: '1GiB',
    timeoutSeconds: 300,
  },
  async (event) => {
    // Ignore if error message
    const message = (
      await app
        .firestore()
        .collection('experiments')
        .doc(event.params.experimentId)
        .collection('participants')
        .doc(event.params.participantId)
        .collection('stageData')
        .doc(event.params.stageId)
        .collection('privateChats')
        .doc(event.params.chatId)
        .get()
    ).data() as ChatMessage;
    if (message.isError) {
      return;
    }

    const stage = await getFirestoreStage(
      event.params.experimentId,
      event.params.stageId,
    );
    if (!stage) return;

    // Send agent mediator messages
    const participant = await getFirestoreParticipant(
      event.params.experimentId,
      event.params.participantId,
    );
    if (!participant) return;

    const mediators = await getFirestoreActiveMediators(
      event.params.experimentId,
      participant.currentCohortId,
      stage.id,
      true,
    );

    // Send agent mediator messages and collect results
    const results = await Promise.all(
      mediators.map(async (mediator) => {
        const result = await createAgentChatMessageFromPrompt(
          event.params.experimentId,
          participant.currentCohortId,
          [participant.privateId],
          stage.id,
          event.params.chatId,
          mediator,
        );

        if (result === AgentMessageResult.ERROR) {
          await sendErrorPrivateChatMessage(
            event.params.experimentId,
            participant.privateId,
            stage.id,
            {
              discussionId: message.discussionId,
              message: 'Error fetching response',
              type: mediator.type,
              profile: createParticipantProfileBase(mediator),
              senderId: mediator.publicId,
              agentId: mediator.agentConfig?.agentId ?? '',
            },
          );
        }

        return result;
      }),
    );

    // Only send "No mediators found" error for human participants.
    // Agent participants will be advanced by the allMediatorsDone check below.
    if (mediators.length === 0 && !participant.agentConfig) {
      await sendErrorPrivateChatMessage(
        event.params.experimentId,
        participant.privateId,
        stage.id,
        {
          discussionId: message.discussionId,
          message: 'No mediators found',
        },
      );
    }

    const allMediatorsDone =
      mediators.length === 0 ||
      results.every((r) => r === AgentMessageResult.DECLINED);

    // Send agent participant messages (if participant is an agent)
    let agentResult: AgentMessageResult | null = null;
    if (participant.agentConfig) {
      // Ensure agent only responds to mediator, not themselves
      if (message.type === UserType.MEDIATOR) {
        agentResult = await createAgentChatMessageFromPrompt(
          event.params.experimentId,
          participant.currentCohortId,
          [participant.privateId], // Pass agent's own ID as array
          stage.id,
          event.params.chatId,
          participant,
        );
      }
    }

    // Advance agent participant if the conversation is dead:
    // - All mediators declined AND the triggering message is not from a mediator
    //   (a mediator "declining" to respond to its own message is not the same
    //   as being permanently done — it just means canSelfTriggerCalls is false)
    // - OR all mediators declined AND the agent also declined (both sides done)
    //
    // Guard on currentStageId to prevent double-advancement if the trigger
    // fires twice (Cloud Functions at-least-once delivery).
    // Use updateParticipantNextStage directly because private chat stages
    // typically don't have publicStageData (which updateParticipantReadyToEndChat
    // requires).
    const shouldAdvanceAgent =
      allMediatorsDone &&
      participant.agentConfig &&
      participant.currentStageId === event.params.stageId &&
      (message.type !== UserType.MEDIATOR ||
        agentResult === AgentMessageResult.DECLINED);

    if (shouldAdvanceAgent) {
      // Advance to next stage
      const experiment = await getFirestoreExperiment(
        event.params.experimentId,
      );
      if (experiment) {
        // Set readyToEndChat first for data consistency with the normal
        // end-of-chat flow. If advancement fails after this point, the state
        // matches a human participant who clicked "end chat" but hasn't
        // been advanced yet — a recoverable state.
        const participantAnswerDoc = getFirestoreParticipantAnswerRef(
          event.params.experimentId,
          participant.privateId,
          event.params.stageId,
        );
        await participantAnswerDoc.set({readyToEndChat: true}, {merge: true});

        await updateParticipantNextStage(
          event.params.experimentId,
          participant,
          experiment.stageIds,
        );
        // updateParticipantNextStage mutates the participant in place but does
        // not write to Firestore — the caller must write.
        const participantDoc = getFirestoreParticipantRef(
          event.params.experimentId,
          participant.privateId,
        );
        await app.firestore().runTransaction(async (transaction) => {
          transaction.set(participantDoc, participant);
        });
      }
    }
  },
);
