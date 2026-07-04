import {onDocumentCreated} from 'firebase-functions/v2/firestore';
import {
  ChatMessage,
  ChatStageConfig,
  ChatStagePublicData,
  ParticipantStatus,
  StageKind,
  UserType,
  createParticipantProfileBase,
  createSystemChatMessage,
  getQuizPauseCheckpointForCount,
  shuffleWithSeed,
  ChatPromptConfig,
  ParticipantProfileExtended,
  MediatorProfileExtended,
} from '@deliberation-lab/utils';
import {
  getAgentMediatorPrompt,
  getFirestoreActiveMediators,
  getFirestoreActiveParticipants,
  getFirestoreParticipant,
  getFirestoreStage,
  getFirestoreStagePublicData,
  getFirestoreStagePublicDataRef,
  getFirestorePublicStageChatMessages,
} from '../utils/firestore';
import {
  createAgentChatMessageFromPrompt,
  canSendAgentChatMessage,
} from '../chat/chat.agent';
import {sendErrorPrivateChatMessage} from '../chat/chat.utils';
import {handleMaxMessagesReached, startTimeElapsed} from '../stages/chat.time';
import {getStructuredPromptConfig} from '../structured_prompt.utils';
import {app} from '../app';

// ************************************************************************* //
// TRIGGER FUNCTIONS                                                         //
// ************************************************************************* //

/**
 * Start the next agent's turn in a turn-based group chat. This is the single
 * chokepoint that dispatches the next agent message after a turn advances.
 * Exported so the quiz resume path (submitParticipantThought) can
 * re-fire the stalled turn once the pause is cleared. No new chat message
 * arrives to re-trigger onPublicChatMessageCreated, so the resume must be
 * explicit.
 */
export async function triggerNextTurnHolder(
  experimentId: string,
  cohortId: string,
  allParticipantIds: string[], // non-observer participant private IDs (mediator context)
  stageId: string,
  triggerChatId: string,
  nextMediatorHolder: MediatorProfileExtended | null | undefined,
  nextTurnHolder: ParticipantProfileExtended | null | undefined,
) {
  if (nextMediatorHolder) {
    await createAgentChatMessageFromPrompt(
      experimentId,
      cohortId,
      allParticipantIds,
      stageId,
      triggerChatId,
      nextMediatorHolder,
    );
  } else if (nextTurnHolder?.agentConfig) {
    await createAgentChatMessageFromPrompt(
      experimentId,
      cohortId,
      [nextTurnHolder.privateId],
      stageId,
      triggerChatId,
      nextTurnHolder,
    );
  }
}

