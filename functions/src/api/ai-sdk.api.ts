/**
 * Unified AI SDK API layer using Vercel AI SDK v6.
 * Provides a single entry point for all LLM provider interactions.
 */

import {
  generateText,
  Output,
  jsonSchema,
  LanguageModel,
  ModelMessage,
} from 'ai';
import {createOpenAI} from '@ai-sdk/openai';
import {createAnthropic} from '@ai-sdk/anthropic';
import {createGoogleGenerativeAI} from '@ai-sdk/google';
import {createOllama} from 'ollama-ai-provider-v2';

// Re-export ModelMessage for use throughout functions package
export type {ModelMessage} from 'ai';

import {
  ModelGenerationConfig,
  ModelResponse,
  ModelResponseStatus,
  StructuredOutputConfig,
  StructuredOutputType,
  APIKeyConfig,
  AgentModelSettings,
  ApiKeyType,
  schemaToObject,
} from '@deliberation-lab/utils';

// ============================================================================
// PROVIDER REGISTRY
// ============================================================================

/**
 * Provider factory creates a language model instance from configuration.
 * Returns LanguageModel (which can be a string or a model object).
 */
type ProviderFactory = (config: {
  apiKey?: string;
  baseURL?: string;
}) => (modelId: string) => LanguageModel;

/**
 * Registry of available AI providers.
 * Adding a new provider requires:
 * 1. npm install @ai-sdk/[provider]
 * 2. Add one line to this registry
 */
const PROVIDER_REGISTRY: Record<string, ProviderFactory> = {
  google: ({apiKey}) => {
    const provider = createGoogleGenerativeAI({apiKey});
    return (modelId: string) => provider(modelId) as LanguageModel;
  },
  openai: ({apiKey, baseURL}) => {
    const provider = createOpenAI({apiKey, baseURL});
    return (modelId: string) => provider(modelId) as LanguageModel;
  },
  anthropic: ({apiKey, baseURL}) => {
    const provider = createAnthropic({apiKey, baseURL});
    return (modelId: string) => provider(modelId) as LanguageModel;
  },
  ollama: ({baseURL}) => {
    const provider = createOllama({baseURL});
    return (modelId: string) => provider(modelId) as LanguageModel;
  },
};

/**
 * Maps ApiKeyType enum to provider ID string.
 */
const API_TYPE_TO_PROVIDER: Record<ApiKeyType, string> = {
  [ApiKeyType.GEMINI_API_KEY]: 'google',
  [ApiKeyType.OPENAI_API_KEY]: 'openai',
  [ApiKeyType.CLAUDE_API_KEY]: 'anthropic',
  [ApiKeyType.OLLAMA_CUSTOM_URL]: 'ollama',
};

/**
 * Extracts credentials from APIKeyConfig based on API type.
 */
function getCredentials(
  apiKeyConfig: APIKeyConfig,
  apiType: ApiKeyType,
): {apiKey?: string; baseURL?: string} {
  switch (apiType) {
    case ApiKeyType.GEMINI_API_KEY:
      return {apiKey: apiKeyConfig.geminiApiKey};
    case ApiKeyType.OPENAI_API_KEY:
      return {
        apiKey: apiKeyConfig.openAIApiKey?.apiKey,
        baseURL: apiKeyConfig.openAIApiKey?.baseUrl || undefined,
      };
    case ApiKeyType.CLAUDE_API_KEY:
      return {
        apiKey: apiKeyConfig.claudeApiKey?.apiKey,
        baseURL: apiKeyConfig.claudeApiKey?.baseUrl || undefined,
      };
    case ApiKeyType.OLLAMA_CUSTOM_URL:
      return {baseURL: apiKeyConfig.ollamaApiKey?.url};
    default:
      return {};
  }
}

/**
 * Gets a language model instance from the provider registry.
 */
