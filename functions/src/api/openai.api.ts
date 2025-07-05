import OpenAI from 'openai';
import {
  ModelGenerationConfig,
  StructuredOutputType,
  StructuredOutputDataType,
  StructuredOutputConfig,
  StructuredOutputSchema,
  ModelResponse,
  ModelResponseStatus,
  addParsedModelResponse,
} from '@deliberation-lab/utils';

const SUCCESS_FINISH_REASON = 'stop';
const MAX_TOKENS_FINISH_REASON = 'length';
const REFUSAL_FINISH_REASON = 'content_filter';

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
): object {
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
    throw new Error(
      `Expected schema for structured output type ${structuredOutputConfig.type}`,
    );
  }
  const schema = makeStructuredOutputSchema(structuredOutputConfig.schema);
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

  let responseFormat;
  try {
    responseFormat = makeStructuredOutputParameters(structuredOutputConfig);
  } catch (error: Error) {
    return {
      status: ModelResponseStatus.INTERNAL_ERROR,
      errorMessage: error.message,
    };
  }
  const customFields = Object.fromEntries(
    generationConfig.customRequestBodyFields.map((field) => [
      field.name,
      field.value,
    ]),
  );

  let response;
  try {
    response = await client.chat.completions.create({
      model: modelName,
      messages: [{role: 'user', content: prompt}],
      temperature: generationConfig.temperature,
      top_p: generationConfig.topP,
      frequency_penalty: generationConfig.frequencyPenalty,
      presence_penalty: generationConfig.presencePenalty,
      response_format: responseFormat,
      ...customFields,
    });
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      let status;
      switch (error.status) {
        case undefined: // API connection error
        case 408: // Request timeout
        case 409: // Conflict
          status = ModelResponseStatus.PROVIDER_UNAVAILABLE_ERROR;
          break;
        case 401: // Unauthorized
          status = ModelResponseStatus.AUTHENTICATION_ERROR;
          break;
        case 403: // Permissions error
          status = ModelResponseStatus.UNKNOWN_ERROR;
          break;
        case 429: // Rate limited or lack of funds
          status = ModelResponseStatus.QUOTA_ERROR;
          break;
        default:
          if (status >= 500) {
            status = ModelResponseStatus.PROVIDER_UNAVAILABLE_ERROR;
          } else {
            status = ModelResponseStatus.UNKNOWN_ERROR;
          }
      }
      return {
        status: status,
        errorMessage: `${error.name}: ${error.message}`,
      };
    } else {
      throw error;
    }
  }

  if (!response || !response.choices) {
    return {
      status: ModelResponseStatus.UNKNOWN_ERROR,
      rawResponse: response ?? {},
      errorMessage: `Model provider returned an unexpected response: ${response}`,
    };
  }

  const finishReason = response.choices[0].finish_reason;
  if (finishReason === MAX_TOKENS_FINISH_REASON) {
    return {
      status: ModelResponseStatus.LENGTH_ERROR,
      rawResponse: response,
      text: response.choices[0].message.content,
      errorMessage: `Token limit (${generationConfig.maxOutputTokens}) exceeded`,
    };
  } else if (
    finishReason === REFUSAL_FINISH_REASON ||
    response.choices[0].message.refusal
  ) {
    return {
      status: ModelResponseStatus.REFUSAL_ERROR,
      rawResponse: response,
      errorMessage: `Refusal from provider: ${response.choices[0].message.refusal}`,
    };
  } else if (finishReason !== SUCCESS_FINISH_REASON) {
    return {
      status: ModelResponseStatus.UNKNOWN_ERROR,
      rawResponse: response,
      text: response.choices[0].message.content,
      errorMessage: `Provider sent unrecognized finish_reason: ${finishReason}`,
    };
  }

  const modelResponse = {
    status: ModelResponseStatus.OK,
    rawResponse: response,
    text: response.choices[0].message.content,
  };
  if (structuredOutputConfig?.enabled) {
    return addParsedModelResponse(modelResponse);
  }
  return modelResponse;
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

  let response;
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
      status: ModelResponseStatus.UNKNOWN_ERROR,
      errorMessage: error.message,
    };
  }

  return response;
}
