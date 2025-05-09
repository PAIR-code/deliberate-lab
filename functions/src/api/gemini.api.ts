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
} from '@deliberation-lab/utils';
import {ModelResponseStatus, ModelResponse} from './model.response';

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
      errorMessage:
        response.promptFeedback.blockReasonMessage ??
        JSON.stringify(response.promptFeedback),
    };
  }

  if (!response.candidates) {
    return {
      status: ModelResponseStatus.UNKNOWN_ERROR,
      errorMessage: `Response unexpectedly had no candidates: ${response}`,
    };
  }

  const finishReason = response.candidates[0].finishReason;
  if (finishReason === MAX_TOKENS_FINISH_REASON) {
    return {
      status: ModelResponseStatus.LENGTH_ERROR,
      errorMessage: `Error: Token limit (${generationConfig.maxOutputTokens}) exceeded`,
    };
  }

  return {
    status: ModelResponseStatus.OK,
    text: response.text(),
  };
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
  const geminiConfig: GenerationConfig = {
    stopSequences: generationConfig.stopSequences,
    maxOutputTokens: generationConfig.maxTokens,
    temperature: generationConfig.temperature,
    topP: generationConfig.topP,
    topK: 16,
    presencePenalty: generationConfig.presencePenalty,
    frequencyPenalty: generationConfig.frequencyPenalty,
    ...structuredOutputGenerationConfig,
    ...customFields,
  };

  try {
    return await callGemini(apiKey, promptText, geminiConfig, modelName);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // The GenerativeAI client doesn't return responses in a parseable format,
    // so try to parse the output string looking for the HTTP status code.
    let returnStatus = ModelResponseStatus.UNKNOWN_ERROR;
    // Match a status code and message between brackets, e.g. "[403 Forbidden]".
    const statusMatch = error.message.match(/\[(\d{3})[\s\w]*\]/);
    if (statusMatch) {
      const statusCode = parseInt(statusMatch[1]);
      if (statusCode == AUTHENTICATION_FAILURE_ERROR_CODE) {
        returnStatus = ModelResponseStatus.AUTHENTICATION_ERROR;
      } else if (statusCode == QUOTA_ERROR_CODE) {
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