function getModel(
  apiKeyConfig: APIKeyConfig,
  modelSettings: AgentModelSettings,
): LanguageModel {
  const providerId = API_TYPE_TO_PROVIDER[modelSettings.apiType];
  if (!providerId) {
    throw new Error(
      `Unknown API type: ${modelSettings.apiType}. Available: ${Object.keys(API_TYPE_TO_PROVIDER).join(', ')}`,
    );
  }

  const providerFactory = PROVIDER_REGISTRY[providerId];
  if (!providerFactory) {
    throw new Error(
      `Unknown provider: ${providerId}. Available: ${Object.keys(PROVIDER_REGISTRY).join(', ')}`,
    );
  }

  const credentials = getCredentials(apiKeyConfig, modelSettings.apiType);
  return providerFactory(credentials)(modelSettings.modelName);
}

// ============================================================================
// MESSAGE CONVERSION
// ============================================================================

/**
 * Extracts text content from a ModelMessage for system prompt concatenation.
 * In our current implementation, content is always a string, but this handles
 * the ModelMessage type which allows array content for multimodal messages.
 */
function extractTextFromMessage(message: ModelMessage): string {
  if (typeof message.content === 'string') {
    return message.content;
  }

  // Defensive: handle array content (multimodal) if it ever occurs
  if (Array.isArray(message.content)) {
    return message.content
      .filter((part) => 'text' in part && typeof part.text === 'string')
      .map((part) => (part as {text: string}).text)
      .join(' ');
  }

  return '';
}

/**
 * Converts prompt to AI SDK message format.
 * Extracts system messages and returns separately.
 */
function convertPromptToMessages(prompt: string | ModelMessage[]): {
  system?: string;
  messages: ModelMessage[];
} {
  if (typeof prompt === 'string') {
    return {
      messages: [{role: 'user', content: prompt}],
    };
  }

  // Extract system messages and combine their content
  const systemMessages = prompt.filter((m) => m.role === 'system');
  const system =
    systemMessages.length > 0
      ? systemMessages.map((m) => extractTextFromMessage(m)).join('\n\n')
      : undefined;

  // Get non-system messages (already ModelMessage format)
  const messages = prompt.filter((m) => m.role !== 'system');

  // Ensure at least one message exists
  if (messages.length === 0) {
    messages.push({role: 'user', content: ''});
  }

  return {system, messages};
}

// ============================================================================
// PROVIDER OPTIONS
// ============================================================================

type GoogleSafetyCategory =
  | 'HARM_CATEGORY_HARASSMENT'
  | 'HARM_CATEGORY_DANGEROUS_CONTENT'
  | 'HARM_CATEGORY_HATE_SPEECH'
  | 'HARM_CATEGORY_SEXUALLY_EXPLICIT';

type GoogleSafetyThreshold = 'BLOCK_NONE' | 'BLOCK_ONLY_HIGH';

/**
 * Builds Google-specific provider options including safety settings.
 */
