import {
  onDocumentCreated,
  onDocumentUpdated,
} from 'firebase-functions/v2/firestore';

import {
  ChatPromptConfig,
  ChatStageConfig,
  ChatStagePublicData,
  ParticipantProfileExtended,
  ParticipantStatus,
  StageConfig,
  StageKind,
  shuffleWithSeed,
} from '@deliberation-lab/utils';
import {startAgentParticipant} from '../agent_participant.utils';
import {
  handleAutomaticTransfer,
  getParticipantRecord,
  initializeParticipantStageAnswers,
} from '../participant.utils';
import {
  getFirestoreActiveMediators,
  getFirestoreActiveParticipants,
  getFirestoreParticipant,
  getFirestorePublicStageChatMessages,
  getFirestoreStage,
  getFirestoreStagePublicDataRef,
} from '../utils/firestore';
import {
  canSendAgentChatMessage,
  createAgentChatMessageFromPrompt,
  skipTimedOutTurnBasedAgentTurn,
} from '../chat/chat.agent';
import {getStructuredPromptConfig} from '../structured_prompt.utils';

import {app} from '../app';

/** When participant is created, set participant stage answers. */
export const onParticipantCreation = onDocumentCreated(
  {document: 'experiments/{experimentId}/participants/{participantId}'},
  async (event) => {
    const participant = await getFirestoreParticipant(
      event.params.experimentId,
      event.params.participantId,
    );
    if (!participant) return;

    // Set up participant stage answers
    initializeParticipantStageAnswers(event.params.experimentId, participant);

    // Start making agent calls for participants with agent configs
    startAgentParticipant(event.params.experimentId, participant);
  },
);

/** Advance a turn-based chat if the current speaker is no longer active. */
async function advanceTurnBasedChatIfCurrentParticipantLeft(
  experimentId: string,
  before: ParticipantProfileExtended,
  after: ParticipantProfileExtended,
) {
  if (
    before.currentStatus === after.currentStatus &&
    before.currentStageId === after.currentStageId &&
    before.currentCohortId === after.currentCohortId
  ) {
    return;
  }

  const cohortId = before.currentCohortId;
  const stageId = before.currentStageId;

  const stage = await getFirestoreStage(experimentId, stageId);
  if (stage?.kind !== StageKind.CHAT || !(stage as ChatStageConfig).isTurnBased)
    return;

  const publicStageDataRef = getFirestoreStagePublicDataRef(
    experimentId,
    cohortId,
    stageId,
  );
  const publicStageData = (await publicStageDataRef.get()).data() as
    | ChatStagePublicData
    | undefined;
  const wasCurrentSpeaker =
    publicStageData?.currentTurnParticipantId === before.publicId;

  const [activeParticipants, activeMediators] = await Promise.all([
    getFirestoreActiveParticipants(experimentId, cohortId, stageId, false),
    getFirestoreActiveMediators(experimentId, cohortId, stageId, true),
  ]);
  const activeIds = new Set([
    ...activeMediators.map((mediator) => mediator.publicId),
    ...activeParticipants.map((participant) => participant.publicId),
  ]);

  const isAfterActive =
    after.currentCohortId === cohortId &&
    after.currentStageId === stageId &&
    (after.currentStatus === ParticipantStatus.IN_PROGRESS ||
      after.currentStatus === ParticipantStatus.ATTENTION_CHECK);

  if (!isAfterActive) {
    activeIds.delete(after.publicId);
  }

  if (isAfterActive && activeIds.has(after.publicId)) {
    return;
  }

  const currentTurnParticipantId = await app
    .firestore()
    .runTransaction(async (transaction) => {
      const snapshot = await transaction.get(publicStageDataRef);
      const currentPublicStageData = snapshot.data() as
        | ChatStagePublicData
        | undefined;
      if (!currentPublicStageData) {
        return null;
      }

      const turnOrder = currentPublicStageData.turnOrder ?? [];
      let nextTurnOrder = turnOrder.filter((id) => id !== before.publicId);

      let currentTurnParticipantId =
        currentPublicStageData.currentTurnParticipantId;
      let cycleIndex = currentPublicStageData.cycleIndex ?? 0;

      if (currentTurnParticipantId === before.publicId) {
        const oldIndex = turnOrder.indexOf(before.publicId);
        const filteredTurnOrder = nextTurnOrder;
        const nextActiveId =
          oldIndex === -1
            ? filteredTurnOrder[0]
            : turnOrder.slice(oldIndex + 1).find((id) => activeIds.has(id));

        let nextTurnOrderNew = filteredTurnOrder;
        currentTurnParticipantId = nextActiveId ?? null;
        if (!currentTurnParticipantId && filteredTurnOrder.length > 0) {
          cycleIndex += 1;
          const allMediatorIds = activeMediators.map((m) => m.publicId);
          const allPublicParticipantIds = activeParticipants.map(
            (p) => p.publicId,
          );
          if (allMediatorIds.length > 0) {
            const currentMediators = filteredTurnOrder.filter((id) =>
              allMediatorIds.includes(id),
            );
            const missingMediators = allMediatorIds.filter(
              (id) => !filteredTurnOrder.includes(id),
            );
            const shuffledMissingMediators =
              missingMediators.length > 1
                ? shuffleWithSeed(
                    missingMediators,
                    `${cohortId}-new-mediators-${cycleIndex}`,
                  )
                : missingMediators;
            const nextMediators = [
              ...currentMediators,
              ...shuffledMissingMediators,
            ];
            const hadMediators = filteredTurnOrder.some((id) =>
              allMediatorIds.includes(id),
            );
            if (hadMediators) {
              const shuffledParticipants = shuffleWithSeed(
                allPublicParticipantIds,
                `${cohortId}-${cycleIndex}`,
              );
              nextTurnOrderNew = [...nextMediators, ...shuffledParticipants];
            } else {
              const currentParticipants = filteredTurnOrder.filter((id) =>
                allPublicParticipantIds.includes(id),
              );
              nextTurnOrderNew = [...nextMediators, ...currentParticipants];
            }
          }
          currentTurnParticipantId = nextTurnOrderNew[0] ?? null;
          nextTurnOrder = nextTurnOrderNew;
        }
      }

      transaction.set(
        publicStageDataRef,
        {
          currentTurnParticipantId,
          turnOrder: nextTurnOrder,
          cycleIndex,
        },
        {merge: true},
      );

      return currentTurnParticipantId;
    });

  if (!currentTurnParticipantId || !wasCurrentSpeaker) return;

  const mediator = activeMediators.find(
    (m) => m.publicId === currentTurnParticipantId,
  );
  const participant = activeParticipants.find(
    (p) => p.publicId === currentTurnParticipantId,
  );
  const agent = mediator ?? (participant?.agentConfig ? participant : null);
  if (!agent) return;

  const chatMessages = await getFirestorePublicStageChatMessages(
    experimentId,
    cohortId,
    stageId,
  );
  const triggerChatId = chatMessages[chatMessages.length - 1]?.id ?? '';

  // If the next agent is ineligible (e.g. maxResponses hit), advance past them
  // rather than silently failing and leaving the turn frozen.
  const promptConfig = (await getStructuredPromptConfig(
    experimentId,
    stage,
    agent,
  )) as ChatPromptConfig | undefined;
  if (
    !promptConfig ||
    !canSendAgentChatMessage(
      agent.publicId,
      promptConfig.chatSettings,
      chatMessages,
    )
  ) {
    const skipReason = !promptConfig
      ? 'a missing prompt configuration'
      : 'reaching the response limit';
    await skipTimedOutTurnBasedAgentTurn(
      experimentId,
      cohortId,
      stage as ChatStageConfig,
      triggerChatId,
      agent,
      skipReason,
    );
    return;
  }

  await createAgentChatMessageFromPrompt(
    experimentId,
    cohortId,
    mediator ? activeParticipants.map((p) => p.privateId) : [agent.privateId],
    stageId,
    triggerChatId,
    agent,
  );
}

