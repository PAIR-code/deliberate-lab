import Anthropic from '@anthropic-ai/sdk';
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

const SUCCESS_FINISH_REASON = 'end_turn';
const MAX_TOKENS_FINISH_REASON = 'max_tokens';

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
      `Error parsing structured output config: unrecognized data type ${schema.type}`,
    );
  }

  let properties: {[key: string]: object} | null = null;
  let orderedPropertyNames: string[] | null = null;

  if (schema.properties && schema.properties.length > 0) {
    properties = {};
    orderedPropertyNames = [];
    schema.properties.forEach((property) => {
      properties![property.name] = makeStructuredOutputSchema(property.schema);
      orderedPropertyNames!.push(property.name);
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

function convertToClaudeFormat(
  prompt: string | Array<{role: string; content: string; name?: string}>,
): Array<{role: string; content: string; name?: string}> {
  if (typeof prompt === 'string') {
    return [{role: 'user', content: prompt}];
  }
  return prompt;
}

export async function callClaudeChatCompletion(
  apiKey: string,
  baseUrl: string | null,
  modelName: string,
  prompt: string | Array<{role: string; content: string; name?: string}>,
  generationConfig: ModelGenerationConfig,
  structuredOutputConfig?: StructuredOutputConfig,
): Promise<ModelResponse> {
  const client = new Anthropic({apiKey, baseURL: baseUrl});
  const allMessages = convertToClaudeFormat(prompt);

  const systemMessage = allMessages.find((msg) => msg.role === 'system');
  const systemPrompt = systemMessage?.content;

  const filteredMessages = allMessages
    .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
    .map(({role, content}) => ({role, content})) as {
    role: 'user' | 'assistant';
    content: string;
  }[];

  let response;
  try {
    response = await client.messages.create({
      model: modelName,
      system: systemPrompt, // The system prompt as a top-level string
      messages: filteredMessages, // The array containing only user/assistant turns
      max_tokens: generationConfig.maxTokens,
      temperature: generationConfig.temperature,
      top_p: generationConfig.topP,
    });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      let status;
      switch (error.status) {
        case 401:
          status = ModelResponseStatus.AUTHENTICATION_ERROR;
          break;
        case 429:
          status = ModelResponseStatus.QUOTA_ERROR;
          break;
        case 500:
        case 503:
          status = ModelResponseStatus.PROVIDER_UNAVAILABLE_ERROR;
          break;
        default:
          status = ModelResponseStatus.UNKNOWN_ERROR;
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

  if (!response || !response.content) {
    return {
      status: ModelResponseStatus.UNKNOWN_ERROR,
      generationConfig,
      rawResponse: JSON.stringify(response ?? {}),
      errorMessage: `Model provider returned an unexpected response: ${response}`,
    };
  }

  const finishReason = response.stop_reason;
  if (finishReason === MAX_TOKENS_FINISH_REASON) {
    return {
      status: ModelResponseStatus.LENGTH_ERROR,
      generationConfig,
      rawResponse: JSON.stringify(response),
      text: response.content[0].text,
      errorMessage: `Token limit (${generationConfig.maxTokens}) exceeded`,
    };
  } else if (finishReason !== SUCCESS_FINISH_REASON) {
    return {
      status: ModelResponseStatus.UNKNOWN_ERROR,
      generationConfig,
      rawResponse: JSON.stringify(response),
      text: response.content[0].text,
      errorMessage: `Provider sent unrecognized finish_reason: ${finishReason}`,
    };
  }

  const modelResponse: ModelResponse = {
    status: ModelResponseStatus.OK,
    generationConfig,
    rawResponse: JSON.stringify(response),
    text: response.content[0].text,
  };
  if (structuredOutputConfig?.enabled) {
    return addParsedModelResponse(modelResponse);
  }
  return modelResponse;
}

export async function getClaudeAPIChatCompletionResponse(
  apiKey: string,
  baseUrl: string | null,
  modelName: string,
  promptText: string | Array<{role: string; content: string; name?: string}>,
  generationConfig: ModelGenerationConfig,
  structuredOutputConfig?: StructuredOutputConfig,
): Promise<ModelResponse> {
  try {
    const response = await callClaudeChatCompletion(
      apiKey,
      baseUrl,
      modelName,
      promptText,
      generationConfig,
      structuredOutputConfig,
    );
    if (!response) {
      return {
        status: ModelResponseStatus.UNKNOWN_ERROR,
        generationConfig,
        errorMessage: 'No response from Claude API',
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
