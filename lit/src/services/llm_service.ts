import { ModelResponse } from "../shared/types";
import { LLM_CONFIG } from "../shared/config";
import { Service } from "./service";
import {
  GoogleGenerativeAI,
  GenerationConfig,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

const DEFAULT_FETCH_TIMEOUT = 300 * 1000; // This is the Chrome default
const MAX_TOKENS_FINISH_REASON = "MAX_TOKENS";
const QUOTA_ERROR_CODE = 429;

interface CallPredictRequest {
  prompt: string;
}

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

/**
 * Handles LLM API requests.
 */
export class LLMService extends Service {
  genAI: GoogleGenerativeAI;

  constructor() {
    super();
    this.genAI = new GoogleGenerativeAI(LLM_CONFIG["apiKey"]);
  }

  async callGemini(
    prompt: string,
    generationConfig: GenerationConfig,
    modelName = "gemini-1.5-pro-latest"
  ) {
    const model = this.genAI.getGenerativeModel({
      model: modelName,
      generationConfig,
      safetySettings: SAFETY_SETTINGS,
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;

    if (!response || !response.candidates) {
      console.log('Error: No response');
      return { text: '' };
    }

    const finishReason = response.candidates[0].finishReason;
    if (finishReason === MAX_TOKENS_FINISH_REASON) {
      console.log(
        `Error: Token limit (${generationConfig.maxOutputTokens}) exceeded`
      );
    }

    return { text: response.text() };
  }

  async call(
    promptText: string,
    stopTokens: string[] = [],
    temperature = 0.5,
    topP = 0.1,
    topK = 16
  ): Promise<ModelResponse> {
    const apiKey = LLM_CONFIG["apiKey"];
    const modelName = LLM_CONFIG["modelName"];
    const maxTokens = LLM_CONFIG["maxTokens"];

    // Log the request
    console.log(
      "call",
      "prompt:",
      promptText,
      "stopTokens:",
      stopTokens,
      "maxTokens:",
      maxTokens
    );

    const request: CallPredictRequest = {
      prompt: `${promptText} {{ llm(stop=[${stopTokens
        .map((token) => `"${token}"`)
        .join(",")}], max_tokens=${maxTokens}) }}`,
    };

    const generationConfig = {
      stopSequences: stopTokens,
      maxOutputTokens: maxTokens,
      temperature,
      topP,
      topK,
    };

    let response = { text: "" };
    try {
      response = await this.callGemini(
        promptText,
        generationConfig,
        modelName
      );
    } catch (error: any) {
      if (error.message.includes(QUOTA_ERROR_CODE.toString())) {
        console.log("API quota exceeded");
      } else {
        console.log("API error");
      }
      console.log(error);
    }

    // Log the response
    console.log(response);
    return response;
  }
}
