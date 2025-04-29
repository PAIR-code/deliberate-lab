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
  callChatAPI,
  canSendAgentChatMessage,
  getAgentChatPrompt,
  getChatMessages,
} from './chat.utils';
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

    // Fetch experiment creator's API key.
    // TODO: Add utils function for getting experiment creator's API key
    const creatorId = (
      await app
        .firestore()
        .collection('experiments')
        .doc(event.params.experimentId)
        .get()
    ).data().metadata.creator;
    const creatorDoc = await app
      .firestore()
      .collection('experimenterData')
      .doc(creatorId)
      .get();
    if (!creatorDoc.exists) return;

    const experimenterData = creatorDoc.data() as ExperimenterData;

    // Get experiment
    const experimentDoc = app
      .firestore()
      .collection('experiments')
      .doc(event.params.experimentId);
    const experiment = (await experimentDoc.get()).data() as Experiment;

    // Use chats in collection to build chat history for prompt, get num chats
    const chatMessages = await getChatMessages(
      event.params.experimentId,
      event.params.cohortId,
      event.params.stageId,
    );

    // Get agent participants for current cohort and stage
    const activeParticipants = getFirestoreActiveParticipants(
      event.params.experimentId,
      event.params.cohortId,
      event.params.stageId,
      true, // must be agent
    );

    // For each agent participant, potentially send chat message
    activeParticipants.forEach(async (participant) => {
      // Get chat prompt
      const promptConfig = createAgentChatPromptConfig(
        stage.id,
        StageKind.CHAT,
        {
          promptContext:
            'You are a participant. Respond in a quick sentence if you would like to say something. Otherwise, do not respond.',
        },
      );
      const pastStageContext = promptConfig.promptSettings.includeStageHistory
        ? await getPastStagesPromptContext(
            event.params.experimentId,
            stage.id,
            participant.privateId,
            promptConfig.promptSettings.includeStageInfo,
          )
        : '';
      const salespersonPrompt = await getSalespersonChatPrompt(
        event.params.experimentId,
        participant.privateId,
        participant,
        participant.agentConfig,
        pastStageContext,
        chatMessages,
        promptConfig,
        stage,
      );

      const chatSettings = promptConfig.chatSettings;
      // Temporary: Always allow a lot of responses for this game!
      chatSettings.maxResponses = 1000;
      if (
        !canSendAgentChatMessage(
          participant.publicId,
          chatSettings,
          chatMessages,
        )
      ) {
        return null;
      }

      const response = await callChatAPI(
        event.params.experimentId,
        participant.privateId,
        participant.publicId,
        participant,
        participant.agentConfig,
        chatMessages,
        promptConfig,
        stage,
        experimenterData,
      );

      if (response) {
        const chatMessage = createParticipantChatMessage({
          profile: response.profile,
          discussionId: null,
          message: response.message,
          timestamp: Timestamp.now(),
          senderId: participant.publicId,
          agentId: participant.agentConfig.agentId,
          explanation: response.parsed.explanation,
        });
        const agentDocument = app
          .firestore()
          .collection('experiments')
          .doc(event.params.experimentId)
          .collection('cohorts')
          .doc(event.params.cohortId)
          .collection('publicStageData')
          .doc(event.params.stageId)
          .collection('chats')
          .doc(chatMessage.id);
        agentDocument.set(chatMessage);
      } // end conditional for writing chat message
    });
  },
);
