import {
  GoogleGenerativeAI,
  GenerationConfig,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';

const GEMINI_DEFAULT_MODEL = 'gemini-1.5-pro-latest';
const DEFAULT_FETCH_TIMEOUT = 300 * 1000; // This is the Chrome default
const MAX_TOKENS_FINISH_REASON = 'MAX_TOKENS';
const QUOTA_ERROR_CODE = 429;

const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

/** Makes Gemini API call. */
export async function callGemini(
  apiKey: string,
  prompt: string,
  generationConfig: GenerationConfig,
  modelName = GEMINI_DEFAULT_MODEL,
) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig,
    safetySettings: SAFETY_SETTINGS,
  });

  const result = await model.generateContent(prompt);
  const response = await result.response;

  if (!response || !response.candidates) {
    console.error('Error: No response');
    return {text: ''};
  }

  const finishReason = response.candidates[0].finishReason;
  if (finishReason === MAX_TOKENS_FINISH_REASON) {
    console.error(
      `Error: Token limit (${generationConfig.maxOutputTokens}) exceeded`,
    );
  }

  return {text: response.text()};
}

/** Constructs Gemini API query and returns response. */
export async function getGeminiAPIResponse(
  apiKey: string,
  promptText: string,
  stopSequences: string[] = [],
  maxOutputTokens = 300,
  temperature = 0.5,
  topP = 0.1,
  topK = 16,
): Promise<ModelResponse> {
  const generationConfig = {
    stopSequences,
    maxOutputTokens,
    temperature,
    topP,
    topK,
  };

  let response = {text: ''};
  try {
    response = await callGemini(
      apiKey,
      promptText,
      generationConfig,
      GEMINI_DEFAULT_MODEL,
    );
  } catch (error: any) {
    if (error.message.includes(QUOTA_ERROR_CODE.toString())) {
      console.error('API quota exceeded');
    } else {
      console.error('API error');
    }
    console.error(error);
  }

  return response;
}
