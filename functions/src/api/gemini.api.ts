import {
  ApiError,
  GoogleGenAI,
  GenerationConfig,
  GenerateContentConfig,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/genai';
import {
  ModelGenerationConfig,
  StructuredOutputType,
  StructuredOutputDataType,
  StructuredOutputConfig,
  StructuredOutputSchema,
  ModelResponseStatus,
  ModelResponse,
  addParsedModelResponse,
} from '@deliberation-lab/utils';

const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_FETCH_TIMEOUT = 300 * 1000; // This is the Chrome default
const MAX_TOKENS_FINISH_REASON = 'MAX_TOKENS';
const AUTHENTICATION_FAILURE_ERROR_CODE = 403;
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

function makeStructuredOutputSchema(schema: StructuredOutputSchema): object {
  const typeMap: {[key in StructuredOutputDataType]?: string} = {
    [StructuredOutputDataType.STRING]: 'STRING',
    [StructuredOutputDataType.NUMBER]: 'NUMBER',
    [StructuredOutputDataType.INTEGER]: 'INTEGER',
    [StructuredOutputDataType.BOOLEAN]: 'BOOLEAN',
    [StructuredOutputDataType.ARRAY]: 'ARRAY',
    [StructuredOutputDataType.OBJECT]: 'OBJECT',
    [StructuredOutputDataType.ENUM]: 'STRING',
  };
  const type = typeMap[schema.type];
  if (!type) {
    throw new Error(
      `Error parsing structured output config: unrecognized data type ${dataType}`,
    );
  }

  let properties = null;
  let orderedPropertyNames = null;

  if (schema.properties?.length > 0) {
    properties = {};
    orderedPropertyNames = [];
    schema.properties.forEach((property) => {
      properties[property.name] = makeStructuredOutputSchema(property.schema);
      orderedPropertyNames.push(property.name);
    });
  }

  const itemsSchema = schema.arrayItems
    ? makeStructuredOutputSchema(schema.arrayItems)
    : null;

  return {
    type: type,
    description: schema.description,
    nullable: false,
    properties: properties,
    propertyOrdering: orderedPropertyNames,
    required: orderedPropertyNames,
    enum: schema.enumItems,
    items: itemsSchema,
  };
}

function makeStructuredOutputGenerationConfig(
  structuredOutputConfig?: StructuredOutputConfig,
): Partial<GenerationConfig> {
  if (
    !structuredOutputConfig ||
    structuredOutputConfig.type === StructuredOutputType.NONE
  ) {
    return {responseMimeType: 'text/plain'};
  }
  if (structuredOutputConfig.type === StructuredOutputType.JSON_FORMAT) {
    return {responseMimeType: 'application/json'};
  }
  if (!structuredOutputConfig.schema) {
    throw new Error(
      `Expected schema for structured output type ${structuredOutputConfig.type}`,
    );
  }
  const schema = makeStructuredOutputSchema(structuredOutputConfig.schema);
  return {
    responseMimeType: 'application/json',
    responseSchema: schema,
  };
}

/**
 * Convert generic message format to Gemini-specific format.
 * Extracts system messages to use as systemInstruction.
 * @returns Object with contents array and optional systemInstruction
 */
function convertToGeminiFormat(
  prompt: string | Array<{role: string; content: string; name?: string}>,
): {
  contents: Array<{role: string; parts: Array<{text: string}>}>;
  systemInstruction?: string;
} {
  if (typeof prompt === 'string') {
    return {
      contents: [{role: 'user', parts: [{text: prompt}]}],
      systemInstruction: undefined,
    };
  }

  // Extract system messages for systemInstruction
  const systemMessages = prompt.filter((msg) => msg.role === 'system');
  const conversationMessages = prompt.filter((msg) => msg.role !== 'system');

  // Combine system messages into systemInstruction
  const systemInstruction =
    systemMessages.length > 0
      ? systemMessages.map((msg) => msg.content).join('\n\n')
      : undefined;

  // Convert conversation messages to Gemini format
  let contents = conversationMessages.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{text: msg.content}],
  }));

  // If no conversation messages, add an empty user message
  if (contents.length === 0) {
    contents = [{role: 'user', parts: [{text: ''}]}];
  }

  return {contents, systemInstruction};
}

