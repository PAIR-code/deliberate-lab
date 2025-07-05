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
  makeStructuredOutputPrompt,
} from '@deliberation-lab/utils';

import {getGeminiAPIResponse} from './api/gemini.api';
import {getOpenAIAPIChatCompletionResponse} from './api/openai.api';
import {ollamaChat} from './api/ollama.api';

import {app} from './app';

export async function getAgentResponse(
  apiKeyConfig: APIKeyConfig,
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
): Promise<ModelResponse> {
  return await getOpenAIAPIChatCompletionResponse(
    apiKeyConfig.openAIApiKey?.apiKey || '',
    apiKeyConfig.openAIApiKey?.baseUrl || null,
    model,
    prompt,
    generationConfig,
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
