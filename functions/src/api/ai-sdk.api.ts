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
  NoObjectGeneratedError,
  APICallError,
} from 'ai';
import type {GenerateTextResult} from 'ai';
import type {AssistantContent, FilePart} from '@ai-sdk/provider-utils';

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
  isAlwaysThinkingModel,
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
      return {
        apiKey: apiKeyConfig.ollamaApiKey?.apiKey || undefined,
        baseURL: apiKeyConfig.ollamaApiKey?.url,
      };
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
  // We do this because APIs expect a user turn before they will generate an assistant response.
  // An empty string will suffice.
  if (messages.length === 0) {
    // gemini-2.5-flash + JSON_SCHEMA fails with 500 internal error if user message is empty string.
    // This occurs on initial mediator message in private chat when no conversation history exists.
    // Using a single space instead of empty string works around this issue.
    messages.push({role: 'user', content: ''});
  }

  return {system, messages};
}

// ============================================================================
// PROVIDER OPTIONS
// Maps universal fields (reasoningLevel, reasoningBudget, includeReasoning)
// to provider-specific options, then merges with any providerOptions overrides.
// ============================================================================

type GoogleSafetyCategory =
  | 'HARM_CATEGORY_HARASSMENT'
  | 'HARM_CATEGORY_DANGEROUS_CONTENT'
  | 'HARM_CATEGORY_HATE_SPEECH'
  | 'HARM_CATEGORY_SEXUALLY_EXPLICIT';

type GoogleSafetyThreshold = 'BLOCK_NONE' | 'BLOCK_ONLY_HIGH';

/**
 * Maps reasoningLevel to provider effort level.
 * 'off' and 'minimal' map to undefined (default behavior).
 */
function mapReasoningLevelToEffort(
  reasoningLevel?: string,
): 'low' | 'medium' | 'high' | undefined {
  switch (reasoningLevel) {
    case 'low':
      return 'low';
    case 'medium':
      return 'medium';
    case 'high':
      return 'high';
    default:
      return undefined;
  }
}

/**
 * Builds Google/Gemini provider options from universal fields.
 * See: https://ai.google.dev/gemini-api/docs/thinking
 *   - Gemini 3: use thinkingLevel ('minimal', 'low', 'medium', 'high')
 *   - Gemini 2.5: use thinkingBudget (token count, -1 for dynamic, 0 to disable)
 */