function getGoogleProviderOptions(
  generationConfig: ModelGenerationConfig,
): object {
  const threshold: GoogleSafetyThreshold = generationConfig.disableSafetyFilters
    ? 'BLOCK_NONE'
    : 'BLOCK_ONLY_HIGH';

  const safetyCategories: GoogleSafetyCategory[] = [
    'HARM_CATEGORY_HARASSMENT',
    'HARM_CATEGORY_DANGEROUS_CONTENT',
    'HARM_CATEGORY_HATE_SPEECH',
    'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  ];

  const safetySettings = safetyCategories.map((category) => ({
    category,
    threshold,
  }));

  const options: Record<string, unknown> = {
    safetySettings,
  };

  // Add thinking config if specified
  if (
    generationConfig.reasoningBudget !== undefined ||
    generationConfig.includeReasoning
  ) {
    options.thinkingConfig = {
      thinkingBudget: generationConfig.reasoningBudget,
      includeThoughts: generationConfig.includeReasoning,
    };
  }

  return {google: options};
}

/**
 * Builds provider-specific options based on API type.
 */
function getProviderOptions(
  apiType: ApiKeyType,
  generationConfig: ModelGenerationConfig,
): object {
  switch (apiType) {
    case ApiKeyType.GEMINI_API_KEY:
      return getGoogleProviderOptions(generationConfig);
    default:
      return {};
  }
}

// ============================================================================
// GENERATION CONFIG
// ============================================================================

/**
 * Maps ModelGenerationConfig to AI SDK settings.
 */
function mapGenerationConfig(config: ModelGenerationConfig): object {
  const settings: Record<string, unknown> = {
    maxOutputTokens: config.maxTokens,
    temperature: config.temperature,
    topP: config.topP,
    maxRetries: 0, // We handle retries in processModelResponse
  };

  if (config.stopSequences && config.stopSequences.length > 0) {
    settings.stopSequences = config.stopSequences;
  }

  if (config.frequencyPenalty !== 0) {
    settings.frequencyPenalty = config.frequencyPenalty;
  }

  if (config.presencePenalty !== 0) {
    settings.presencePenalty = config.presencePenalty;
  }

  return settings;
}

// ============================================================================
// STRUCTURED OUTPUT
// ============================================================================

/**
 * Checks if structured output should use native JSON schema mode.
 */
function shouldUseNativeStructuredOutput(
  config?: StructuredOutputConfig,
): boolean {
  if (!config?.enabled || !config.schema) {
    return false;
  }
  return config.type === StructuredOutputType.JSON_SCHEMA;
}

// ============================================================================
// RESULT MAPPING
// ============================================================================

/**
 * Maps finish reason to ModelResponseStatus.
 */
function mapFinishReason(
  finishReason: string | undefined,
): ModelResponseStatus | null {
  switch (finishReason) {
    case 'stop':
    case 'end_turn':
      return null; // Success, no error
    case 'length':
    case 'max_tokens':
      return ModelResponseStatus.LENGTH_ERROR;
    case 'content-filter':
      return ModelResponseStatus.REFUSAL_ERROR;
    case 'error':
      return ModelResponseStatus.UNKNOWN_ERROR;
    default:
      return null; // Unknown or other reasons treated as success
  }
}

/**
 * Maps AI SDK result to ModelResponse.
 */
function mapResultToModelResponse(
  result: {
    text?: string;
    output?: unknown;
    files?: Array<{base64: string; mediaType: string}>;
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
    };
    finishReason?: string;
    reasoning?: Array<{text?: string}>;
    reasoningText?: string;
    response?: {body?: unknown};
  },
  structuredOutputConfig?: StructuredOutputConfig,
): ModelResponse {
  // Check for error finish reasons
  const errorStatus = mapFinishReason(result.finishReason);
  if (errorStatus) {
    return {
      status: errorStatus,
      text: result.text,
      rawResponse: result.response?.body
        ? JSON.stringify(result.response.body)
        : undefined,
      errorMessage: `Generation stopped: ${result.finishReason}`,
    };
  }

  // Build base response
  const response: ModelResponse = {
    status: ModelResponseStatus.OK,
    rawResponse: result.response?.body
      ? JSON.stringify(result.response.body)
      : undefined,
  };

  // Handle text output
  if (result.text) {
    response.text = result.text;
  }

  // Handle structured output
  if (structuredOutputConfig?.enabled && result.output) {
    response.parsedResponse = result.output as object;
    response.text = JSON.stringify(result.output);
  }

  // Handle reasoning/thinking
  if (result.reasoningText) {
    response.reasoning = result.reasoningText;
  } else if (result.reasoning && result.reasoning.length > 0) {
    response.reasoning = result.reasoning
      .map((r) => r.text)
      .filter(Boolean)
      .join('');
  }

  // Handle files (images, etc.)
  if (result.files && result.files.length > 0) {
    response.files = result.files.map((f) => ({
      mediaType: f.mediaType,
      base64: f.base64,
    }));
  }

  // Handle usage
  if (result.usage) {
    const inputTokens = result.usage.inputTokens ?? 0;
    const outputTokens = result.usage.outputTokens ?? 0;
    response.usage = {
      promptTokens: inputTokens,
      completionTokens: outputTokens,
      totalTokens: inputTokens + outputTokens,
    };
  }

  return response;
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Checks if an error is an API call error with status code.
 */
function isAPICallError(
  error: unknown,
): error is {statusCode?: number; message: string} {
  return (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as {message: unknown}).message === 'string'
  );
}

