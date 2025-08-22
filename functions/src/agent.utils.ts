import {Timestamp} from 'firebase-admin/firestore';
import {
  AgentModelSettings,
  AgentParticipantPromptConfig,
  AgentPersonaConfig,
  APIKeyConfig,
  ApiKeyType,
  ModelGenerationConfig,
  ModelResponseStatus,
  ParticipantProfileExtended,
  ParticipantStatus,
  StageConfig,
  StageKind,
  StructuredOutputConfig,
  UserProfile,
  createModelLogEntry,
  makeStructuredOutputPrompt,
} from '@deliberation-lab/utils';

import {getGeminiAPIResponse} from './api/gemini.api';
import {getOpenAIAPIChatCompletionResponse} from './api/openai.api';
import {ollamaChat} from './api/ollama.api';

import {app} from './app';
import {writeModelLogEntry} from './log.utils';

/** Calls API and writes ModelLogEntry to experiment. */
export async function processModelResponse(
  experimentId: string,
  cohortId: string,
  participantId: string,
  stageId: string,
  userProfile: UserProfile,
  publicId: string,
  privateId: string,
  description: string,
  apiKeyConfig: APIKeyConfig,
  prompt: string,
  modelSettings: AgentModelSettings,
  generationConfig: ModelGenerationConfig,
  structuredOutputConfig?: StructuredOutputConfig,
): Promise<ModelResponse> {
  const log = createModelLogEntry({
    experimentId,
    cohortId,
    participantId,
    stageId,
    userProfile,
    publicId,
    privateId,
    description,
    prompt,
    createdTimestamp: Timestamp.now(),
  });

  let response = {status: ModelResponseStatus.NONE};
  try {
    const queryTimestamp = Timestamp.now();
    response = (await getAgentResponse(
      apiKeyConfig,
      prompt,
      modelSettings,
      generationConfig,
      structuredOutputConfig,
    )) as ModelResponse;
    const responseTimestamp = Timestamp.now();

    log.response = response;
    log.queryTimestamp = queryTimestamp;
    log.responseTimestamp = responseTimestamp;
  } catch (error) {
    console.log(error);
  }

  // Write log
  writeModelLogEntry(experimentId, log);

  return response;
}

// TODO: Rename to getAPIResponse?
export async function getAgentResponse(
  apiKeyConfig: APIKeyConfig,
  prompt: string,
  modelSettings: AgentModelSettings,
  generationConfig: ModelGenerationConfig,
  structuredOutputConfig?: StructuredOutputConfig,
): Promise<ModelResponse> {
  let response;

  if (modelSettings.apiType === ApiKeyType.GEMINI_API_KEY) {
    response = await getGeminiResponse(
      apiKeyConfig,
      modelSettings.modelName,
      prompt,
      generationConfig,
      structuredOutputConfig,
    );
  } else if (modelSettings.apiType === ApiKeyType.OPENAI_API_KEY) {
    response = await getOpenAIAPIResponse(
      apiKeyConfig,
      modelSettings.modelName,
      prompt,
      generationConfig,
      structuredOutputConfig,
    );
  } else if (modelSettings.apiType === ApiKeyType.OLLAMA_CUSTOM_URL) {
    response = await getOllamaResponse(
      apiKeyConfig,
      modelSettings.modelName,
      prompt,
    );
  } else {
    response = {
      status: ModelResponseStatus.CONFIG_ERROR,
      generationConfig,
      errorMessage: `Error: invalid apiKey type: ${apiKeyConfig.ollamaApiKey.apiKey}`,
    };
  }

  if (response.status !== ModelResponseStatus.OK) {
    console.error(
      `GetAgentResponse: response error status: ${response.status}; message: ${response.errorMessage}`,
    );
  }

  return response;
}

export async function getGeminiResponse(
  apiKeyConfig: APIKeyConfig,
  modelName: string,
  prompt: string,
  generationConfig: ModelGenerationConfig,
  structuredOutputConfig?: StructuredOutputConfig,
): Promise<ModelResponse> {
  return await getGeminiAPIResponse(
    apiKeyConfig.geminiApiKey,
    modelName,
    prompt,
    generationConfig,
    structuredOutputConfig,
  );
}

export async function getOpenAIAPIResponse(
  apiKeyConfig: APIKeyConfig,
  model: string,
  prompt: string,
  generationConfig: ModelGenerationConfig,
  structuredOutputConfig?: StructuredOutputConfig,
): Promise<ModelResponse> {
  return await getOpenAIAPIChatCompletionResponse(
    apiKeyConfig.openAIApiKey?.apiKey || '',
    apiKeyConfig.openAIApiKey?.baseUrl || null,
    model,
    prompt,
    generationConfig,
    structuredOutputConfig,
  );
}

export async function getOllamaResponse(
  apiKeyConfig: APIKeyConfig,
  modelName: string,
  prompt: string,
  generationConfig: ModelGenerationConfig,
): Promise<ModelResponse> {
  return await ollamaChat(
    [prompt],
    modelName,
    apiKeyConfig.ollamaApiKey,
    generationConfig,
  );
}
