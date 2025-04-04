import {
  AgentModelSettings,
  AgentPersonaConfig,
  ApiKeyType,
  ExperimenterData,
  ModelGenerationConfig,
  StructuredOutputConfig,
  makeStructuredOutputPrompt,
} from '@deliberation-lab/utils';

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
