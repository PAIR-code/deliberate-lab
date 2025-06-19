import {
  BaseAgentPromptConfig,
  ChatMessage,
  ChatStageConfig,
  ChatStagePublicData,
  ParticipantProfileExtended,
  StageKind,
  createAgentPromptSettings,
  createModelGenerationConfig,
  getDefaultChatPrompt,
  DEFAULT_AGENT_PARTICIPANT_READY_TO_END_CHAT_PROMPT,
  DEFAULT_AGENT_PARTICIPANT_READY_TO_END_CHAT_STRUCTURED_OUTPUT,
} from '@deliberation-lab/utils';

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {Timestamp} from 'firebase-admin/firestore';
import {onCall} from 'firebase-functions/v2/https';

import {app} from '../app';
import {getAgentResponse} from '../agent.utils';
import {
  getExperimenterDataFromExperiment,
  getFirestoreActiveParticipants,
  getFirestoreParticipant,
  getFirestoreParticipantAnswer,
  getFirestoreStage,
  getFirestoreStagePublicData,
} from '../utils/firestore';
import {getChatMessages, updateParticipantReadyToEndChat} from './chat.utils';
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
    await getExperimenterDataFromExperiment(experimentId),
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
      const participantAnswer = await getFirestoreParticipantAnswer(
        experimentId,
        participant.privateId,
        stage.id,
      );
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
