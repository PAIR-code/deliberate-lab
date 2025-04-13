import {Timestamp} from 'firebase-admin/firestore';
import {
  AgentModelSettings,
  AgentPersonaConfig,
  ApiKeyType,
  ExperimenterData,
  ModelGenerationConfig,
  ParticipantProfileExtended,
  ParticipantStatus,
  StageConfig,
  StageKind,
  StructuredOutputConfig,
  makeStructuredOutputPrompt,
} from '@deliberation-lab/utils';

import {updateParticipantNextStage} from './participant.utils';
import {initiateChatDiscussion} from './stages/chat.utils';
import {getAgentParticipantRankingStageResponse} from './stages/ranking.utils';

import {getGeminiAPIResponse} from './api/gemini.api';
import {getOpenAIAPITextCompletionResponse} from './api/openai.api';
import {ollamaChat} from './api/ollama.api';

import {app} from './app';

export async function getAgentResponse(
  data: ExperimenterData, // TODO: Only pass in API keys
  prompt: string,
  modelSettings: AgentModelSettings,
  generationConfig: ModelGenerationConfig,
  structuredOutputConfig?: StructuredOutputConfig,
): Promise<ModelResponse> {
  let response;

  const structuredOutputPrompt = structuredOutputConfig
    ? makeStructuredOutputPrompt(structuredOutputConfig)
    : '';
  if (structuredOutputPrompt) {
    prompt = `${prompt}\n${structuredOutputPrompt}`;
  }

  if (modelSettings.apiType === ApiKeyType.GEMINI_API_KEY) {
    response = getGeminiResponse(
      data,
      modelSettings.model,
      prompt,
      generationConfig,
      structuredOutputConfig,
    );
  } else if (modelSettings.apiType === ApiKeyType.OPENAI_API_KEY) {
    response = getOpenAIAPIResponse(
      data,
      modelSettings.model,
      prompt,
      generationConfig,
    );
  } else if (modelSettings.model === ApiKeyType.OLLAMA_CUSTOM_URL) {
    response = await getOllamaResponse(data, modelSettings.model, prompt);
  } else {
    console.error(
      'Error: invalid apiKey type: ',
      data.apiKeys.ollamaApiKey.apiKey,
    );
    response = {text: ''};
  }

  return response;
}

// TODO: Refactor model call functions to take in direct API configs,
// not full ExperimenterData

export async function getGeminiResponse(
  data: ExperimenterData,
  modelName: string,
  prompt: string,
  generationConfig: ModelGenerationConfig,
  structuredOutputConfig?: StructuredOutputConfig,
): Promise<ModelResponse> {
  return await getGeminiAPIResponse(
    data.apiKeys.geminiApiKey,
    modelName,
    prompt,
    generationConfig,
    structuredOutputConfig,
  );
}

export async function getOpenAIAPIResponse(
  data: ExperimenterData,
  model: string,
  prompt: string,
  generationConfig: ModelGenerationConfig,
): Promise<ModelResponse> {
  return await getOpenAIAPITextCompletionResponse(
    data.apiKeys.openAIApiKey?.apiKey || '',
    data.apiKeys.openAIApiKey?.baseUrl || null,
    model,
    prompt,
    generationConfig,
  );
}

export async function getOllamaResponse(
  data: ExperimenterData,
  modelName: string,
  prompt: string,
  generationConfig: ModelGenerationConfig,
): Promise<ModelResponse> {
  return await ollamaChat(
    [prompt],
    modelName,
    data.apiKeys.ollamaApiKey,
    generationConfig,
  );
}

/** Return all agent personas for a given experiment. */
export async function getAgentPersonas(experimentId: string) {
  const agentCollection = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('agents');
  return (await agentCollection.get()).docs.map(
    (agent) => agent.data() as AgentPersonaConfig,
  );
}

/** Complete agent participant's current stage. */
export async function completeStageAsAgentParticipant(
  experiment: Experiment,
  participant: ParticipantProfileExtended,
) {
  const experimentId = experiment.id;
  const participantDoc = app
    .firestore()
    .doc(`experiments/${experimentId}/participants/${participant.privateId}`);

  // Only update if participant is active, etc.
  const status = participant.currentStatus;
  if (status !== ParticipantStatus.IN_PROGRESS) {
    return;
  }

  // Ensure participants have start experiment, TOS, and current stage
  // ready marked appropriately
  if (!participant.timestamps.startExperiment) {
    participant.timestamps.startExperiment = Timestamp.now();
  }
  if (!participant.timestamps.acceptedTOS) {
    participant.timestamps.acceptedTOS = Timestamp.now();
  }
  if (!participant.timestamps.readyStages[participant.currentStageId]) {
    participant.timestamps.readyStages[participant.currentStageId] =
      Timestamp.now();
  }

  const completeStage = async () => {
    await updateParticipantNextStage(
      experimentId,
      participant,
      experiment.stageIds,
    );
  };

  const stageDoc = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('stages')
    .doc(participant.currentStageId);
  const stage = (await stageDoc.get()).data() as StageConfig;

  // Fetch experiment creator's API key.
  const creatorId = experiment.metadata.creator;
  const creatorDoc = await app
    .firestore()
    .collection('experimenterData')
    .doc(creatorId)
    .get();
  const experimenterData = creatorDoc.exists
    ? (creatorDoc.data() as ExperimenterData)
    : null;

  // ParticipantAnswer doc
  const answerDoc = app
    .firestore()
    .collection('experiments')
    .doc(experimentId)
    .collection('participants')
    .doc(participant.privateId)
    .collection('stageData')
    .doc(stage.id);

  switch (stage.kind) {
    case StageKind.CHAT:
      // Do not complete stage as agent participant must chat first
      // Instead, check if participant should initiate conversation
      initiateChatDiscussion(
        experimentId,
        participant.currentCohortId,
        stage,
        participant.publicId,
        participant, // profile
        participant.agentConfig, // agent config
      );
      break;
    case StageKind.RANKING:
      if (!experimenterData) {
        console.log('Could not find experimenter data and API key');
        break;
      }
      const rankingAnswer = await getAgentParticipantRankingStageResponse(
        experimentId,
        experimenterData,
        participant,
        stage,
      );
      answerDoc.set(rankingAnswer);
      await completeStage();
      participantDoc.set(participant);
      break;
    default:
      console.log(`Move to next stage (${participant.publicId})`);
      await completeStage();
      participantDoc.set(participant);
  }
}
