import OpenAI from "openai"

const DO_NOT_SUBMIT_HARDCODED_API_KEY = "API_KEY_HERE"
const DO_NOT_SUBMIT_HARDCODED_BASEURL = "https://BASE.URL.HERE/v1"
const MAX_TOKENS_FINISH_REASON = "length";

export async function callOpenAITextCompletion(
  apiKey: string,
  prompt: string
) {
    console.log('callOpenAITextCompletion')
  const client = new OpenAI({
      baseURL: DO_NOT_SUBMIT_HARDCODED_BASEURL,
      apiKey: DO_NOT_SUBMIT_HARDCODED_API_KEY
  });

    const response = await client.completions.create({
        model: "DO_NOT_SUBMIT_hardcoded_model",
        prompt: prompt
    });

  if (!response || !response.choices) {
    console.log('Error: No response');
      
    return { text: '' };
  }

  const finishReason = response.choices[0].finishReason;
  if (finishReason === MAX_TOKENS_FINISH_REASON) {
    console.log(
      `Error: Token limit (${generationConfig.maxOutputTokens}) exceeded`
    );
  }

  return { text: response.choices[0].text };
}

export async function getOpenAIAPITextCompletionResponse(
  apiKey: string,
  promptText: string,
  stopSequences: string[] = [],
  maxOutputTokens = 300,
  temperature = 0.5,
  topP = 0.1,
  topK = 16
): Promise<ModelResponse> {
  // Log the request
  console.log(
    "call",
    "prompt:",
    promptText,
    "stopTokens:",
    stopSequences,
    "maxTokens:",
    maxOutputTokens
  );

  const generationConfig = {
    stopSequences,
    maxOutputTokens,
    temperature,
    topP,
    topK,
  };

  let response = { text: "" };
  try {
    response = await callOpenAITextCompletion(
      apiKey,
      promptText
    );
  } catch (error: any) {
    // if (error.message.includes(QUOTA_ERROR_CODE.toString())) {
    //   console.log("API quota exceeded");
    // } else {
      console.log("API error");
    // }
    console.log(error);
  }

  // Log the response
  console.log(response);
  return response;
}
