import OpenAI from 'openai';
import {ModelGenerationConfig} from '@deliberation-lab/utils';
import {ModelResponse} from './model.response';

const MAX_TOKENS_FINISH_REASON = 'length';

export async function callOpenAITextCompletion(
  apiKey: string,
  baseUrl: string | null,
  modelName: string,
  prompt: string,
  generationConfig: ModelGenerationConfig,
) {
  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: baseUrl,
  });

  const customFields = Object.fromEntries(
    generationConfig.customRequestBodyFields.map((field) => [
      field.name,
      field.value,
    ]),
  );
  const response = await client.completions.create({
    model: modelName,
    prompt: prompt,
    temperature: generationConfig.temperature,
    top_p: generationConfig.topP,
    frequency_penalty: generationConfig.frequencyPenalty,
    presence_penalty: generationConfig.presencePenalty,
    ...customFields,
  });

  if (!response || !response.choices) {
    console.error('Error: No response');

    return {text: ''};
  }

  const finishReason = response.choices[0].finish_reason;
  if (finishReason === MAX_TOKENS_FINISH_REASON) {
    console.error(`Error: Token limit exceeded`);
  }

  return {text: response.choices[0].text};
}

export async function getOpenAIAPITextCompletionResponse(
  apiKey: string,
  baseUrl: string | null,
  modelName: string,
  promptText: string,
  generationConfig: ModelGenerationConfig,
): Promise<ModelResponse> {
  if (!modelName) {
    console.warn('OpenAI API model name not set.');
  }
  if (!apiKey) {
    console.warn('OpenAI API key not set.');
  }
  // Log the request
  console.log(
    'call',
    'modelName:',
    modelName,
    'prompt:',
    promptText,
    'generationConfig:',
    generationConfig,
  );

  let response = {text: ''};
  try {
    response = await callOpenAITextCompletion(
      apiKey,
      baseUrl,
      modelName,
      promptText,
      generationConfig,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('API error:', error);
  }

  // Log the response
  console.log(response);
  return response;
}
