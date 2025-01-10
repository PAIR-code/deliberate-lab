import OpenAI from "openai"

const MAX_TOKENS_FINISH_REASON = "length";

export async function callOpenAITextCompletion(
  apiKey: string,
  prompt: string,
  modelName: string
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

  const response = await client.completions.create({
    model: modelName,
    prompt: prompt
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
  promptText: string
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
    promptText
  );

  let response = { text: "" };
  try {
    response = await callOpenAITextCompletion(
      apiKey,
      promptText,
      modelName
    );
  } catch (error: any) {
    console.error("API error:", error);
  }

  // Log the response
  console.log(response);
  return response;
}
