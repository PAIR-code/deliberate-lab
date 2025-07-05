import {Timestamp} from 'firebase-admin/firestore';
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

export async function sendAgentParticipantSalespersonMessage(
  experimentId: string,
  cohortId: string,
  stageId: string,
  stage: SalespersonStageConfig,
  chatId: string,
) {
  // Use chats in collection to build chat history for prompt, get num chats
  const chatMessages = await getChatMessages(experimentId, cohortId, stageId);

  // Get agent participants for current cohort and stage
  const activeParticipants = await getFirestoreActiveParticipants(
    experimentId,
    cohortId,
    stageId,
    true, // must be agent
  );

  // For each agent participant, potentially send chat message
  activeParticipants.forEach(async (participant) => {
    // Get chat prompt
    const promptConfig = createAgentChatPromptConfig(stage.id, StageKind.CHAT, {
      promptContext:
        'You are a participant. Respond in a quick sentence if you would like to say something. Otherwise, do not respond.',
    });
    // Temporary: Always allow a lot of responses for this game!
    promptConfig.chatSettings.maxResponses = 10000;

    // TODO: Check prompt items for whether or not to include history
    const pastStageContext = '';
    promptConfig.promptContext = await getSalespersonChatPrompt(
      experimentId,
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
      experimentId,
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
      experimentId,
      cohortId,
      stageId,
      chatId,
    );
  });
}