/** When a chat message is created under publicStageData */
export const onPublicChatMessageCreated = onDocumentCreated(
  {
    document:
      'experiments/{experimentId}/cohorts/{cohortId}/publicStageData/{stageId}/chats/{chatId}',
    memory: '1GiB',
    timeoutSeconds: 300,
  },
  async (event) => {
    if ((event.data?.data() as ChatMessage | undefined)?.isReasoningOnly) {
      return;
    }

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
      case StageKind.CHAT: {
        // Start tracking elapsed time
        startTimeElapsed(
          event.params.experimentId,
          event.params.cohortId,
          publicStageData as ChatStagePublicData,
        );
        // End the discussion globally when the group chat's message cap is
        // reached. A per-mediator override (set on an active mediator's chat
        // settings for this stage) replaces the stage-level maxNumberOfMessages;
        // otherwise the stage value applies. Lets experimenters set a different
        // cap for group chats running certain mediator personas.
        const alreadyEnded = (publicStageData as ChatStagePublicData)
          .discussionEndTimestamp;
        if (!alreadyEnded) {
          const stageMax = (stage as ChatStageConfig).maxNumberOfMessages;
          const activeMediators = await getFirestoreActiveMediators(
            event.params.experimentId,
            event.params.cohortId,
            stage.id,
            true, // checkIsAgent
          );
          const mediatorOverrides: number[] = [];
          const mediatorMinOverrides: number[] = [];
          for (const mediator of activeMediators) {
            const personaId = mediator.agentConfig?.agentId;
            if (!personaId) continue;
            const mediatorPrompt = await getAgentMediatorPrompt(
              event.params.experimentId,
              stage.id,
              personaId,
            );
            const override = mediatorPrompt?.chatSettings?.maxNumberOfMessages;
            if (override != null) mediatorOverrides.push(override);
            const minOverride =
              mediatorPrompt?.chatSettings?.minNumberOfMessages;
            if (minOverride != null) mediatorMinOverrides.push(minOverride);
          }
          // A per-mediator override replaces the stage-level cap for this group
          // chat. If multiple active mediators set one, the most restrictive
          // (smallest) among them applies.
          const effectiveMax =
            mediatorOverrides.length > 0
              ? Math.min(...mediatorOverrides)
              : stageMax;

          // A per-mediator override likewise replaces the stage-level
          // minimum; the largest override wins. Published to publicStageData
          // so the participant view's advance gate honors it, since the
          // frontend cannot read mediator chat settings. Write only when it
          // changes.
          const stageMin = (stage as ChatStageConfig).minNumberOfMessages ?? 0;
          let effectiveMin =
            mediatorMinOverrides.length > 0
              ? Math.max(...mediatorMinOverrides)
              : stageMin;
          // The max cap also caps the advancement requirement: participants can
          // never be required to send more messages than the discussion
          // allows, so the minimum is clamped down to the effective maximum.
          if (effectiveMax != null && effectiveMin > effectiveMax) {
            effectiveMin = effectiveMax;
          }
          // Only publish when an override moves a bound off the stage default.
          // With no override the participant view already falls back to the
          // stage value, so writing nothing leaves the effective bound equal to
          // the stage bound.
          const existingPublic = publicStageData as ChatStagePublicData;
          const effectiveUpdates: {
            effectiveMinNumberOfMessages?: number;
            effectiveMaxNumberOfMessages?: number;
          } = {};
          if (
            effectiveMin !== stageMin &&
            existingPublic.effectiveMinNumberOfMessages !== effectiveMin
          ) {
            effectiveUpdates.effectiveMinNumberOfMessages = effectiveMin;
          }
          // Publish the effective max the same way, so the frontend's
          // conversation-over / banner logic and the send-time cap guard use
          // the cap the backend actually enforces (a per-mediator override
          // replaces the stage value). The frontend otherwise compares against
          // the stage value, hiding the banner before the final message and
          // making the chat look like it ran past the limit.
          if (
            effectiveMax != null &&
            effectiveMax !== stageMax &&
            existingPublic.effectiveMaxNumberOfMessages !== effectiveMax
          ) {
            effectiveUpdates.effectiveMaxNumberOfMessages = effectiveMax;
          }
          if (Object.keys(effectiveUpdates).length > 0) {
            await app
              .firestore()
              .collection('experiments')
              .doc(event.params.experimentId)
              .collection('cohorts')
              .doc(event.params.cohortId)
              .collection('publicStageData')
              .doc(event.params.stageId)
              .set(effectiveUpdates, {merge: true});
          }
          const allChatMessages =
            (await getFirestorePublicStageChatMessages(
              event.params.experimentId,
              event.params.cohortId,
              event.params.stageId,
            )) ?? [];
          // `isReasoningOnly` is an optional field; when it is not set the
          // access resolves to undefined (falsy), so a message is only
          // excluded when the field is present and true. Keeps the backend
          // cap aligned with the frontend, which excludes reasoning-only
          // messages from chatMap entirely.
          const cohortMessageCount = allChatMessages.filter(
            (m) =>
              m.type !== UserType.SYSTEM &&
              !m.isError &&
              !(m as {isReasoningOnly?: boolean}).isReasoningOnly,
          ).length;
          // Quiz-participant presence + quiz state. Computed before the cap check so
          // the after-final-message quiz can pause the cap.
          const cohortParticipants = await getFirestoreActiveParticipants(
            event.params.experimentId,
            event.params.cohortId,
            stage.id,
            false, // Get all participants
            true, // Include observers
          );
          // Quiz applies per the participant's _isQuizzed variable, and only
          // in turn-based chats (the pause gates the next agent turn);
          // otherwise the variable is ignored.
          const hasQuizParticipant =
            (stage as ChatStageConfig).isTurnBased === true &&
            cohortParticipants.some((p) => p.isQuizzed);
          const answeredCheckpoint = existingPublic.quizAnsweredCheckpoint ?? 0;
          const alreadyPaused = (existingPublic.quizPauseCheckpoint ?? 0) > 0;
          // Checkpoints are thirds of the effective minimum message count
          // (fewer than 3 quizzes when the minimum is under 3; none without a
          // minimum).
          const newCheckpoint = getQuizPauseCheckpointForCount(
            cohortMessageCount,
            effectiveMin,
          );

          if (effectiveMax != null && cohortMessageCount >= effectiveMax) {
            // Final message sent -> end the discussion. If a participant
            // still owes the after-final quiz (the last checkpoint quiz),
            // also raise its pause so they answer before proceeding; the chat
            // is ended either way, and submitting just clears the quiz (its
            // turn-resume is then a no-op against the already-ended discussion).
            if (
              hasQuizParticipant &&
              !alreadyPaused &&
              newCheckpoint >= 1 &&
              answeredCheckpoint < newCheckpoint
            ) {
              await getFirestoreStagePublicDataRef(
                event.params.experimentId,
                event.params.cohortId,
                event.params.stageId,
              ).update({quizPauseCheckpoint: newCheckpoint});
            }
            await handleMaxMessagesReached(
              event.params.experimentId,
              event.params.cohortId,
              event.params.stageId,
            );
            return;
          }

          // Intermediate quizzes (~1/3 and ~2/3 through): pause at a new
          // checkpoint below the cap so the participant answers; cleared and the
          // turn resumed on submit. Only the pause flag is set: the frontend
          // renders the "paused" banner and suppresses the typing indicator.
          // No system chat message is posted, since it read like a real
          // message and left a stale typing indicator.
          if (
            hasQuizParticipant &&
            !alreadyPaused &&
            newCheckpoint > answeredCheckpoint &&
            newCheckpoint >= 1
          ) {
            await getFirestoreStagePublicDataRef(
              event.params.experimentId,
              event.params.cohortId,
              event.params.stageId,
            ).update({quizPauseCheckpoint: newCheckpoint});
          }
        }
        break;
      }
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
      true, // Include observers
    );

    const allParticipantIds = allParticipants
      .filter((p) => !p.isObserver)
      .map((p) => p.privateId);

    const chatStage = stage as ChatStageConfig;
    const chatPublicData = publicStageData as ChatStagePublicData;

    if (chatStage.isTurnBased) {
      const message = event.data?.data() as ChatMessage;
      if (!message) return;
      if (message.type === UserType.SYSTEM) return;
      if (message.type === UserType.EXPERIMENTER) return;

      const chatMessages = await getFirestorePublicStageChatMessages(
        event.params.experimentId,
        event.params.cohortId,
        event.params.stageId,
      );

      const mediators = await getFirestoreActiveMediators(
        event.params.experimentId,
        event.params.cohortId,
        stage.id,
        true, // get AI mediators
        stage,
      );
      const allMediatorIds = mediators.map((m) => m.publicId);

      let nextTurnParticipantId: string | null = null;
      let shouldTriggerAgent = false;
      let nextTurnHolder: ParticipantProfileExtended | null | undefined = null;
      let nextMediatorHolder: MediatorProfileExtended | null | undefined = null;
      let wasTurnHolderDroppedOut = false;

      const publicStageDataRef = app
        .firestore()
        .collection('experiments')
        .doc(event.params.experimentId)
        .collection('cohorts')
        .doc(event.params.cohortId)
        .collection('publicStageData')
        .doc(event.params.stageId);

      await app.firestore().runTransaction(async (transaction) => {
        // Reset closure variables on every retry attempt to prevent retry contamination!
        shouldTriggerAgent = false;
        nextTurnHolder = null;
        nextMediatorHolder = null;
        wasTurnHolderDroppedOut = false;

        const snapshot = await transaction.get(publicStageDataRef);
        const chatPublicData = snapshot.data() as
          | ChatStagePublicData
          | undefined;
        if (!chatPublicData) return;

        let turnOrder = chatPublicData.turnOrder ?? [];
        let currentTurnParticipantId = chatPublicData.currentTurnParticipantId;
        let cycleIndex = chatPublicData.cycleIndex ?? 0;

        // Get active IDs for validation and filtering. Filter out completed/booted/timed-out participants and observers.
        const activeParticipants = allParticipants.filter((p) => {
          if (p.isObserver) return false;
          if (p.agentConfig?.isInactivePersona) return false;
          if (
            p.currentCohortId !== undefined &&
            p.currentCohortId !== event.params.cohortId
          )
            return false;
          if (
            p.currentStageId !== undefined &&
            p.currentStageId !== event.params.stageId
          )
            return false;
          const isExplicitlyInactive =
            p.currentStatus !== undefined &&
            p.currentStatus !== ParticipantStatus.IN_PROGRESS &&
            p.currentStatus !== ParticipantStatus.ATTENTION_CHECK;
          const isExplicitlyCompleted =
            p.timestamps?.completedStages?.[event.params.stageId] !== undefined;
          return !isExplicitlyInactive && !isExplicitlyCompleted;
        });

        // Pause turn-taking once there are no active (non-observer)
        // participants left, unless an observer is present to watch the
        // agents. Without an observer, the chat pauses as before so the
        // mediator does not monologue after every participant has left.
        const hasObserver = allParticipants.some((p) => p.isObserver);
        if (
          activeParticipants.length === 0 &&
          (allMediatorIds.length === 0 || !hasObserver)
        ) {
          transaction.set(
            publicStageDataRef,
            {
              currentTurnParticipantId: null,
              turnOrder: [],
              turnProcessedMessageId: message.id,
            },
            {merge: true},
          );
          return;
        }

        const allPublicParticipantIds = activeParticipants.map(
          (p) => p.publicId,
        );
        const activeIds = [...allMediatorIds, ...allPublicParticipantIds];

        // Filter turnOrder to only include currently active/non-dropped-out IDs
        const originalTurnOrder = [...turnOrder];
        const filteredTurnOrder = turnOrder.filter((id: string) =>
          activeIds.includes(id),
        );

        const currentMediators = filteredTurnOrder.filter((id) =>
          allMediatorIds.includes(id),
        );
        const missingMediators = allMediatorIds.filter(
          (id) => !filteredTurnOrder.includes(id),
        );
        const currentParticipants = filteredTurnOrder.filter((id) =>
          allPublicParticipantIds.includes(id),
        );
        const missingParticipants = allPublicParticipantIds.filter(
          (id) => !filteredTurnOrder.includes(id),
        );

        turnOrder = [
          ...currentMediators,
          ...missingMediators,
          ...currentParticipants,
          ...missingParticipants,
        ];

        // If the current turn holder is no longer active (e.g., dropped out), auto-advance!
        if (
          currentTurnParticipantId &&
          !activeIds.includes(currentTurnParticipantId)
        ) {
          wasTurnHolderDroppedOut = true;
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
            let nextTurnOrder = [...turnOrder];
            const hasMediators = allMediatorIds.length > 0;
            if (hasMediators) {
              const currentMediators = turnOrder.filter((id) =>
                allMediatorIds.includes(id),
              );
              const missingMediators = allMediatorIds.filter(
                (id) => !turnOrder.includes(id),
              );
              const shuffledMissingMediators =
                missingMediators.length > 1
                  ? shuffleWithSeed(
                      missingMediators,
                      `${event.params.cohortId}-${event.params.stageId}-new-mediators-${cycleIndex}`,
                    )
                  : missingMediators;
              const nextMediators = [
                ...currentMediators,
                ...shuffledMissingMediators,
              ];

              const hadMediators = turnOrder.some((id) =>
                allMediatorIds.includes(id),
              );
              if (hadMediators) {
                const seedString = `${event.params.cohortId}-${event.params.stageId}-${cycleIndex}`;
                const shuffledParticipants = shuffleWithSeed(
                  allPublicParticipantIds,
                  seedString,
                );
                nextTurnOrder = [...nextMediators, ...shuffledParticipants];
              } else {
                const currentParticipants = turnOrder.filter((id) =>
                  allPublicParticipantIds.includes(id),
                );
                nextTurnOrder = [...nextMediators, ...currentParticipants];
              }
            }
            turnOrder = nextTurnOrder;
            currentTurnParticipantId = turnOrder[0] ?? null;
          }
        }

        // 1. Initialize turn order if uninitialized or empty
        if (!currentTurnParticipantId || turnOrder.length === 0) {
          cycleIndex = 0;
          const seedString = `${event.params.cohortId}-${event.params.stageId}-${cycleIndex}`;
          const shuffledParticipants = shuffleWithSeed(
            allPublicParticipantIds,
            seedString,
          );

          // Shuffle mediator order when conversation begins (only if multiple)
          const shuffledMediators =
            allMediatorIds.length > 1
              ? shuffleWithSeed(
                  allMediatorIds,
                  `${event.params.cohortId}-${event.params.stageId}-mediators`,
                )
              : allMediatorIds;

          turnOrder = [...shuffledMediators, ...shuffledParticipants];
          currentTurnParticipantId = turnOrder[0] ?? null;

          const senderIsInitialTurnHolder =
            message.senderId === currentTurnParticipantId;

          transaction.set(
            publicStageDataRef,
            {
              ...(senderIsInitialTurnHolder ? {} : {currentTurnParticipantId}),
              turnOrder,
              cycleIndex,
            },
            {merge: true},
          );
        }

        // 2. If it is not the message sender's turn, do not advance
        const isSenderActive =
          mediators.some((m) => m.publicId === message.senderId) ||
          allParticipants.some((p) => p.publicId === message.senderId);

        const turnOrderChanged =
          JSON.stringify(originalTurnOrder) !== JSON.stringify(turnOrder);
        const turnHolderChanged =
          chatPublicData?.currentTurnParticipantId !== currentTurnParticipantId;

        if (message.senderId !== currentTurnParticipantId && isSenderActive) {
          if (turnOrderChanged || turnHolderChanged) {
            transaction.set(
              publicStageDataRef,
              {
                currentTurnParticipantId,
                turnOrder,
                cycleIndex,
                turnProcessedMessageId: message.id,
              },
              {merge: true},
            );

            shouldTriggerAgent = true;
            nextTurnHolder = allParticipants.find(
              (p) => p.publicId === currentTurnParticipantId,
            );
            nextMediatorHolder = mediators.find(
              (m) => m.publicId === currentTurnParticipantId,
            );
          } else {
            transaction.set(
              publicStageDataRef,
              {turnProcessedMessageId: message.id},
              {merge: true},
            );
          }
          return;
        }

        if (message.senderId === currentTurnParticipantId || !isSenderActive) {
          // 3. Advance turn
          nextTurnParticipantId = currentTurnParticipantId;
          let nextIndex = turnOrder.indexOf(message.senderId);

          // GRACEFUL OMISSION:
          // If nextIndex is -1 (the sender completed/left/booted and is no longer in turnOrder),
          // do NOT reset/scramble cycleIndex or turnOrder!
          // Instead, gracefully set nextIndex to the current turn position or find the first active speaker!
          if (nextIndex === -1) {
            nextIndex = turnOrder.indexOf(currentTurnParticipantId);
            if (nextIndex === -1) nextIndex = 0;
          }

          let attempts = 0;
          let foundCandidate = false;

          while (attempts < turnOrder.length) {
            if (nextIndex === turnOrder.length - 1) {
              // Cycle repeats!
              cycleIndex += 1;

              let nextTurnOrder = [...turnOrder];
              const hasMediators = allMediatorIds.length > 0;
              if (hasMediators) {
                const currentMediators = turnOrder.filter((id) =>
                  allMediatorIds.includes(id),
                );
                const missingMediators = allMediatorIds.filter(
                  (id) => !turnOrder.includes(id),
                );
                const shuffledMissingMediators =
                  missingMediators.length > 1
                    ? shuffleWithSeed(
                        missingMediators,
                        `${event.params.cohortId}-${event.params.stageId}-new-mediators-${cycleIndex}`,
                      )
                    : missingMediators;
                const nextMediators = [
                  ...currentMediators,
                  ...shuffledMissingMediators,
                ];

                const hadMediators = turnOrder.some((id) =>
                  allMediatorIds.includes(id),
                );

                if (hadMediators) {
                  const seedString = `${event.params.cohortId}-${event.params.stageId}-${cycleIndex}`;
                  const shuffledParticipants = shuffleWithSeed(
                    allPublicParticipantIds,
                    seedString,
                  );
                  nextTurnOrder = [...nextMediators, ...shuffledParticipants];
                } else {
                  // Preserve the stable human ordering
                  const currentParticipants = turnOrder.filter((id) =>
                    allPublicParticipantIds.includes(id),
                  );
                  nextTurnOrder = [...nextMediators, ...currentParticipants];
                }
              }

              turnOrder = nextTurnOrder;
              nextIndex = 0;
            } else {
              nextIndex += 1;
            }

            nextTurnParticipantId = turnOrder[nextIndex];

            const candidate =
              allParticipants.find(
                (p) => p.publicId === nextTurnParticipantId,
              ) || mediators.find((m) => m.publicId === nextTurnParticipantId);

            if (!candidate || !activeIds.includes(nextTurnParticipantId)) {
              attempts++;
              continue;
            }

            // If the candidate is an AI agent, check whether it can send a message
            if (candidate.agentConfig) {
              const promptConfig = (await getStructuredPromptConfig(
                event.params.experimentId,
                stage,
                candidate,
              )) as ChatPromptConfig | undefined;

              if (
                !promptConfig ||
                !canSendAgentChatMessage(
                  candidate.publicId,
                  promptConfig.chatSettings,
                  chatMessages ?? [],
                )
              ) {
                attempts++;
                continue;
              }
            }

            foundCandidate = true;
            break;
          }

          if (foundCandidate) {
            currentTurnParticipantId = nextTurnParticipantId;

            transaction.set(
              publicStageDataRef,
              {
                currentTurnParticipantId,
                turnOrder,
                cycleIndex,
                turnProcessedMessageId: message.id,
              },
              {merge: true},
            );

            shouldTriggerAgent = true;
            nextTurnHolder = allParticipants.find(
              (p) => p.publicId === currentTurnParticipantId,
            );
            nextMediatorHolder = mediators.find(
              (m) => m.publicId === currentTurnParticipantId,
            );
          } else {
            transaction.set(
              publicStageDataRef,
              {turnProcessedMessageId: message.id},
              {merge: true},
            );
          }
        }
      });

      // 4. Outside Transaction: Trigger the next speaker or delete out-of-turn messages
      const currentSnapshot = await publicStageDataRef.get();
      const updatedPublicStageData = currentSnapshot.data() as
        | ChatStagePublicData
        | undefined;
      const updatedTurnParticipantId =
        updatedPublicStageData?.currentTurnParticipantId;
      const updatedTurnOrder = updatedPublicStageData?.turnOrder ?? [];
      const isSenderActive =
        mediators.some((m) => m.publicId === message.senderId) ||
        allParticipants.some((p) => p.publicId === message.senderId);

      const originalTurnParticipantId =
        publicStageData?.currentTurnParticipantId;

      if (
        message.senderId !== originalTurnParticipantId &&
        message.senderId !== updatedTurnParticipantId &&
        isSenderActive
      ) {
        // Delete out-of-turn messages
        const messageRef = event.data?.ref;
        if (messageRef) {
          await messageRef.delete();
        }

        // Fallback to trigger initial agent message if first turn holder hasn't spoken
        // and the conversation is empty (excluding system messages).
        const nonSystemMessages = (chatMessages ?? []).filter(
          (m) => m.type !== UserType.SYSTEM,
        );
        if (
          nonSystemMessages.length === 0 &&
          updatedTurnParticipantId &&
          updatedTurnOrder.indexOf(updatedTurnParticipantId) === 0
        ) {
          const mediator = mediators.find(
            (m) => m.publicId === updatedTurnParticipantId,
          );
          const participant = allParticipants.find(
            (p) => p.publicId === updatedTurnParticipantId,
          );
          const agent =
            mediator ?? (participant?.agentConfig ? participant : null);
          if (agent) {
            await createAgentChatMessageFromPrompt(
              event.params.experimentId,
              event.params.cohortId,
              mediator ? allParticipantIds : [agent.privateId],
              stage.id,
              '', // empty triggerChatId indicates initial message
              agent,
            );
          }
        }
      }

      if (shouldTriggerAgent && updatedTurnParticipantId) {
        // Quiz pause: while the chat is paused for a quiz, do not start the
        // next agent turn. turnOrder / currentTurnParticipantId / cycleIndex
        // are already persisted, so the turn resumes cleanly when the
        // participant submits (see submitParticipantThought ->
        // triggerNextTurnHolder).
        if ((updatedPublicStageData?.quizPauseCheckpoint ?? 0) > 0) {
          return;
        }
        const finalTriggerChatId = wasTurnHolderDroppedOut ? '' : message.id;
        await triggerNextTurnHolder(
          event.params.experimentId,
          event.params.cohortId,
          allParticipantIds,
          stage.id,
          finalTriggerChatId,
          nextMediatorHolder,
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
        stage,
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
          p.agentConfig &&
          !p.agentConfig.isInactivePersona &&
          p.currentStatus === ParticipantStatus.IN_PROGRESS,
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
    if (message.isError || message.isReasoningOnly) {
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
      stage,
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
