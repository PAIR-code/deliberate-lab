import {
  ApiKeyType,
  ExperimenterData,
} from '@deliberation-lab/utils';

import { getGeminiAPIResponse } from './api/gemini.api';
import { getOpenAIAPITextCompletionResponse } from './api/openai.api';
import { ollamaChat } from './api/ollama.api';

export async function getAgentResponse(data: ExperimenterData, prompt: string): Promise<ModelResponse> {
  const keyType = data.apiKeys.activeApiKeyType;
  let response;

  if (process.env.OPENAI_BASE_URL) {
    response = getOpenAIAPITextCompletionResponse(
      process.env.OPENAI_API_KEY,
      process.env.OPENAI_MODEL_NAME,
      prompt)
  } else if (keyType === ApiKeyType.GEMINI_API_KEY) {
    response =  getGeminiResponse(data, prompt);
  } else if (keyType === ApiKeyType.OLLAMA_CUSTOM_URL) {
    response = await getOllamaResponse(data, prompt);
  } else {
    console.error("Error: invalid apiKey type: ", keyType)
    response = {text: ""};
  }

  return response
}

export async function getGeminiResponse(data: ExperimenterData, prompt: string): Promise<ModelResponse> {
  return await getGeminiAPIResponse(data.apiKeys.geminiApiKey, prompt);
}

export async function getOllamaResponse(data: ExperimenterData, prompt: string): Promise<ModelResponse> {
  return await ollamaChat([prompt], data.apiKeys.ollamaApiKey);
}
