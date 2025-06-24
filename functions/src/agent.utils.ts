import {Timestamp} from 'firebase-admin/firestore';
import {
  AgentModelSettings,
  AgentParticipantPromptConfig,
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

import {ModelResponseStatus} from './api/model.response';
import {getGeminiAPIResponse} from './api/gemini.api';
import {getOpenAIAPIChatCompletionResponse} from './api/openai.api';
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
    response = await getGeminiResponse(
      data,
      modelSettings.modelName,
      prompt,
      generationConfig,
      structuredOutputConfig,
    );
  } else if (modelSettings.apiType === ApiKeyType.OPENAI_API_KEY) {
    response = await getOpenAIAPIResponse(
      data,
      modelSettings.modelName,
      prompt,
      generationConfig,
      structuredOutputConfig,
    );
  } else if (modelSettings.apiType === ApiKeyType.OLLAMA_CUSTOM_URL) {
    response = await getOllamaResponse(data, modelSettings.modelName, prompt);
  } else {
    response = {
      status: ModelResponseStatus.CONFIG_ERROR,
      errorMessage: `Error: invalid apiKey type: ${data.apiKeys.ollamaApiKey.apiKey}`,
    };
  }

  if (response.status !== ModelResponseStatus.OK) {
    console.error(
      `GetAgentResponse: response error status: ${response.status}; message: ${response.errorMessage}`,
    );
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
  return await getOpenAIAPIChatCompletionResponse(
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
