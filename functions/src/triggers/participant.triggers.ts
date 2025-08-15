import {
  onDocumentCreated,
  onDocumentUpdated,
} from 'firebase-functions/v2/firestore';

import {
  MediatorProfileExtended,
  ParticipantProfileExtended,
  StageConfig,
  StageKind,
  UserType,
  createChatMessage,
} from '@deliberation-lab/utils';
import {Timestamp} from 'firebase-admin/firestore';
import {startAgentParticipant} from '../agent_participant.utils';
import {
  handleAutomaticTransfer,
  getParticipantRecord,
  initializeParticipantStageAnswers,
} from '../participant.utils';
import {getFirestoreParticipant} from '../utils/firestore';

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

/**
 * When participant enters a new stage, handle initial messages for chat stages
 */
export const onParticipantStageChange = onDocumentUpdated(
  {
    document: 'experiments/{experimentId}/participants/{participantId}',
  },
  async (event) => {
    if (!event.data) return;
    const experimentId = event.params.experimentId;
    const participantId = event.params.participantId;

    const before = event.data.before.data() as ParticipantProfileExtended;
    const after = event.data.after.data() as ParticipantProfileExtended;

    // Check if participant moved to a new stage
    if (before.currentStageId === after.currentStageId) return;

    const firestore = app.firestore();

    // Get the new stage configuration
    const stageDoc = await firestore
      .collection('experiments')
      .doc(experimentId)
      .collection('stages')
      .doc(after.currentStageId)
      .get();

    const stage = stageDoc.data() as StageConfig;
    if (!stage) return;

    console.log(
      `Participant ${participantId} entered stage ${after.currentStageId} of type ${stage.kind}`,
    );

    // Handle initial messages for chat stages
    if (
      stage.kind === StageKind.PRIVATE_CHAT ||
      stage.kind === StageKind.CHAT
    ) {
      console.log(`Sending initial messages for ${stage.kind} stage`);
      await sendInitialChatMessages(
        firestore,
        experimentId,
        participantId,
        after.currentCohortId,
        after.currentStageId,
        stage.kind,
      );
    }
  },
);

/** Helper function to send initial messages for chat stages */
async function sendInitialChatMessages(
  firestore: FirebaseFirestore.Firestore,
  experimentId: string,
  participantId: string,
  cohortId: string,
  stageId: string,
  stageKind: StageKind,
) {
  const isPrivateChat = stageKind === StageKind.PRIVATE_CHAT;

  // For group chat, ensure we only send initial messages once
  if (!isPrivateChat) {
    const publicDataRef = firestore
      .collection('experiments')
      .doc(experimentId)
      .collection('cohorts')
      .doc(cohortId)
      .collection('publicStageData')
      .doc(stageId);

    const shouldSendMessages = await firestore.runTransaction(
      async (transaction) => {
        const publicDataDoc = await transaction.get(publicDataRef);
        const publicData = publicDataDoc.data();

        // Check if initial messages have already been sent
        // Using a custom field to track this
        if (publicData?.initialMessagesSent) {
          return false; // Already sent
        }

        // Mark that we're sending initial messages
        transaction.update(publicDataRef, {
          initialMessagesSent: true,
        });

        return true;
      },
    );

    if (!shouldSendMessages) return;
  }

  // Get all mediators in the cohort
  const mediatorsSnapshot = await firestore
    .collection('experiments')
    .doc(experimentId)
    .collection('mediators')
    .where('currentCohortId', '==', cohortId)
    .get();

  console.log(`Found ${mediatorsSnapshot.size} mediators in cohort`);

  // Send initial messages from mediators active in this stage
  for (const mediatorDoc of mediatorsSnapshot.docs) {
    const mediatorData = mediatorDoc.data() as MediatorProfileExtended;

    console.log(
      `Checking mediator ${mediatorData.publicId}, active in stage: ${mediatorData.activeStageMap?.[stageId]}, has agent config: ${!!mediatorData.agentConfig}`,
    );

    // Check if mediator is active in this stage
    if (!mediatorData.activeStageMap?.[stageId]) continue;

    // Skip if not an agent mediator
    if (!mediatorData.agentConfig) continue;

    // Get the agent's prompt configuration for this stage
    const promptDoc = await firestore
      .collection('experiments')
      .doc(experimentId)
      .collection('agentMediators')
      .doc(mediatorData.agentConfig.agentId)
      .collection('prompts')
      .doc(stageId)
      .get();

    console.log(`Prompt doc exists: ${promptDoc.exists}`);

    if (!promptDoc.exists) continue;

    const promptConfig = promptDoc.data();
    const initialMessage = promptConfig?.chatSettings?.initialMessage;

    console.log(`Initial message configured: "${initialMessage}"`);

    // Send initial message if configured
    if (initialMessage && initialMessage.trim() !== '') {
      const message = createChatMessage({
        message: initialMessage,
        senderId: mediatorData.publicId,
        type: UserType.MEDIATOR,
        profile: {
          name: mediatorData.name,
          avatar: mediatorData.avatar,
          pronouns: mediatorData.pronouns,
        },
        timestamp: Timestamp.now(), // Use admin SDK timestamp
      });

      // Send to appropriate collection based on chat type
      if (isPrivateChat) {
        await firestore
          .collection('experiments')
          .doc(experimentId)
          .collection('participants')
          .doc(participantId)
          .collection('stageData')
          .doc(stageId)
          .collection('privateChats')
          .add(message);
      } else {
        await firestore
          .collection('experiments')
          .doc(experimentId)
          .collection('cohorts')
          .doc(cohortId)
          .collection('publicStageData')
          .doc(stageId)
          .collection('chats')
          .add(message);
      }
    }
  }

  // For group chat, also send initial messages from agent participants
  if (!isPrivateChat) {
    const participantsSnapshot = await firestore
      .collection('experiments')
      .doc(experimentId)
      .collection('participants')
      .where('currentCohortId', '==', cohortId)
      .where('currentStageId', '==', stageId)
      .get();

    for (const participantDoc of participantsSnapshot.docs) {
      const participantData =
        participantDoc.data() as ParticipantProfileExtended;

      // Skip if not an agent participant
      if (!participantData.agentConfig) continue;

      // Get the agent's prompt configuration for this stage
      const promptDoc = await firestore
        .collection('experiments')
        .doc(experimentId)
        .collection('agentParticipants')
        .doc(participantData.agentConfig.agentId)
        .collection('prompts')
        .doc(stageId)
        .get();

      if (!promptDoc.exists) continue;

      const promptConfig = promptDoc.data();
      const initialMessage = promptConfig?.chatSettings?.initialMessage;

      // Send initial message if configured
      if (initialMessage && initialMessage.trim() !== '') {
        const message = createChatMessage({
          message: initialMessage,
          senderId: participantData.publicId,
          type: UserType.PARTICIPANT,
          profile: {
            name: participantData.name,
            avatar: participantData.avatar,
            pronouns: participantData.pronouns,
          },
          timestamp: Timestamp.now(), // Use admin SDK timestamp
        });

        await firestore
          .collection('experiments')
          .doc(experimentId)
          .collection('cohorts')
          .doc(cohortId)
          .collection('publicStageData')
          .doc(stageId)
          .collection('chats')
          .add(message);
      }
    }
  }
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