/**
 * Maps errors to ModelResponse.
 */
function mapErrorToModelResponse(error: unknown): ModelResponse {
  if (!isAPICallError(error)) {
    return {
      status: ModelResponseStatus.UNKNOWN_ERROR,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }

  const statusCode = (error as {statusCode?: number}).statusCode;

  // Map HTTP status codes to ModelResponseStatus
  if (statusCode === 401 || statusCode === 403) {
    return {
      status: ModelResponseStatus.AUTHENTICATION_ERROR,
      errorMessage: error.message,
    };
  }

  if (statusCode === 429) {
    return {
      status: ModelResponseStatus.QUOTA_ERROR,
      errorMessage: error.message,
    };
  }

  if (statusCode && statusCode >= 500) {
    return {
      status: ModelResponseStatus.PROVIDER_UNAVAILABLE_ERROR,
      errorMessage: error.message,
    };
  }

  // Check for structured output parse errors
  if (
    error.message.includes('parse') ||
    error.message.includes('JSON') ||
    error.message.includes('schema')
  ) {
    return {
      status: ModelResponseStatus.STRUCTURED_OUTPUT_PARSE_ERROR,
      errorMessage: error.message,
    };
  }

  return {
    status: ModelResponseStatus.UNKNOWN_ERROR,
    errorMessage: error.message,
  };
}

// ============================================================================
// MAIN API FUNCTION
// ============================================================================

/**
 * Unified function to generate AI responses using Vercel AI SDK.
 * Routes to the appropriate provider based on modelSettings.apiType.
 */
export async function generateAIResponse(
  apiKeyConfig: APIKeyConfig,
  prompt: string | ModelMessage[],
  modelSettings: AgentModelSettings,
  generationConfig: ModelGenerationConfig,
  structuredOutputConfig?: StructuredOutputConfig,
): Promise<ModelResponse> {
  try {
    // Get model instance
    const model = getModel(apiKeyConfig, modelSettings);

    // Convert prompt to messages
    const {system, messages} = convertPromptToMessages(prompt);

    // Map generation config
    const settings = mapGenerationConfig(generationConfig);

    // Get provider-specific options
    const providerOptions = getProviderOptions(
      modelSettings.apiType,
      generationConfig,
    );

    // Build the generateText options
    const generateOptions: Record<string, unknown> = {
      model,
      messages,
      ...settings,
    };

    if (system) {
      generateOptions.system = system;
    }

    if (Object.keys(providerOptions).length > 0) {
      generateOptions.providerOptions = providerOptions;
    }

    // Add structured output if enabled
    if (
      shouldUseNativeStructuredOutput(structuredOutputConfig) &&
      structuredOutputConfig?.schema
    ) {
      const jsonSchemaObj = schemaToObject(structuredOutputConfig.schema);
      generateOptions.output = Output.object({
        schema: jsonSchema(jsonSchemaObj),
      });
    }

    // Make the API call
    const result = await generateText(
      generateOptions as Parameters<typeof generateText>[0],
    );

    // Map result to ModelResponse
    return mapResultToModelResponse(result, structuredOutputConfig);
  } catch (error) {
    console.error('generateAIResponse error:', error);
    return mapErrorToModelResponse(error);
  }
}
