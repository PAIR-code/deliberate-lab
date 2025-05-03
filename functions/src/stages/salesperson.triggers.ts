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
  getAgentChatAPIResponse,
  getAgentChatPrompt,
  getChatMessages,
  sendAgentChatMessage,
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

    // Use chats in collection to build chat history for prompt, get num chats
    const chatMessages = await getChatMessages(
      event.params.experimentId,
      event.params.cohortId,
      event.params.stageId,
    );

    // Get agent participants for current cohort and stage
    const activeParticipants = await getFirestoreActiveParticipants(
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
      // Temporary: Always allow a lot of responses for this game!
      promptConfig.chatSettings.maxResponses = 10000;

      const pastStageContext = promptConfig.promptSettings.includeStageHistory
        ? await getPastStagesPromptContext(
            event.params.experimentId,
            stage.id,
            participant.privateId,
            promptConfig.promptSettings.includeStageInfo,
          )
        : '';
      promptConfig.promptContext = await getSalespersonChatPrompt(
        event.params.experimentId,
        participant.privateId,
        participant,
        participant.agentConfig,
        pastStageContext,
        chatMessages,
        promptConfig,
        stage,
      );

      const response = await getAgentChatAPIResponse(
        participant, // profile
        event.params.experimentId,
        participant.publicId,
        pastStageContext,
        chatMessages,
        participant.agentConfig,
        promptConfig,
        stage,
      );

      if (!response) return null;
      const chatMessage = createParticipantChatMessage({
        profile: response.profile,
        discussionId: null,
        message: response.message,
        timestamp: Timestamp.now(),
        senderId: participant.publicId,
        agentId: participant.agentConfig.agentId,
        explanation:
          response.parsed[
            response.promptConfig.structuredOutputConfig?.explanationField
          ] ?? '',
      });

      sendAgentChatMessage(
        chatMessage,
        response,
        chatMessages.length,
        event.params.experimentId,
        event.params.cohortId,
        event.params.stageId,
        event.params.chatId,
      );
    });
  },
);
