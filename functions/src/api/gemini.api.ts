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

function makeStructuredOutputSchema(
  schema: StructuredOutputSchema,
): object | null {
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
    console.error(
      `Error parsing structured output config: unrecognized data type ${dataType}`,
    );
    return null;
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
): Partial<GenerationConfig> | null {
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
    console.error(
      `Expected schema for structured output type ${structuredOutputConfig.type}`,
    );
    return null;
  }
  const schema = makeStructuredOutputSchema(structuredOutputConfig.schema);
  if (!schema) {
    return null;
  }
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
  const structuredOutputGenerationConfig = makeStructuredOutputGenerationConfig(
    structuredOutputConfig,
  );
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

  let response = {text: ''};
  try {
    response = await callGemini(apiKey, promptText, geminiConfig, modelName);
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
