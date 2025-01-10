import OpenAI from "openai"
import {
  AgentGenerationConfig
} from '@deliberation-lab/utils';

const MAX_TOKENS_FINISH_REASON = "length";

export async function callOpenAITextCompletion(
  apiKey: string,
  prompt: string,
  modelName: string,
  generationConfig: agentGenerationConfig
) {
  const baseURL = process.env.OPENAI_BASE_URL;
  if (!baseURL) {
    console.error(
      'OpenAI error: base URL not set. Please configure the environment variable OPENAI_BASE_URL.');
    return { text: '' };
  }
  const client = new OpenAI({
    baseURL: baseURL,
    apiKey: process.env.OPENAI_API_KEY
  });

  const customFields = Object.fromEntries(
    generationConfig.customRequestBodyFields.map((field) => [field.name, field.value])
  );
  const response = await client.completions.create({
    model: modelName,
    prompt: prompt,
    temperature: generationConfig.temperature,
    top_p: generationConfig.topP,
    frequency_penalty: generationConfig.frequencyPenalty,
    presence_penalty: generationConfig.presencePenalty,
    // @ts-expect-error allow extra request fields
    ...customFields
  });

  if (!response || !response.choices) {
    console.error('Error: No response');
      
    return { text: '' };
  }

  const finishReason = response.choices[0].finishReason;
  if (finishReason === MAX_TOKENS_FINISH_REASON) {
    console.error(
      `Error: Token limit exceeded`
    );
  }

  return { text: response.choices[0].text };
}

export async function getOpenAIAPITextCompletionResponse(
  apiKey: string,
  modelName: string,
  promptText: string,
  generationConfig: AgentGenerationConfig
): Promise<ModelResponse> {
  if (!modelName) {
    console.warn(
      'Environment variable OPENAI_MODEL_NAME not set.');
  }
  if (!apiKey) {
    console.warn(
      'Environment variable OPENAI_API_KEY not set.');
  }
  // Log the request
  console.log(
    "call",
    "modelName:",
    modelName,
    "prompt:",
    promptText,
    "generationConfig:",
    generationConfig
  );

  let response = { text: "" };
  try {
    response = await callOpenAITextCompletion(
      apiKey,
      promptText,
      modelName,
      generationConfig
    );
  } catch (error: any) {
    console.error("API error:", error);
  }

  // Log the response
  console.log(response);
  return response;
}
