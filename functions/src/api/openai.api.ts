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
  // OpenAI JSON Schema requires lowercase type names
  const typeMap: {[key in StructuredOutputDataType]?: string} = {
    [StructuredOutputDataType.STRING]: 'string',
    [StructuredOutputDataType.NUMBER]: 'number',
    [StructuredOutputDataType.INTEGER]: 'integer',
    [StructuredOutputDataType.BOOLEAN]: 'boolean',
    [StructuredOutputDataType.ARRAY]: 'array',
    [StructuredOutputDataType.OBJECT]: 'object',
    [StructuredOutputDataType.ENUM]: 'string',
  };
  const type = typeMap[schema.type];
  if (!type) {
    throw new Error(
      `Error parsing structured output config: unrecognized data type ${schema.type}`,
    );
  }

  let properties: {[key: string]: object} | undefined = undefined;
  let orderedPropertyNames: string[] | undefined = undefined;

  if (schema.properties && schema.properties.length > 0) {
    properties = {};
    orderedPropertyNames = [];
    schema.properties.forEach((property) => {
      if (properties && orderedPropertyNames) {
        properties[property.name] = makeStructuredOutputSchema(property.schema);
        orderedPropertyNames.push(property.name);
      }
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
    enum: schema.enumItems,
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
    json_schema: {
      name: 'response_schema',
      strict: true,
      schema: schema,
    },
  };
}

import {ChatCompletionMessageParam} from 'openai/resources';

/**
 * Convert generic message format to OpenAI-specific format.
 * @returns Array of ChatCompletionMessageParam
 */
function convertToOpenAIFormat(
  prompt: string | Array<{role: string; content: string; name?: string}>,
): ChatCompletionMessageParam[] {
  if (typeof prompt === 'string') {
    return [{role: 'user' as const, content: prompt}];
  }

  // Convert message array to OpenAI format
  return prompt.map((msg) => ({
    role: msg.role as 'system' | 'user' | 'assistant',
    content: msg.content,
    ...(msg.name && {name: msg.name}),
  }));
}

export async function callOpenAIChatCompletion(
  apiKey: string,
  baseUrl: string | null,
  modelName: string,
  prompt: string | Array<{role: string; content: string; name?: string}>,
  generationConfig: ModelGenerationConfig,
  structuredOutputConfig?: StructuredOutputConfig,
  _useWebSearch?: boolean, // Accepted but not implemented - OpenAI chat completions API doesn't support web search
): Promise<ModelResponse> {
  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: baseUrl,
  });

  let responseFormat;
  try {
    responseFormat = makeStructuredOutputParameters(structuredOutputConfig);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return {
      status: ModelResponseStatus.INTERNAL_ERROR,
      generationConfig,
      errorMessage: error.message,
    };
  }
  const customFields = Object.fromEntries(
    (generationConfig.customRequestBodyFields || []).map((field) => [
      field.name,
      field.value,
    ]),
  );

  // Convert prompt to messages format if not already
  const messages = convertToOpenAIFormat(prompt);

  let response;
  try {
    response = await client.chat.completions.create({
      model: modelName,
      messages: messages,
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
          if (error.status && error.status >= 500) {
            status = ModelResponseStatus.PROVIDER_UNAVAILABLE_ERROR;
          } else {
            status = ModelResponseStatus.UNKNOWN_ERROR;
          }
      }
      return {
        status: status,
        generationConfig,
        errorMessage: `${error.name}: ${error.message}`,
      };
    } else {
      throw error;
    }
  }

  if (!response || !response.choices) {
    return {
      status: ModelResponseStatus.UNKNOWN_ERROR,
      generationConfig,
      rawResponse: JSON.stringify(response ?? {}),
      errorMessage: `Model provider returned an unexpected response: ${response}`,
    };
  }

  const finishReason = response.choices[0].finish_reason;
  if (finishReason === MAX_TOKENS_FINISH_REASON) {
    return {
      status: ModelResponseStatus.LENGTH_ERROR,
      generationConfig,
      rawResponse: JSON.stringify(response),
      text: response.choices[0].message.content || undefined,
      errorMessage: `Token limit (${generationConfig.maxTokens}) exceeded`,
    };
  } else if (
    finishReason === REFUSAL_FINISH_REASON ||
    response.choices[0].message.refusal
  ) {
    return {
      status: ModelResponseStatus.REFUSAL_ERROR,
      generationConfig,
      rawResponse: JSON.stringify(response),
      errorMessage: `Refusal from provider: ${response.choices[0].message.refusal}`,
    };
  } else if (finishReason !== SUCCESS_FINISH_REASON) {
    return {
      status: ModelResponseStatus.UNKNOWN_ERROR,
      generationConfig,
      rawResponse: JSON.stringify(response),
      text: response.choices[0].message.content || undefined,
      errorMessage: `Provider sent unrecognized finish_reason: ${finishReason}`,
    };
  }

  const modelResponse: ModelResponse = {
    status: ModelResponseStatus.OK,
    generationConfig,
    rawResponse: JSON.stringify(response),
    text: response.choices[0].message.content || undefined,
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
  promptText: string | Array<{role: string; content: string; name?: string}>,
  generationConfig: ModelGenerationConfig,
  structuredOutputConfig?: StructuredOutputConfig,
  useWebSearch?: boolean,
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

  try {
    const response = await callOpenAIChatCompletion(
      apiKey,
      baseUrl,
      modelName,
      promptText,
      generationConfig,
      structuredOutputConfig,
      useWebSearch,
    );
    if (!response) {
      return {
        status: ModelResponseStatus.UNKNOWN_ERROR,
        generationConfig,
        errorMessage: 'No response from OpenAI API',
      };
    }
    return response;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return {
      status: ModelResponseStatus.UNKNOWN_ERROR,
      generationConfig,
      errorMessage: error.message,
    };
  }
}
