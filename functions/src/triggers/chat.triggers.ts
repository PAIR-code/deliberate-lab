import {onDocumentCreated} from 'firebase-functions/v2/firestore';
import {
  ChatMessage,
  ChatStageConfig,
  ChatStagePublicData,
  ParticipantStatus,
  StageKind,
  UserType,
  createParticipantProfileBase,
  shuffleWithSeed,
} from '@deliberation-lab/utils';
import {
  getFirestoreActiveMediators,
  getFirestoreActiveParticipants,
  getFirestoreParticipant,
  getFirestoreStage,
  getFirestoreStagePublicData,
} from '../utils/firestore';
import {createAgentChatMessageFromPrompt} from '../chat/chat.agent';
import {sendErrorPrivateChatMessage} from '../chat/chat.utils';
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
          publicStageData as ChatStagePublicData,
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

    const chatStage = stage as ChatStageConfig;
    const chatPublicData = publicStageData as ChatStagePublicData;

    if (chatStage.isTurnBased) {
      const message = event.data?.data() as ChatMessage;
      if (!message) return;

      let turnOrder = chatPublicData.turnOrder ?? [];
      let currentTurnParticipantId = chatPublicData.currentTurnParticipantId;
      let cycleIndex = chatPublicData.cycleIndex ?? 0;

      // Get active IDs for validation and filtering
      const allPublicParticipantIds = allParticipants.map((p) => p.publicId);
      const mediators = await getFirestoreActiveMediators(
        event.params.experimentId,
        event.params.cohortId,
        stage.id,
        true, // get AI mediators
      );
      const allMediatorIds = mediators.map((m) => m.publicId);
      const activeIds = [...allMediatorIds, ...allPublicParticipantIds];

      // Filter turnOrder to only include currently active/non-dropped-out IDs
      const originalTurnOrder = [...turnOrder];
      turnOrder = turnOrder.filter((id: string) => activeIds.includes(id));

      // If the current turn holder is no longer active (e.g., dropped out), auto-advance!
      if (
        currentTurnParticipantId &&
        !activeIds.includes(currentTurnParticipantId)
      ) {
        const oldIndex = originalTurnOrder.indexOf(currentTurnParticipantId);
        let nextActiveId: string | null = null;
        if (oldIndex !== -1) {
          for (let k = oldIndex + 1; k < originalTurnOrder.length; k++) {
            const candidate = originalTurnOrder[k];
            if (activeIds.includes(candidate)) {
              nextActiveId = candidate;
              break;
            }
          }
        }

        if (nextActiveId) {
          currentTurnParticipantId = nextActiveId;
        } else {
          // No active participants left in this cycle, start a new cycle!
          cycleIndex += 1;
          const seedString = `${event.params.cohortId}-${cycleIndex}`;
          const shuffledParticipants = shuffleWithSeed(
            allPublicParticipantIds,
            seedString,
          );
          turnOrder = [...allMediatorIds, ...shuffledParticipants];
          currentTurnParticipantId = turnOrder[0] ?? null;
        }

        // Update Firestore immediately
        const publicStageDataRef = app
          .firestore()
          .collection('experiments')
          .doc(event.params.experimentId)
          .collection('cohorts')
          .doc(event.params.cohortId)
          .collection('publicStageData')
          .doc(event.params.stageId);

        await publicStageDataRef.set(
          {
            currentTurnParticipantId,
            turnOrder,
            cycleIndex,
          },
          {merge: true},
        );
      }

      // 1. Initialize turn order if uninitialized or empty
      if (!currentTurnParticipantId || turnOrder.length === 0) {
        cycleIndex = 0;
        const seedString = `${event.params.cohortId}-${cycleIndex}`;
        const shuffledParticipants = shuffleWithSeed(
          allPublicParticipantIds,
          seedString,
        );

        turnOrder = [...allMediatorIds, ...shuffledParticipants];
        currentTurnParticipantId = turnOrder[0] ?? null;

        // Update Firestore immediately
        const publicStageDataRef = app
          .firestore()
          .collection('experiments')
          .doc(event.params.experimentId)
          .collection('cohorts')
          .doc(event.params.cohortId)
          .collection('publicStageData')
          .doc(event.params.stageId);

        await publicStageDataRef.set(
          {
            currentTurnParticipantId,
            turnOrder,
            cycleIndex,
          },
          {merge: true},
        );
      }

      // 2. If it is not the message sender's turn, do not advance
      if (message.senderId !== currentTurnParticipantId) {
        // Delete any out-of-turn messages
        const messageRef = event.data?.ref;
        if (messageRef) {
          await messageRef.delete();
        }

        // Fallback to trigger mediator message if it hasn't spoken yet
        if (
          currentTurnParticipantId &&
          turnOrder.indexOf(currentTurnParticipantId) === 0
        ) {
          const mediator = mediators.find(
            (m) => m.publicId === currentTurnParticipantId,
          );
          if (mediator) {
            await createAgentChatMessageFromPrompt(
              event.params.experimentId,
              event.params.cohortId,
              allParticipants.map((p) => p.privateId),
              stage.id,
              '', // empty triggerChatId indicates initial message
              mediator,
            );
          }
        }
        return;
      }

      // 3. Advance turn
      const currentIndex = turnOrder.indexOf(message.senderId);

      // If it's the last person in the turn order
      if (currentIndex === -1 || currentIndex === turnOrder.length - 1) {
        // Cycle repeats!
        cycleIndex += 1;

        const seedString = `${event.params.cohortId}-${cycleIndex}`;
        const shuffledParticipants = shuffleWithSeed(
          allPublicParticipantIds,
          seedString,
        );

        turnOrder = [...allMediatorIds, ...shuffledParticipants];
        currentTurnParticipantId = turnOrder[0] ?? null;
      } else {
        // Move to next person in the list
        currentTurnParticipantId = turnOrder[currentIndex + 1];
      }

      // Update publicStageData in Firestore
      const publicStageDataRef = app
        .firestore()
        .collection('experiments')
        .doc(event.params.experimentId)
        .collection('cohorts')
        .doc(event.params.cohortId)
        .collection('publicStageData')
        .doc(event.params.stageId);

      await publicStageDataRef.set(
        {
          currentTurnParticipantId,
          turnOrder,
          cycleIndex,
        },
        {merge: true},
      );

      // Trigger the next AI agent if applicable
      const nextTurnHolder = allParticipants.find(
        (p) => p.publicId === currentTurnParticipantId,
      );

      if (!nextTurnHolder) {
        // Check if it's a mediator!
        const mediators = await getFirestoreActiveMediators(
          event.params.experimentId,
          event.params.cohortId,
          stage.id,
          true,
        );
        const mediator = mediators.find(
          (m) => m.publicId === currentTurnParticipantId,
        );
        if (mediator) {
          await createAgentChatMessageFromPrompt(
            event.params.experimentId,
            event.params.cohortId,
            allParticipants.map((p) => p.privateId),
            stage.id,
            message.id,
            mediator,
          );
        }
      } else if (nextTurnHolder.agentConfig) {
        await createAgentChatMessageFromPrompt(
          event.params.experimentId,
          event.params.cohortId,
          [nextTurnHolder.privateId],
          stage.id,
          message.id,
          nextTurnHolder,
        );
      }
    } else {
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
        (p) =>
          p.agentConfig && p.currentStatus === ParticipantStatus.IN_PROGRESS,
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
    }
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

    await Promise.all(
      mediators.map(async (mediator) => {
        const result = await createAgentChatMessageFromPrompt(
          event.params.experimentId,
          participant.currentCohortId,
          [participant.privateId],
          stage.id,
          event.params.chatId,
          mediator,
        );

        if (!result) {
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
      }),
    );

    // If no mediator, return error (otherwise participant may wait
    // indefinitely for a response).
    if (mediators.length === 0) {
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

    // Send agent participant messages (if participant is an agent)
    if (participant.agentConfig) {
      // Ensure agent only responds to mediator, not themselves
      if (message.type === UserType.MEDIATOR) {
        await createAgentChatMessageFromPrompt(
          event.params.experimentId,
          participant.currentCohortId,
          [participant.privateId], // Pass agent's own ID as array
          stage.id,
          event.params.chatId,
          participant,
        );
      }
    }
  },
);
