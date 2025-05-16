import OpenAI from 'openai';
import {
  ModelGenerationConfig,
  StructuredOutputType,
  StructuredOutputDataType,
  StructuredOutputConfig,
  StructuredOutputSchema,
} from '@deliberation-lab/utils';
import {ModelResponse, ModelResponseStatus} from './model.response';

const MAX_TOKENS_FINISH_REASON = 'length';

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

  let properties = undefined;
  let orderedPropertyNames = undefined;

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
    : undefined;

  const additionalProperties =
    schema.type == StructuredOutputDataType.OBJECT ? false : undefined;

  return {
    type: type,
    description: schema.description,
    properties: properties,
    additionalProperties: additionalProperties,
    required: orderedPropertyNames,
    items: itemsSchema,
  };
}

function makeStructuredOutputParameters(
  structuredOutputConfig?: StructuredOutputConfig,
): object | null {
  if (
    !structuredOutputConfig ||
    structuredOutputConfig.type === StructuredOutputType.NONE
  ) {
    return {type: 'text'};
  }
  if (structuredOutputConfig.type === StructuredOutputType.JSON_FORMAT) {
    return {type: 'json_object'};
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
    type: 'json_schema',
    strict: true,
    json_schema: schema,
  };
}

export async function callOpenAIChatCompletion(
  apiKey: string,
  baseUrl: string | null,
  modelName: string,
  prompt: string,
  generationConfig: ModelGenerationConfig,
  structuredOutputConfig?: StructuredOutputConfig = null,
) {
  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: baseUrl,
  });

  const responseFormat = makeStructuredOutputParameters(structuredOutputConfig);
  const customFields = Object.fromEntries(
    generationConfig.customRequestBodyFields.map((field) => [
      field.name,
      field.value,
    ]),
  );
  const response = await client.chat.completions.create({
    model: modelName,
    messages: [{role: 'user', content: prompt}],
    temperature: generationConfig.temperature,
    top_p: generationConfig.topP,
    frequency_penalty: generationConfig.frequencyPenalty,
    presence_penalty: generationConfig.presencePenalty,
    response_format: responseFormat,
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

  return {
    // TODO(mkbehr): handle errors from this API
    status: ModelResponseStatus.OK,
    text: response.choices[0].message.content,
  };
}

export async function getOpenAIAPIChatCompletionResponse(
  apiKey: string,
  baseUrl: string | null,
  modelName: string,
  promptText: string,
  generationConfig: ModelGenerationConfig,
  structuredOutputConfig?: StructuredOutputConfig = null,
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
    'structuredOutputConfig:',
    structuredOutputConfig,
  );

  let response = {
    // TODO(mkbehr): handle errors from this API
    status: ModelResponseStatus.UNKNOWN_ERROR,
    errorMessage: '',
  };
  try {
    response = await callOpenAIChatCompletion(
      apiKey,
      baseUrl,
      modelName,
      promptText,
      generationConfig,
      structuredOutputConfig,
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    response = {
      // TODO(mkbehr): handle errors from this API
      status: ModelResponseStatus.UNKNOWN_ERROR,
      errorMessage: error.message,
    };
  }

  return response;
}
