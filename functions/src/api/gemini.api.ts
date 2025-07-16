import {
  GoogleGenerativeAI,
  GenerationConfig,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
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

const GEMINI_DEFAULT_MODEL = 'gemini-1.5-pro-latest';
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

/** Makes Gemini API call. */
export async function callGemini(
  apiKey: string,
  prompt: string,
  generationConfig: GenerationConfig,
  modelName = GEMINI_DEFAULT_MODEL,
  parseResponse = false, // parse if structured output
) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig,
    safetySettings: SAFETY_SETTINGS,
  });

  const result = await model.generateContent(prompt);
  const response = await result.response;

  if (response.promptFeedback) {
    return {
      status: ModelResponseStatus.REFUSAL_ERROR,
      rawResponse: JSON.stringify(response),
      errorMessage:
        response.promptFeedback.blockReasonMessage ??
        JSON.stringify(response.promptFeedback),
    };
  }

  if (!response.candidates) {
    return {
      status: ModelResponseStatus.UNKNOWN_ERROR,
      rawResponse: JSON.stringify(response),
      errorMessage: `Model provider returned an unexpected response (no response candidates): ${response}`,
    };
  }

  const finishReason = response.candidates[0].finishReason;
  if (finishReason === MAX_TOKENS_FINISH_REASON) {
    return {
      status: ModelResponseStatus.LENGTH_ERROR,
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
  promptText: string,
  generationConfig: ModelGenerationConfig,
  structuredOutputConfig?: StructuredOutputConfig = null,
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
    thinkingConfig,
    ...structuredOutputGenerationConfig,
    ...customFields,
  };

  const isStructured = structuredOutputConfig?.enabled;
  const MAX_RETRIES = 2;
  let retryCount = 0;

  let currentPrompt = promptText;
  let lastModelResponse: ModelResponse | null = null;

  while (retryCount <= MAX_RETRIES) {
    try {
      const modelResponse = await callGemini(
        apiKey,
        currentPrompt,
        geminiConfig,
        modelName,
        false, 
      );

      lastModelResponse = modelResponse;

      if (!isStructured) return modelResponse;

      const parsed = await addParsedModelResponse(modelResponse);
      if (parsed.status === ModelResponseStatus.OK && parsed.parsedResponse !== undefined) {
        return parsed;
      }

      // if parsing failed, append the prompt the error message and try again
      const previousText = modelResponse.text ?? '[No Text Returned]';
      const parseErrorMessage = modelResponse.errorMessage ?? '[Unknown parse error]';
      currentPrompt =
        promptText +
        `\n\nYour previous response is:\n${previousText}\n\nParse error: ${parseErrorMessage}\n\nPlease try again.`;

      // if it still has error, add more retry
      retryCount += 1;
    } catch (error: any) {
      let returnStatus = ModelResponseStatus.UNKNOWN_ERROR;
      const statusMatch = error.message.match(/\[(\d{3})[\s\w]*\]/);
      if (statusMatch) {
        const statusCode = parseInt(statusMatch[1]);
        if (statusCode === AUTHENTICATION_FAILURE_ERROR_CODE) {
          returnStatus = ModelResponseStatus.AUTHENTICATION_ERROR;
        } else if (statusCode === QUOTA_ERROR_CODE) {
          returnStatus = ModelResponseStatus.QUOTA_ERROR;
        } else if (statusCode >= 500 && statusCode < 600) {
          returnStatus = ModelResponseStatus.PROVIDER_UNAVAILABLE_ERROR;
        }
      }
      return {
        status: returnStatus,
        errorMessage: error.message,
      };
    }
  }

  // Maximal retry reached
  return {
    status: ModelResponseStatus.STRUCTURED_OUTPUT_PARSE_ERROR,
    errorMessage: `Something went wrong, already retied for ${MAX_RETRIES + 1} times.`,
  };
}