/** Trigger when a disconnected participant reconnects. */
export const onParticipantReconnect = onDocumentUpdated(
  {
    document: 'experiments/{experimentId}/participants/{participantId}',
  },
  async (event) => {
    if (!event.data) return;
    const experimentId = event.params.experimentId;
    const participantId = event.params.participantId;

    const before = event.data.before.data() as ParticipantProfileExtended;
    const after = event.data.after.data() as ParticipantProfileExtended;

    const stageDoc = app
      .firestore()
      .collection('experiments')
      .doc(experimentId)
      .collection('stages')
      .doc(before.currentStageId);
    const stageConfig = (await stageDoc.get()).data() as
      | StageConfig
      | undefined;

    if (
      stageConfig?.kind === StageKind.CHAT &&
      (stageConfig as ChatStageConfig).isTurnBased
    ) {
      await advanceTurnBasedChatIfCurrentParticipantLeft(
        experimentId,
        before,
        after,
      );
    }

    // Check if participant reconnected
    if (!before.connected && after.connected) {
      const firestore = app.firestore();
      // Fetch the participant's current stage config (outside transaction)
      const stageDocPrecheck = firestore
        .collection('experiments')
        .doc(experimentId)
        .collection('stages')
        .doc(after.currentStageId);
      const stageConfigPrecheck = (
        await stageDocPrecheck.get()
      ).data() as StageConfig;

      if (stageConfigPrecheck?.kind === StageKind.TRANSFER) {
        // Wait 10 seconds before running the transaction, to make sure user's connection is
        // relatively stable
        await new Promise((resolve) => setTimeout(resolve, 10000));
        await firestore.runTransaction(async (transaction) => {
          // Fetch the participant's current stage config again (inside transaction)
          const stageDoc = firestore
            .collection('experiments')
            .doc(experimentId)
            .collection('stages')
            .doc(after.currentStageId);
          const stageConfig = (
            await transaction.get(stageDoc)
          ).data() as StageConfig;

          if (stageConfig?.kind === StageKind.TRANSFER) {
            const participant = await getParticipantRecord(
              transaction,
              experimentId,
              participantId,
            );

            if (!participant) {
              throw new Error('Participant not found');
            }

            // Ensure participant is still connected after the delay
            if (!participant.connected) {
              console.log(
                `Participant ${participantId} is no longer connected after delay, skipping transfer.`,
              );
              return;
            }

            const transferResult = await handleAutomaticTransfer(
              transaction,
              experimentId,
              stageConfig,
              participant,
            );
            if (transferResult) {
              // Store any updates to participant after transfer
              const participantDoc = app
                .firestore()
                .collection('experiments')
                .doc(experimentId)
                .collection('participants')
                .doc(participant.privateId);
              transaction.set(participantDoc, participant);
            }
          }
        });
      }
    }
  },
);