/** Makes Gemini API call. */
export async function callGemini(
  apiKey: string,
  prompt: string | Array<{role: string; content: string; name?: string}>,
  generationConfig: GenerationConfig,
  modelName = GEMINI_DEFAULT_MODEL,
  parseResponse = false, // parse if structured output
) {
  const genAI = new GoogleGenAI({apiKey});

  // Convert to Gemini format
  const {contents, systemInstruction} = convertToGeminiFormat(prompt);

  // Build config with system instruction if provided
  const config: GenerateContentConfig = {
    ...generationConfig,
    safetySettings: SAFETY_SETTINGS,
  };

  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }

  const response = await genAI.models.generateContent({
    model: modelName,
    contents: contents,
    config: config,
  });

  if (response.promptFeedback) {
    return {
      status: ModelResponseStatus.REFUSAL_ERROR,
      generationConfig,
      rawResponse: JSON.stringify(response),
      errorMessage:
        response.promptFeedback.blockReasonMessage ??
        JSON.stringify(response.promptFeedback),
    };
  }

  if (!response.candidates) {
    return {
      status: ModelResponseStatus.UNKNOWN_ERROR,
      generationConfig,
      rawResponse: JSON.stringify(response),
      errorMessage: `Model provider returned an unexpected response (no response candidates): ${response}`,
    };
  }

  const finishReason = response.candidates[0].finishReason;
  if (finishReason === MAX_TOKENS_FINISH_REASON) {
    return {
      status: ModelResponseStatus.LENGTH_ERROR,
      generationConfig,
      rawResponse: JSON.stringify(response),
      errorMessage: `Error: Token limit (${generationConfig.maxOutputTokens}) exceeded`,
    };
  }

  let text = null;
  let reasoning = null;

  for (const part of response.candidates[0].content.parts) {
    if (!part.text) {
      continue;
    }
    if (part.thought) {
      reasoning = part.text;
    } else {
      text = part.text;
    }
  }

  const modelResponse = {
    status: ModelResponseStatus.OK,
    text: text,
    rawResponse: JSON.stringify(response),
    generationConfig,
    reasoning: reasoning,
  };
  if (parseResponse) {
    return addParsedModelResponse(modelResponse);
  }
  return modelResponse;
}

/** Constructs Gemini API query and returns response. */
export async function getGeminiAPIResponse(
  apiKey: string,
  modelName: string,
  promptText: string | Array<{role: string; content: string; name?: string}>,
  generationConfig: ModelGenerationConfig,
  structuredOutputConfig?: StructuredOutputConfig,
): Promise<ModelResponse> {
  const customFields = Object.fromEntries(
    generationConfig.customRequestBodyFields.map((field) => [
      field.name,
      field.value,
    ]),
  );
  let structuredOutputGenerationConfig;
  try {
    structuredOutputGenerationConfig = makeStructuredOutputGenerationConfig(
      structuredOutputConfig,
    );
  } catch (error: Error) {
    return {
      status: ModelResponseStatus.INTERNAL_ERROR,
      errorMessage: error.message,
    };
  }
  const thinkingConfig = {
    thinkingBudget: generationConfig.reasoningBudget,
    includeThoughts: generationConfig.includeReasoning,
  };
  const geminiConfig: GenerationConfig = {
    stopSequences: generationConfig.stopSequences,
    maxOutputTokens: generationConfig.maxTokens,
    temperature: generationConfig.temperature,
    topP: generationConfig.topP,
    topK: 16,
    presencePenalty: generationConfig.presencePenalty,
    frequencyPenalty: generationConfig.frequencyPenalty,
    thinkingConfig: thinkingConfig,
    ...structuredOutputGenerationConfig,
    ...customFields,
  };

  try {
    return await callGemini(
      apiKey,
      promptText,
      geminiConfig,
      modelName,
      structuredOutputConfig?.enabled,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (!(error instanceof ApiError)) {
      return {
        status: ModelResponseStatus.UNKNOWN_ERROR,
        generationConfig: geminiConfig,
        errorMessage: JSON.stringify(error),
      };
    }
    let returnStatus = ModelResponseStatus.UNKNOWN_ERROR;
    if (error.status == AUTHENTICATION_FAILURE_ERROR_CODE) {
      returnStatus = ModelResponseStatus.AUTHENTICATION_ERROR;
    } else if (error.status == QUOTA_ERROR_CODE) {
      returnStatus = ModelResponseStatus.QUOTA_ERROR;
    } else if (error.status >= 500 && error.status < 600) {
      returnStatus = ModelResponseStatus.PROVIDER_UNAVAILABLE_ERROR;
    }
    return {
      status: returnStatus,
      generationConfig: geminiConfig,
      errorMessage: error.message,
    };
  }
}