function buildGoogleOptions(
  config: ModelGenerationConfig,
  modelName?: string,
): object {
  const threshold: GoogleSafetyThreshold = config.disableSafetyFilters
    ? 'BLOCK_NONE'
    : 'BLOCK_ONLY_HIGH';

  const safetyCategories: GoogleSafetyCategory[] = [
    'HARM_CATEGORY_HARASSMENT',
    'HARM_CATEGORY_DANGEROUS_CONTENT',
    'HARM_CATEGORY_HATE_SPEECH',
    'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  ];

  const options: Record<string, unknown> = {
    safetySettings: safetyCategories.map((category) => ({category, threshold})),
  };

  // Build thinkingConfig from universal fields
  const hasValidBudget =
    typeof config.reasoningBudget === 'number' && config.reasoningBudget > 0;
  const hasReasoningLevel =
    config.reasoningLevel && config.reasoningLevel !== 'off';
  const wantsThinking =
    config.includeReasoning === true || hasValidBudget || hasReasoningLevel;

  if (wantsThinking) {
    // Default to including thoughts if thinking is configured, unless explicitly disabled
    const includeThoughts = config.includeReasoning !== false;
    const thinkingConfig: Record<string, unknown> = {
      includeThoughts,
    };
    if (hasValidBudget) {
      thinkingConfig.thinkingBudget = config.reasoningBudget;
    }
    if (hasReasoningLevel) {
      // Map our reasoningLevel to Google's thinkingLevel
      thinkingConfig.thinkingLevel = config.reasoningLevel;
    }
    options.thinkingConfig = thinkingConfig;
  }

  // Auto-enable includeThoughts for always-thinking models (e.g., Gemini 3)
  // This ensures we get the thought text in the response
  if (isAlwaysThinkingModel(modelName) && !options.thinkingConfig) {
    options.thinkingConfig = {
      includeThoughts: true,
    };
  }

  return options;
}

/**
 * Builds Anthropic/Claude provider options from universal fields.
 */
function buildAnthropicOptions(config: ModelGenerationConfig): object {
  const options: Record<string, unknown> = {};

  // Map reasoningLevel to effort
  const effort = mapReasoningLevelToEffort(config.reasoningLevel);
  if (effort) {
    options.effort = effort;
  }

  // Map reasoningBudget and includeReasoning to thinking config
  const hasValidBudget =
    typeof config.reasoningBudget === 'number' && config.reasoningBudget > 0;
  const wantsThinking =
    config.includeReasoning === true ||
    hasValidBudget ||
    (config.reasoningLevel && config.reasoningLevel !== 'off');

  if (wantsThinking) {
    options.thinking = {
      type: 'enabled' as const,
      ...(hasValidBudget && {budgetTokens: config.reasoningBudget}),
    };
    // Default to sending reasoning if thinking is configured, unless explicitly disabled
    if (config.includeReasoning !== false) {
      options.sendReasoning = true;
    }
  }

  return options;
}

/**
 * Builds OpenAI provider options from universal fields.
 */
function buildOpenAIOptions(config: ModelGenerationConfig): object {
  const options: Record<string, unknown> = {};

  // Map reasoningLevel to reasoningEffort (for o1/o3 models)
  const effort = mapReasoningLevelToEffort(config.reasoningLevel);
  if (effort) {
    options.reasoningEffort = effort;
  }

  return options;
}

/**
 * Builds provider-specific options from universal fields, then merges with
 * any explicit providerOptions overrides.
 */
function getProviderOptions(
  apiType: ApiKeyType,
  generationConfig: ModelGenerationConfig,
  modelName?: string,
): object {
  const overrides = generationConfig.providerOptions;

  switch (apiType) {
    case ApiKeyType.GEMINI_API_KEY: {
      const mapped = buildGoogleOptions(generationConfig, modelName);
      const merged = {...mapped, ...overrides?.google};
      return {google: merged};
    }

    case ApiKeyType.CLAUDE_API_KEY: {
      const mapped = buildAnthropicOptions(generationConfig);
      const merged = {...mapped, ...overrides?.anthropic};
      return Object.keys(merged).length > 0 ? {anthropic: merged} : {};
    }

    case ApiKeyType.OPENAI_API_KEY: {
      const mapped = buildOpenAIOptions(generationConfig);
      const merged = {...mapped, ...overrides?.openai};
      return Object.keys(merged).length > 0 ? {openai: merged} : {};
    }

    case ApiKeyType.OLLAMA_CUSTOM_URL: {
      // Ollama doesn't have universal field mappings, just use overrides
      return overrides?.ollama ? {ollama: overrides.ollama} : {};
    }

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
//
// Flow tree for structured output handling:
//
// generateAIResponse()
// │
// ├─ JSON_SCHEMA mode (uses Output.object())
// │   │
// │   ├─ Text-only model
// │   │   ├─ Success → mapResultToModelResponse()
// │   │   │   └─ result.output = parsed object
// │   │   └─ Rare: NoObjectGeneratedError if JSON malformed
// │   │
// │   ├─ Image model WITHOUT thinking (e.g., gemini-2.5-flash-image)
// │   │   ├─ APICallError 400: "JSON mode is not enabled for this model"
// │   │   │   └─ Model doesn't support JSON schema mode → CONFIG_ERROR
// │   │   ├─ Success: Model returns clean JSON + image (if model supports it)
// │   │   │   └─ result.output = parsed, result.files = images
// │   │   ├─ NoObjectGeneratedError (model returns no JSON text, only images)
// │   │   │   └─ extractContentFromMessages() gets files + text
// │   │   │   └─ Caller parses JSON via parseStructuredOutputFromText()
// │   │   └─ Refusal (output blocked):
// │   │       └─ finishReason: "IMAGE_SAFETY" → "content-filter" → REFUSAL_ERROR
// │   │
// │   └─ Image model WITH thinking (e.g., gemini-3-pro-image-preview)
// │       ├─ Typical: NoObjectGeneratedError
// │       │   └─ Model returns: thought text + thought images + output image
// │       │   └─ Model returns NO output text at all (distinct from reasoning/thought text).
// │       │   └─ AI SDK tries to parse empty string as JSON → NoObjectGeneratedError
// │       │   └─ extractContentFromMessages() filters thought images via providerOptions
// │       │   └─ We salvage: output image + reasoning (but no structured data)
// │       └─ Refusal (input blocked):
// │           └─ No candidates → APICallError → getBlockReason() → REFUSAL_ERROR
// │
// ├─ JSON_FORMAT mode (prompt-based, no Output.object())
// │   │
// │   ├─ Text-only model
// │   │   └─ Success → mapResultToModelResponse()
// │   │       ├─ result.text = raw text containing JSON
// │   │       ├─ result.output = undefined (no native parsing)
// │   │       └─ Caller parses via parseStructuredOutputFromText()
// │   │
// │   ├─ Image model WITHOUT thinking
// │   │   └─ Success → mapResultToModelResponse()
// │   │       ├─ result.text = raw text (may contain JSON)
// │   │       ├─ result.files = [output images]
// │   │       └─ Caller parses JSON from text
// │   │
// │   ├─ Image model WITH thinking
// │   │   └─ Success → mapResultToModelResponse()
// │   │       ├─ result.text = output text
// │   │       ├─ result.reasoning = thought text
// │   │       ├─ result.files = filtered via extractContentFromMessages()
// │   │       └─ Caller parses JSON from text
// │   │
// │   └─ Refusals (any model type)
// │       ├─ Input blocked → APICallError → getBlockReason() → REFUSAL_ERROR
// │       └─ Output blocked → finishReason: "content-filter" → REFUSAL_ERROR
// │
// └─ No structured output
//     └─ Success → mapResultToModelResponse()
//         ├─ result.text, result.files, result.reasoning
//         ├─ For image+thinking models: files filtered via extractContentFromMessages()
//         └─ Refusal: finishReason → mapFinishReason()
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
 *
 * Refusal handling has two paths depending on whether the provider returns candidates:
 *
 * 1. CANDIDATES PRESENT (output blocked during generation):
 *    - Provider returns candidates with a safety-related finish reason
 *    - AI SDK translates to finishReason: "content-filter" (provider-agnostic)
 *    - Caught here in mapFinishReason() → REFUSAL_ERROR
 *
 * 2. NO CANDIDATES (prompt blocked before generation):
 *    - Provider returns block reason with no candidates array
 *    - AI SDK throws APICallError (type validation fails on missing candidates)
 *    - Caught in mapErrorToModelResponse() via getBlockReason() → REFUSAL_ERROR
 *    - Note: getBlockReason() currently only handles Gemini's promptFeedback.blockReason
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
 * Checks for provider block reasons in a response body.
 * Works with either object (from NoObjectGeneratedError) or string (from APICallError).
 * Returns the block reason if found, undefined otherwise.
 */
function getBlockReason(responseBody: unknown): string | undefined {
  try {
    const body =
      typeof responseBody === 'string'
        ? JSON.parse(responseBody)
        : responseBody;

    // Gemini: promptFeedback.blockReason
    if (body?.promptFeedback?.blockReason) {
      return body.promptFeedback.blockReason;
    }

    // Other providers: add patterns here as needed
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Maps AI SDK result to ModelResponse.
 */
function mapResultToModelResponse(
  result: Pick<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    GenerateTextResult<any, any>,
    | 'text'
    | 'files'
    | 'reasoning'
    | 'reasoningText'
    | 'response'
    | 'finishReason'
    | 'usage'
  > & {output?: unknown},
  structuredOutputConfig?: StructuredOutputConfig,
): ModelResponse {
  const rawResponse = result.response?.body
    ? JSON.stringify(result.response.body)
    : undefined;

  // Check for error finish reasons (output blocked during generation)
  const errorStatus = mapFinishReason(result.finishReason);
  if (errorStatus) {
    return {
      status: errorStatus,
      text: result.text,
      rawResponse,
      errorMessage: `Generation stopped: ${result.finishReason}`,
    };
  }

  // Build base response
  const response: ModelResponse = {
    status: ModelResponseStatus.OK,
    rawResponse,
  };

  // Handle text output
  if (result.text) {
    response.text = result.text;
  }

  // Handle structured output - only if result.output is an actual parsed object
  // (not a string, which can happen when Output.object() wasn't used)
  if (
    structuredOutputConfig?.enabled &&
    result.output &&
    typeof result.output === 'object' &&
    result.output !== null
  ) {
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
  // AI SDK bug: result.files includes thought images for thinking responses
  // Workaround: filter via message extraction when reasoning is present
  if (result.files && result.files.length > 0) {
    const hasReasoning = !!response.reasoning;
    if (hasReasoning && result.response?.messages) {
      // Thinking response: extract files via messages to filter thought images
      const extracted = extractContentFromMessages(
        result.response.messages as ModelMessage[],
      );
      response.files = extracted.files.length > 0 ? extracted.files : undefined;
    } else {
      // Non-thinking response: use native result.files
      response.files = result.files.map((f) => ({
        mediaType: f.mediaType,
        base64: f.base64,
      }));
    }
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
 * Extracts files (images), text, and reasoning from the AI SDK's unified message format.
 * Used to salvage content when structured output parsing fails.
 *
 * The AI SDK provides response.messages in a unified format across all providers:
 * [{ role: "assistant", content: [{ type: "text"|"file"|"reasoning", ... }] }]
 *
 * For thinking models, the AI SDK marks:
 * - Thought text as type: "reasoning"
 * - Output files with providerOptions.[provider].thoughtSignature (or similar)
 * - Thought-generated files currently have no providerOptions (AI SDK bug)
 *
 * Workaround for AI SDK bug: AI SDK translates thought: true for text but not files.
 * We detect thinking responses by checking if ANY file has providerOptions, then
 * only include files that have the output marker (thoughtSignature).
 * TODO: Remove workaround when AI SDK fixes this inconsistency.
 * Reported here: https://github.com/vercel/ai/issues/11461
 */
function extractContentFromMessages(messages: ModelMessage[]): {
  files: Array<{mediaType: string; base64: string}>;
  text: string;
  reasoning: string;
} {
  const files: Array<{mediaType: string; base64: string}> = [];
  let text = '';
  let reasoning = '';

  for (const message of messages) {
    if (message.role === 'assistant' && Array.isArray(message.content)) {
      const content = message.content as Exclude<AssistantContent, string>;
      // Detect thinking response: if ANY file has providerOptions, it's a thinking response
      const isThinkingResponse = content.some(
        (part) => part.type === 'file' && !!(part as FilePart).providerOptions,
      );

      for (const part of content) {
        // AI SDK marks thought text as type: "reasoning"
        if (part.type === 'reasoning' && part.text) {
          reasoning += part.text;
        }
        // Regular text output
        if (part.type === 'text' && part.text) {
          text += part.text;
        }
        // Files: filter thought-generated images from output images
        // For thinking responses: only include files WITH providerOptions (output files)
        // For non-thinking responses: include all files
        if (part.type === 'file') {
          const filePart = part as FilePart;
          if (filePart.data && filePart.mediaType) {
            const hasProviderOptions = !!filePart.providerOptions;
            const shouldInclude = isThinkingResponse
              ? hasProviderOptions
              : true;
            if (shouldInclude) {
              files.push({
                mediaType: filePart.mediaType,
                base64: filePart.data as string,
              });
            }
          }
        }
      }
    }
  }

  return {files, text, reasoning};
}

/**
 * Handles NoObjectGeneratedError by salvaging usable content from the response.
 * This error is thrown when structured output parsing fails, but the response
 * may still contain usable content (images, text, reasoning).
 */
function handleNoObjectGeneratedError(
  error: NoObjectGeneratedError,
): ModelResponse {
  const response = error.response as {
    messages?: ModelMessage[];
    body?: unknown;
  };
  const messages = response?.messages;
  const responseBody = response?.body;

  // Use AI SDK's unified message format (provider-agnostic)
  // This properly separates reasoning (type: "reasoning") from output content
  // and filters thought-generated images from output images
  const extracted = messages
    ? extractContentFromMessages(messages)
    : {files: [], text: '', reasoning: ''};

  if (extracted.files.length > 0 || extracted.text || extracted.reasoning) {
    console.log(
      `NoObjectGeneratedError: extracted from response.messages - ` +
        `${extracted.files.length} file(s), ${extracted.text.length} chars text, ` +
        `${extracted.reasoning.length} chars reasoning`,
    );
  }

  // If we got files or text, return OK status so the content can be used
  const hasUsableContent =
    extracted.files.length > 0 || extracted.text.length > 0;

  return {
    status: hasUsableContent
      ? ModelResponseStatus.OK
      : ModelResponseStatus.STRUCTURED_OUTPUT_PARSE_ERROR,
    errorMessage: hasUsableContent ? undefined : error.message,
    text: extracted.text || error.text || undefined,
    files: extracted.files.length > 0 ? extracted.files : undefined,
    reasoning: extracted.reasoning || undefined,
    rawResponse: responseBody ? JSON.stringify(responseBody) : undefined,
    usage: error.usage
      ? {
          promptTokens: error.usage.inputTokens ?? 0,
          completionTokens: error.usage.outputTokens ?? 0,
          totalTokens:
            (error.usage.inputTokens ?? 0) + (error.usage.outputTokens ?? 0),
        }
      : undefined,
  };
}

/**
 * Maps errors to ModelResponse.
 *
 * Error type checking uses AI SDK's built-in static methods:
 * - NoObjectGeneratedError.isInstance(error) - structured output parsing failed
 * - APICallError.isInstance(error) - API call failed (auth, quota, etc.)
 */
function mapErrorToModelResponse(error: unknown): ModelResponse {
  if (NoObjectGeneratedError.isInstance(error)) {
    return handleNoObjectGeneratedError(error);
  }

  // Handle APICallError - contains status codes and response body
  if (APICallError.isInstance(error)) {
    const statusCode = error.statusCode;

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

    // Check for blocked/refused requests
    const blockReason = getBlockReason(error.responseBody);
    if (blockReason) {
      return {
        status: ModelResponseStatus.REFUSAL_ERROR,
        errorMessage: `Request blocked by provider: ${blockReason}`,
        rawResponse: error.responseBody,
      };
    }

    // Check for model capability errors (e.g., JSON mode not supported)
    if (
      error.message.includes('not enabled for this model') ||
      error.message.includes('not supported')
    ) {
      return {
        status: ModelResponseStatus.CONFIG_ERROR,
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

  // Unexpected error type (not from AI SDK)
  console.error('Unexpected error type in mapErrorToModelResponse:', error);
  return {
    status: ModelResponseStatus.UNKNOWN_ERROR,
    errorMessage: error instanceof Error ? error.message : String(error),
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
      modelSettings.modelName,
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

// ============================================================================
// TESTING EXPORTS
// These functions are exported for unit testing purposes.
// ============================================================================

export const _testing = {
  convertPromptToMessages,
  extractTextFromMessage,
  mapGenerationConfig,
  buildGoogleOptions,
  buildAnthropicOptions,
  buildOpenAIOptions,
  getProviderOptions,
  mapReasoningLevelToEffort,
  shouldUseNativeStructuredOutput,
  mapFinishReason,
  getBlockReason,
  mapResultToModelResponse,
  extractContentFromMessages,
  mapErrorToModelResponse,
  getCredentials,
  API_TYPE_TO_PROVIDER,
};
