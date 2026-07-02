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
  buildGeneratePersonaPrompt,
  createModelGenerationConfig,
  ModelResponseStatus,
  DEFAULT_AGENT_MODEL_SETTINGS,
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
  getFirestoreParticipantRef,
  getFirestorePublicStageChatMessages,
  getFirestoreStage,
  getFirestoreStagePublicDataRef,
  getExperimenterDataFromExperiment,
  getStoredPersona,
  saveStoredPersona,
  claimStoredPersonaByHash,
  claimStoredPersonaSketch,
} from '../utils/firestore';
import {
  canSendAgentChatMessage,
  createAgentChatMessageFromPrompt,
  skipTimedOutTurnBasedAgentTurn,
} from '../chat/chat.agent';
import {getAgentResponse} from '../agent.utils';
import {samplePersonaParams} from '../agent_persona_sampling';
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

    let activeParticipant = participant;

    // 1. Generate persona if flagged. This awaits the generation (and any
    // retries) before the participant is initialized below, so a flagged
    // participant stays uninitialized until its persona context is ready.
    if (participant.agentConfig?.needsPersonaGeneration) {
      const experimentId = event.params.experimentId;
      const experimenterData =
        await getExperimenterDataFromExperiment(experimentId);

      if (experimenterData) {
        // Stable key for storing/retrieving this agent's generated persona so
        // it is reused across cohorts. Unset for representatives, which always
        // generate fresh.
        const slotKey = participant.agentConfig.personaSlotKey;
        // Persona bank match key. Set on representatives and inactive
        // personas so they retrieve a pre-generated persona (keyed by the
        // round's variables) rather than generating one.
        const personaHash = participant.agentConfig.personaHash;

        // Apply a persona (stored or freshly generated) to the participant:
        // append it to any context already set at spawn, mark the agent
        // connected, and clear the generation flag.
        const applyPersona = async (generated: string) => {
          await app.firestore().runTransaction(async (transaction) => {
            const pRef = getFirestoreParticipantRef(
              experimentId,
              participant.privateId,
            );
            const pDoc = (
              await transaction.get(pRef)
            ).data() as ParticipantProfileExtended;
            if (pDoc?.agentConfig) {
              // Append the persona to any context already set at spawn (e.g. a
              // representative's framing) rather than overwriting it.
              const base = pDoc.agentConfig.promptContext ?? '';
              pDoc.agentConfig.promptContext = base
                ? `${base}\n\n${generated}`
                : generated;
              pDoc.connected = true;
              pDoc.agentConfig.needsPersonaGeneration = false;
              transaction.set(pRef, pDoc);
              activeParticipant = pDoc;
            }
          });
        };

        const params = samplePersonaParams();
        const generationConfig = createModelGenerationConfig({
          includeReasoning: false,
          providerOptions: {
            google: {thinkingConfig: {thinkingBudget: 0}},
            anthropic: {thinking: {type: 'disabled'}},
          },
        });

        // Fetch stage prompt config to dynamically retrieve configured numRetries
        const stage = await getFirestoreStage(
          experimentId,
          participant.currentStageId,
        );
        const promptConfig = stage
          ? await getStructuredPromptConfig(experimentId, stage, participant)
          : undefined;

        // When the agent is spawned into a chat stage that configures a
        // position prompt, elicit the position alongside the persona in a
        // single call (persona first, then position).
        const positionPrompt =
          stage?.kind === StageKind.CHAT
            ? (stage as ChatStageConfig).personaPositionPrompt
            : undefined;
        const prompt = buildGeneratePersonaPrompt(params, positionPrompt);

        const maxRetries = promptConfig?.numRetries ?? 0;
        const initialDelay = 1000;
        let success = false;

        // Agents that participate directly claim a plain persona sketch from
        // the bank. Sketches are topic-agnostic, so any bucket works; claims
        // are keyed to the human so a participant never gets the same persona
        // twice across rounds. Falls through to live generation if no unused
        // sketch remains.
        const sketchForHumanId =
          participant.agentConfig.personaSketchForHumanId;
        if (sketchForHumanId) {
          const sketch = await claimStoredPersonaSketch(
            experimentId,
            sketchForHumanId,
          );
          if (sketch) {
            console.log(
              `Claimed bank persona SKETCH for participant ${participant.privateId} (human ${sketchForHumanId.slice(0, 8)}).`,
            );
            await applyPersona(sketch);
            success = true;
          }
        }

        // If this agent has a persona-bank match key, claim a pre-generated
        // persona (distinct per participant, reuse spread evenly). Skips LLM
        // generation; falls through to standard generation on no match.
        if (!success && personaHash) {
          const content = await claimStoredPersonaByHash(
            experimentId,
            personaHash,
            participant.privateId,
          );
          if (content) {
            // Content may reference the claiming agent's profile.
            const resolved = content
              .split('{{name}}')
              .join(String(participant.name ?? participant.publicId))
              .split('{{publicId}}')
              .join(participant.publicId);
            console.log(
              `Claimed bank persona for participant ${participant.privateId} (hash ${personaHash.slice(0, 8)}).`,
            );
            await applyPersona(resolved);
            success = true;
          }
        }

        // If this agent has a persona slot and one is already stored for the
        // experiment, reuse it (reproducible across cohorts) and skip the LLM
        // generation entirely.
        if (!success && slotKey) {
          const storedPersona = await getStoredPersona(experimentId, slotKey);
          if (storedPersona) {
            console.log(
              `Reusing stored persona for participant ${participant.privateId} (slot ${slotKey}).`,
            );
            await applyPersona(storedPersona);
            success = true;
          }
        }

        for (let attempt = 0; !success && attempt <= maxRetries; attempt++) {
          try {
            const response = await getAgentResponse(
              experimenterData.apiKeys,
              prompt,
              DEFAULT_AGENT_MODEL_SETTINGS,
              generationConfig,
            );

            if (response.status === ModelResponseStatus.OK && response.text) {
              const generated = response.text;
              // Store the raw generated persona (before the base-append) so it
              // is reused by later cohorts sharing this slot.
              if (slotKey) {
                await saveStoredPersona(experimentId, slotKey, generated);
              }
              await applyPersona(generated);
              success = true;
              break;
            }

            // Check if we should retry
            const shouldRetry =
              attempt < maxRetries &&
              (response.status ===
                ModelResponseStatus.PROVIDER_UNAVAILABLE_ERROR ||
                response.status === ModelResponseStatus.INTERNAL_ERROR ||
                response.status === ModelResponseStatus.UNKNOWN_ERROR);

            if (!shouldRetry) {
              if (attempt === maxRetries) {
                console.error(
                  `Failed to generate persona context: Non-retryable response status: ${response.status}`,
                );
              }
              break;
            }

            const delay = initialDelay * Math.pow(2, attempt);
            console.log(
              `Persona generation API error (${response.status}), retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`,
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
          } catch (error) {
            console.error(`Attempt ${attempt} threw error:`, error);
            if (attempt < maxRetries) {
              const delay = initialDelay * Math.pow(2, attempt);
              await new Promise((resolve) => setTimeout(resolve, delay));
            } else {
              break;
            }
          }
        }

        if (!success) {
          console.error(
            `Failed to generate persona context for participant ${participant.privateId} after ${maxRetries} retries. Reverting to base promptContext.`,
          );
          await app.firestore().runTransaction(async (transaction) => {
            const pRef = getFirestoreParticipantRef(
              experimentId,
              participant.privateId,
            );
            const pDoc = (
              await transaction.get(pRef)
            ).data() as ParticipantProfileExtended;
            if (pDoc?.agentConfig) {
              pDoc.connected = true;
              pDoc.agentConfig.needsPersonaGeneration = false;
              transaction.set(pRef, pDoc);
              activeParticipant = pDoc;
            }
          });
        }
      }
    }

    // Set up participant stage answers
    initializeParticipantStageAnswers(
      event.params.experimentId,
      activeParticipant,
    );

    // Start making agent calls for participants with agent configs
    startAgentParticipant(event.params.experimentId, activeParticipant);
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

  const [allActiveParticipants, activeMediators] = await Promise.all([
    getFirestoreActiveParticipants(experimentId, cohortId, stageId, false),
    getFirestoreActiveMediators(experimentId, cohortId, stageId, true, stage),
  ]);
  const activeParticipants = allActiveParticipants.filter(
    (p) =>
      p.timestamps?.completedStages?.[stageId] === undefined && !p.isObserver,
  );
  const activeIds = new Set([
    ...activeMediators.map((mediator) => mediator.publicId),
    ...activeParticipants.map((participant) => participant.publicId),
  ]);

  const isAfterCompleted =
    after.timestamps?.completedStages?.[stageId] !== undefined;

  const isAfterActive =
    after.currentCohortId === cohortId &&
    after.currentStageId === stageId &&
    (after.currentStatus === ParticipantStatus.IN_PROGRESS ||
      after.currentStatus === ParticipantStatus.ATTENTION_CHECK) &&
    !isAfterCompleted;

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

      if (activeParticipants.length === 0) {
        transaction.set(
          publicStageDataRef,
          {
            currentTurnParticipantId: null,
            turnOrder: [],
          },
          {merge: true},
        );
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
