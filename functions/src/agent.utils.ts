import {ApiKeyType, ExperimenterData} from '@deliberation-lab/utils';

import {getGeminiAPIResponse} from './api/gemini.api';
import {getOpenAIAPITextCompletionResponse} from './api/openai.api';
import {ollamaChat} from './api/ollama.api';

export async function getAgentResponse(
  data: ExperimenterData,
  prompt: string,
  agent: AgentConfig,
): Promise<ModelResponse> {
  const keyType = data.apiKeys.activeApiKeyType;
  let response;

  if (keyType === ApiKeyType.GEMINI_API_KEY) {
    response = getGeminiResponse(data, agent.model, prompt, agent.generationConfig);
  } else if (keyType === ApiKeyType.OPENAI_API_KEY) {
    response = getOpenAIAPIResponse(
      data,
      agent.model,
      prompt,
      agent.generationConfig,
    );
  } else if (keyType === ApiKeyType.OLLAMA_CUSTOM_URL) {
    response = await getOllamaResponse(data, agent.model, prompt);
  } else {
    console.error('Error: invalid apiKey type: ', keyType);
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
  // TODO: Replace with new agent model settings
  generationConfig: AgentGenerationConfig,
  ): Promise<ModelResponse> {
  return await getGeminiAPIResponse(
    data.apiKeys.geminiApiKey,
    modelName,
    prompt,
    generationConfig
  );
}

export async function getOpenAIAPIResponse(
  data: ExperimenterData,
  model: string,
  prompt: string,
  // TODO: Replace with new agent model settings
  generationConfig: AgentGenerationConfig,
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
  // TODO: Replace with new agent model settings
  generationConfig: AgentGenerationConfig,
): Promise<ModelResponse> {
  return await ollamaChat([prompt], modelName, data.apiKeys.ollamaApiKey, generationConfig);
}
