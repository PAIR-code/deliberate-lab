import {
  BaseAgentPromptConfig,
  ChatMessage,
  ChatStageConfig,
  StageKind,
  createAgentChatPromptConfig,
  createAgentPromptSettings,
  createMediatorChatMessage,
  createModelGenerationConfig,
  createParticipantChatMessage,
  getDefaultChatPrompt,
  DEFAULT_AGENT_PARTICIPANT_READY_TO_END_CHAT_PROMPT,
  DEFAULT_AGENT_PARTICIPANT_READY_TO_END_CHAT_STRUCTURED_OUTPUT,
} from '@deliberation-lab/utils';
import {Timestamp} from 'firebase-admin/firestore';
import {getAgentResponse} from '../agent.utils';
import {getMediatorsInCohortStage} from '../mediator.utils';
import {
  getExperimenterDataFromExperiment,
  getFirestoreActiveParticipants,
  getFirestoreParticipant,
  getFirestoreParticipantAnswer,
} from '../utils/firestore';
import {
  getAgentChatAPIResponse,
  getAgentChatPrompt,
  getChatMessages,
  sendAgentChatMessage,
  updateParticipantReadyToEndChat,
} from './chat.utils';
import {getPastStagesPromptContext} from './stage.utils';

/** For each agent participant, check if ready to end discussion. */
// TODO: Consolidate API call with agent participant chat message call?
export async function checkAgentsReadyToEndChat(
  experimentId: string,
  cohortId: string,
  stage: ChatStageConfig,
  publicStageData: ChatPublicStageData,
) {
  // Use chats in collection to build chat history for prompt, get num chats
  const chatMessages = await getChatMessages(experimentId, cohortId, stage.id);

  // Get agent participants for current cohort and stage
  const activeParticipants = await getFirestoreActiveParticipants(
    experimentId,
    cohortId,
    stage.id,
    true, // must be agent
  );

  for (const participant of activeParticipants) {
    checkAgentParticipantReadyToEndChat(
      experimentId,
      stage,
      publicStageData,
      chatMessages,
      participant.privateId,
    );
  }
}

/** Check if current agent participant is ready to end discussion. */
export async function checkAgentParticipantReadyToEndChat(
  experimentId: string,
  stage: ChatStageConfig,
  publicStageData: ChatPublicStageData,
  chatMessages: ChatMessage[],
  participantPrivateId: string,
) {
  // Make sure participant has not already moved on
  // to a different stage
  const participant = await getFirestoreParticipant(
    experimentId,
    participantPrivateId,
  );
  if (participant?.currentStageId !== stage.id || !participant?.agentConfig) {
    return;
  }

  const pastStageContext = await getPastStagesPromptContext(
    experimentId,
    stage.id,
    participant.privateId,
    true,
  );

  const promptConfig: BaseAgentPromptConfig = {
    id: stage.id,
    type: StageKind.CHAT,
    promptContext: DEFAULT_AGENT_PARTICIPANT_READY_TO_END_CHAT_PROMPT,
    generationConfig: createModelGenerationConfig(),
    promptSettings: createAgentPromptSettings(),
    structuredOutputConfig:
      DEFAULT_AGENT_PARTICIPANT_READY_TO_END_CHAT_STRUCTURED_OUTPUT,
  };

  const prompt = getDefaultChatPrompt(
    participant,
    participant.agentConfig,
    pastStageContext,
    chatMessages,
    promptConfig,
    stage,
  );

  const response = await getAgentResponse(
    (await getExperimenterDataFromExperiment(experimentId)).apiKeys,
    prompt,
    participant.agentConfig.modelSettings,
    promptConfig.generationConfig,
    promptConfig.structuredOutputConfig,
  );

  // Helper function to parse structured output response
  // TODO: Log API response
  try {
    const cleanedText = response.text!.replace(/```json\s*|\s*```/g, '').trim();
    const parsedResponse = JSON.parse(cleanedText);
    // If ready to end, call function to update participant answer
    if (parsedResponse['response']) {
      updateParticipantReadyToEndChat(
        experimentId,
        stage,
        publicStageData,
        participant,
      );
    }
  } catch {
    // Response is already logged in console during Gemini API call
    console.log('Could not parse JSON!');
    return {};
  }
}

/** If applicable, send agent mediator chat message. */
export async function sendAgentMediatorMessage(
  experimentId: string,
  cohortId: string,
  stage: ChatStageConfig,
  publicStageData: ChatPublicStageData,
  chatId: string,
) {
  // Make sure the conversation hasn't ended.
  if (publicStageData.discussionEndTimestamp) {
    return;
  }

  const stageId = stage.id;

  // Use chats in collection to build chat history for prompt, get num chats
  const chatMessages = await getChatMessages(experimentId, cohortId, stageId);

  // Get mediators for current cohort and stage
  const mediators = await getMediatorsInCohortStage(
    experimentId,
    cohortId,
    stageId,
  );

  // For each active agent mediator, attempt to create/send chat response
  mediators.forEach(async (mediator) => {
    const promptConfig = await getAgentChatPrompt(
      experimentId,
      stageId,
      mediator.agentConfig.agentId,
    );
    if (!promptConfig) return null;
    const response = await getAgentChatAPIResponse(
      mediator, // profile
      experimentId,
      mediator.id,
      '', // no past stage context
      chatMessages,
      mediator.agentConfig,
      promptConfig,
      stage,
    );
    if (!response) return null;

    // Build chat message to send
    const explanation =
      response.parsed[
        response.promptConfig.structuredOutputConfig?.explanationField
      ] ?? '';
    const chatMessage = createMediatorChatMessage({
      profile: response.profile,
      discussionId: publicStageData.currentDiscussionId,
      message: response.message,
      timestamp: Timestamp.now(),
      senderId: response.profileId,
      agentId: response.agentId,
      explanation,
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

/** If applicable, send agent participant chat message. */
export async function sendAgentParticipantMessage(
  experimentId: string,
  cohortId: string,
  stage: ChatStageConfig,
  publicStageData: ChatPublicStageData,
  chatId: string,
) {
  // Make sure the conversation hasn't ended.
  if (publicStageData.discussionEndTimestamp) {
    return;
  }

  const stageId = stage.id;

  // Use chats in collection to build chat history for prompt, get num chats
  const chatMessages = await getChatMessages(experimentId, cohortId, stageId);

  // Get agent participants for current cohort and stage
  const activeParticipants = await getFirestoreActiveParticipants(
    experimentId,
    cohortId,
    stageId,
    true, // must be agent
  );

  // For each active agent participant, attempt to create/send chat response
  activeParticipants.forEach(async (participant) => {
    const promptConfig =
      (await getAgentChatPrompt(
        experimentId,
        stageId,
        participant.agentConfig.agentId,
      )) ??
      createAgentChatPromptConfig(stageId, StageKind.CHAT, {
        promptContext: DEFAULT_AGENT_PARTICIPANT_PROMPT,
      });

    const pastStageContext = promptConfig.promptSettings.includeStageHistory
      ? await getPastStagesPromptContext(
          experimentId,
          stageId,
          participant.privateId,
          promptConfig.promptSettings.includeStageInfo,
        )
      : '';

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

    // Build chat message to send
    const explanation =
      response.parsed[
        response.promptConfig.structuredOutputConfig?.explanationField
      ] ?? '';
    const chatMessage = createParticipantChatMessage({
      profile: response.profile,
      discussionId: publicStageData.currentDiscussionId,
      message: response.message,
      timestamp: Timestamp.now(),
      senderId: response.profileId,
      agentId: response.agentId,
      explanation,
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
