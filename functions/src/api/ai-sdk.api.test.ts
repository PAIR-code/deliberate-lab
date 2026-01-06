/**
 * Unit tests for ai-sdk.api.ts
 *
 * Tests cover:
 * - Message conversion
 * - Provider option builders
 * - Generation config mapping
 * - Result/error mapping
 * - Structured output handling
 */

import {
  ModelResponseStatus,
  ApiKeyType,
  StructuredOutputType,
  StructuredOutputDataType,
  createModelGenerationConfig,
  StructuredOutputConfig,
  APIKeyConfig,
} from '@deliberation-lab/utils';
import {APICallError, NoObjectGeneratedError} from 'ai';

import {_testing} from './ai-sdk.api';

const {
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
} = _testing;

// ============================================================================
// MESSAGE CONVERSION TESTS
// ============================================================================

describe('convertPromptToMessages', () => {
  it('converts string prompt to user message', () => {
    const result = convertPromptToMessages('Hello, world!');
    expect(result.system).toBeUndefined();
    expect(result.messages).toEqual([{role: 'user', content: 'Hello, world!'}]);
  });

  it('extracts system messages and combines them', () => {
    const messages = [
      {role: 'system' as const, content: 'You are helpful.'},
      {role: 'system' as const, content: 'Be concise.'},
      {role: 'user' as const, content: 'Hi'},
    ];
    const result = convertPromptToMessages(messages);
    expect(result.system).toBe('You are helpful.\n\nBe concise.');
    expect(result.messages).toEqual([{role: 'user', content: 'Hi'}]);
  });

  it('adds empty user message when no non-system messages exist', () => {
    const messages = [{role: 'system' as const, content: 'System prompt'}];
    const result = convertPromptToMessages(messages);
    expect(result.system).toBe('System prompt');
    expect(result.messages).toEqual([{role: 'user', content: ''}]);
  });

  it('handles mixed message types', () => {
    const messages = [
      {role: 'system' as const, content: 'System'},
      {role: 'user' as const, content: 'User message'},
      {role: 'assistant' as const, content: 'Assistant reply'},
      {role: 'user' as const, content: 'Follow up'},
    ];
    const result = convertPromptToMessages(messages);
    expect(result.system).toBe('System');
    expect(result.messages).toHaveLength(3);
    expect(result.messages[0]).toEqual({role: 'user', content: 'User message'});
    expect(result.messages[1]).toEqual({
      role: 'assistant',
      content: 'Assistant reply',
    });
    expect(result.messages[2]).toEqual({role: 'user', content: 'Follow up'});
  });
});

describe('extractTextFromMessage', () => {
  it('returns string content directly', () => {
    const message = {role: 'user' as const, content: 'Hello'};
    expect(extractTextFromMessage(message)).toBe('Hello');
  });

  it('extracts text from array content', () => {
    const message = {
      role: 'assistant' as const,
      content: [
        {type: 'text' as const, text: 'Part 1'},
        {type: 'text' as const, text: 'Part 2'},
      ],
    };
    expect(extractTextFromMessage(message)).toBe('Part 1 Part 2');
  });

  it('filters non-text parts from array content', () => {
    const message = {
      role: 'assistant' as const,
      content: [
        {type: 'text' as const, text: 'Hello'},
        {type: 'file' as const, data: 'base64...', mediaType: 'image/png'},
        {type: 'text' as const, text: 'World'},
      ],
    };
    expect(extractTextFromMessage(message)).toBe('Hello World');
  });

  it('returns empty string for unknown content type', () => {
    const message = {role: 'user' as const, content: 123 as unknown as string};
    expect(extractTextFromMessage(message)).toBe('');
  });
});

// ============================================================================
// PROVIDER OPTION TESTS
// ============================================================================

describe('mapReasoningLevelToEffort', () => {
  it('maps low to low', () => {
    expect(mapReasoningLevelToEffort('low')).toBe('low');
  });

  it('maps medium to medium', () => {
    expect(mapReasoningLevelToEffort('medium')).toBe('medium');
  });

  it('maps high to high', () => {
    expect(mapReasoningLevelToEffort('high')).toBe('high');
  });

  it('returns undefined for off', () => {
    expect(mapReasoningLevelToEffort('off')).toBeUndefined();
  });

  it('returns undefined for minimal', () => {
    expect(mapReasoningLevelToEffort('minimal')).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(mapReasoningLevelToEffort(undefined)).toBeUndefined();
  });
});

describe('buildGoogleOptions', () => {
  it('includes safety settings with default threshold', () => {
    const config = createModelGenerationConfig();
    const options = buildGoogleOptions(config) as Record<string, unknown>;
    expect(options.safetySettings).toBeDefined();
    expect(options.safetySettings).toHaveLength(4);
    const settings = options.safetySettings as Array<{
      category: string;
      threshold: string;
    }>;
    expect(settings[0].threshold).toBe('BLOCK_ONLY_HIGH');
  });

  it('uses BLOCK_NONE when safety filters disabled', () => {
    const config = createModelGenerationConfig({disableSafetyFilters: true});
    const options = buildGoogleOptions(config) as Record<string, unknown>;
    const settings = options.safetySettings as Array<{
      category: string;
      threshold: string;
    }>;
    expect(settings[0].threshold).toBe('BLOCK_NONE');
  });

  it('adds thinkingConfig when includeReasoning is true', () => {
    const config = createModelGenerationConfig({includeReasoning: true});
    const options = buildGoogleOptions(config) as Record<string, unknown>;
    expect(options.thinkingConfig).toEqual({includeThoughts: true});
  });

  it('adds thinkingConfig with budget when reasoningBudget > 0', () => {
    // Note: includeReasoning defaults to false in createModelGenerationConfig
    const config = createModelGenerationConfig({reasoningBudget: 1000});
    const options = buildGoogleOptions(config) as Record<string, unknown>;
    expect(options.thinkingConfig).toEqual({
      includeThoughts: false,
      thinkingBudget: 1000,
    });
  });

  it('adds thinkingConfig with budget and includeThoughts when both set', () => {
    const config = createModelGenerationConfig({
      reasoningBudget: 1000,
      includeReasoning: true,
    });
    const options = buildGoogleOptions(config) as Record<string, unknown>;
    expect(options.thinkingConfig).toEqual({
      includeThoughts: true,
      thinkingBudget: 1000,
    });
  });

  it('adds thinkingConfig with level when reasoningLevel set', () => {
    // Note: includeReasoning defaults to false in createModelGenerationConfig
    const config = createModelGenerationConfig({reasoningLevel: 'medium'});
    const options = buildGoogleOptions(config) as Record<string, unknown>;
    expect(options.thinkingConfig).toEqual({
      includeThoughts: false,
      thinkingLevel: 'medium',
    });
  });

  it('adds thinkingConfig with level and includeThoughts when both set', () => {
    const config = createModelGenerationConfig({
      reasoningLevel: 'high',
      includeReasoning: true,
    });
    const options = buildGoogleOptions(config) as Record<string, unknown>;
    expect(options.thinkingConfig).toEqual({
      includeThoughts: true,
      thinkingLevel: 'high',
    });
  });

  it('auto-enables includeThoughts for always-thinking models', () => {
    const config = createModelGenerationConfig();
    const options = buildGoogleOptions(config, 'gemini-3-pro') as Record<
      string,
      unknown
    >;
    expect(options.thinkingConfig).toEqual({includeThoughts: true});
  });

  it('does not override existing thinkingConfig for always-thinking models', () => {
    const config = createModelGenerationConfig({
      reasoningBudget: 500,
      includeReasoning: false,
    });
    const options = buildGoogleOptions(config, 'gemini-3-pro') as Record<
      string,
      unknown
    >;
    // Should use the config values, not auto-enable
    expect(options.thinkingConfig).toEqual({
      includeThoughts: false,
      thinkingBudget: 500,
    });
  });
});

describe('buildAnthropicOptions', () => {
  it('returns empty object for default config', () => {
    const config = createModelGenerationConfig();
    const options = buildAnthropicOptions(config);
    expect(options).toEqual({});
  });

  it('adds effort when reasoningLevel set', () => {
    const config = createModelGenerationConfig({reasoningLevel: 'high'});
    const options = buildAnthropicOptions(config) as Record<string, unknown>;
    expect(options.effort).toBe('high');
  });

  it('adds thinking config when includeReasoning is true', () => {
    const config = createModelGenerationConfig({includeReasoning: true});
    const options = buildAnthropicOptions(config) as Record<string, unknown>;
    expect(options.thinking).toEqual({type: 'enabled'});
    expect(options.sendReasoning).toBe(true);
  });

  it('adds budgetTokens when reasoningBudget set', () => {
    const config = createModelGenerationConfig({reasoningBudget: 2000});
    const options = buildAnthropicOptions(config) as Record<string, unknown>;
    expect(options.thinking).toEqual({type: 'enabled', budgetTokens: 2000});
  });
});

describe('buildOpenAIOptions', () => {
  it('returns empty object for default config', () => {
    const config = createModelGenerationConfig();
    const options = buildOpenAIOptions(config);
    expect(options).toEqual({});
  });

  it('adds reasoningEffort when reasoningLevel set', () => {
    const config = createModelGenerationConfig({reasoningLevel: 'low'});
    const options = buildOpenAIOptions(config) as Record<string, unknown>;
    expect(options.reasoningEffort).toBe('low');
  });
});

describe('getProviderOptions', () => {
  it('returns google options for Gemini', () => {
    const config = createModelGenerationConfig();
    const options = getProviderOptions(
      ApiKeyType.GEMINI_API_KEY,
      config,
    ) as Record<string, unknown>;
    expect(options.google).toBeDefined();
  });

  it('returns anthropic options for Claude', () => {
    const config = createModelGenerationConfig({reasoningLevel: 'medium'});
    const options = getProviderOptions(
      ApiKeyType.CLAUDE_API_KEY,
      config,
    ) as Record<string, unknown>;
    expect(options.anthropic).toBeDefined();
  });

  it('returns openai options for OpenAI', () => {
    const config = createModelGenerationConfig({reasoningLevel: 'high'});
    const options = getProviderOptions(
      ApiKeyType.OPENAI_API_KEY,
      config,
    ) as Record<string, unknown>;
    expect(options.openai).toBeDefined();
  });

  it('returns empty for Ollama without overrides', () => {
    const config = createModelGenerationConfig();
    const options = getProviderOptions(ApiKeyType.OLLAMA_CUSTOM_URL, config);
    expect(options).toEqual({});
  });

  it('merges providerOptions overrides', () => {
    const config = createModelGenerationConfig({
      providerOptions: {
        google: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      },
    });
    const options = getProviderOptions(
      ApiKeyType.GEMINI_API_KEY,
      config,
    ) as Record<string, {responseModalities?: string[]}>;
    expect(options.google.responseModalities).toEqual(['TEXT', 'IMAGE']);
  });
});

// ============================================================================
// GENERATION CONFIG TESTS
// ============================================================================

describe('mapGenerationConfig', () => {
  it('maps basic settings', () => {
    const config = createModelGenerationConfig({
      maxTokens: 1000,
      temperature: 0.7,
      topP: 0.9,
    });
    const settings = mapGenerationConfig(config) as Record<string, unknown>;
    expect(settings.maxOutputTokens).toBe(1000);
    expect(settings.temperature).toBe(0.7);
    expect(settings.topP).toBe(0.9);
    expect(settings.maxRetries).toBe(0);
  });

  it('includes stop sequences when provided', () => {
    const config = createModelGenerationConfig({
      stopSequences: ['STOP', 'END'],
    });
    const settings = mapGenerationConfig(config) as Record<string, unknown>;
    expect(settings.stopSequences).toEqual(['STOP', 'END']);
  });

  it('excludes stop sequences when empty', () => {
    const config = createModelGenerationConfig({stopSequences: []});
    const settings = mapGenerationConfig(config) as Record<string, unknown>;
    expect(settings.stopSequences).toBeUndefined();
  });

  it('includes frequency penalty when non-zero', () => {
    const config = createModelGenerationConfig({frequencyPenalty: 0.5});
    const settings = mapGenerationConfig(config) as Record<string, unknown>;
    expect(settings.frequencyPenalty).toBe(0.5);
  });

  it('excludes frequency penalty when zero', () => {
    const config = createModelGenerationConfig({frequencyPenalty: 0});
    const settings = mapGenerationConfig(config) as Record<string, unknown>;
    expect(settings.frequencyPenalty).toBeUndefined();
  });

  it('includes presence penalty when non-zero', () => {
    const config = createModelGenerationConfig({presencePenalty: 0.3});
    const settings = mapGenerationConfig(config) as Record<string, unknown>;
    expect(settings.presencePenalty).toBe(0.3);
  });
});

// ============================================================================
// STRUCTURED OUTPUT TESTS
// ============================================================================

describe('shouldUseNativeStructuredOutput', () => {
  it('returns false for undefined config', () => {
    expect(shouldUseNativeStructuredOutput(undefined)).toBe(false);
  });

  it('returns false when not enabled', () => {
    const config: StructuredOutputConfig = {
      enabled: false,
      type: StructuredOutputType.JSON_SCHEMA,
      appendToPrompt: false,
      schema: {type: StructuredOutputDataType.OBJECT},
    };
    expect(shouldUseNativeStructuredOutput(config)).toBe(false);
  });

  it('returns false when no schema', () => {
    const config: StructuredOutputConfig = {
      enabled: true,
      type: StructuredOutputType.JSON_SCHEMA,
      appendToPrompt: false,
    };
    expect(shouldUseNativeStructuredOutput(config)).toBe(false);
  });

  it('returns false for JSON_FORMAT type', () => {
    const config: StructuredOutputConfig = {
      enabled: true,
      type: StructuredOutputType.JSON_FORMAT,
      appendToPrompt: true,
      schema: {type: StructuredOutputDataType.OBJECT},
    };
    expect(shouldUseNativeStructuredOutput(config)).toBe(false);
  });

  it('returns true for JSON_SCHEMA with schema', () => {
    const config: StructuredOutputConfig = {
      enabled: true,
      type: StructuredOutputType.JSON_SCHEMA,
      appendToPrompt: false,
      schema: {type: StructuredOutputDataType.OBJECT},
    };
    expect(shouldUseNativeStructuredOutput(config)).toBe(true);
  });
});

// ============================================================================
// RESULT MAPPING TESTS
// ============================================================================

describe('mapFinishReason', () => {
  it('returns null for stop', () => {
    expect(mapFinishReason('stop')).toBeNull();
  });

  it('returns null for end_turn', () => {
    expect(mapFinishReason('end_turn')).toBeNull();
  });

  it('returns LENGTH_ERROR for length', () => {
    expect(mapFinishReason('length')).toBe(ModelResponseStatus.LENGTH_ERROR);
  });

  it('returns LENGTH_ERROR for max_tokens', () => {
    expect(mapFinishReason('max_tokens')).toBe(
      ModelResponseStatus.LENGTH_ERROR,
    );
  });

  it('returns REFUSAL_ERROR for content-filter', () => {
    expect(mapFinishReason('content-filter')).toBe(
      ModelResponseStatus.REFUSAL_ERROR,
    );
  });

  it('returns UNKNOWN_ERROR for error', () => {
    expect(mapFinishReason('error')).toBe(ModelResponseStatus.UNKNOWN_ERROR);
  });

  it('returns null for unknown reasons', () => {
    expect(mapFinishReason('other')).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(mapFinishReason(undefined)).toBeNull();
  });
});

describe('getBlockReason', () => {
  it('extracts Gemini block reason from object', () => {
    const body = {promptFeedback: {blockReason: 'SAFETY'}};
    expect(getBlockReason(body)).toBe('SAFETY');
  });

  it('extracts Gemini block reason from JSON string', () => {
    const body = JSON.stringify({promptFeedback: {blockReason: 'PROHIBITED'}});
    expect(getBlockReason(body)).toBe('PROHIBITED');
  });

  it('returns undefined for no block reason', () => {
    const body = {candidates: [{text: 'Hello'}]};
    expect(getBlockReason(body)).toBeUndefined();
  });

  it('returns undefined for invalid JSON string', () => {
    expect(getBlockReason('not json')).toBeUndefined();
  });

  it('returns undefined for null', () => {
    expect(getBlockReason(null)).toBeUndefined();
  });
});

describe('mapResultToModelResponse', () => {
  // Helper to create a complete mock result with defaults
  // Uses type assertion via unknown to satisfy TypeScript while allowing partial mocks
  const createMockResult = (
    overrides: Record<string, unknown> = {},
  ): Parameters<typeof mapResultToModelResponse>[0] =>
    ({
      text: '',
      reasoning: [],
      files: [],
      reasoningText: undefined,
      response: undefined,
      finishReason: 'stop' as const,
      usage: undefined,
      ...overrides,
    }) as unknown as Parameters<typeof mapResultToModelResponse>[0];

  it('maps successful text response', () => {
    const result = createMockResult({
      text: 'Hello, world!',
      finishReason: 'stop',
      response: {body: {text: 'Hello'}},
    });
    const response = mapResultToModelResponse(result);
    expect(response.status).toBe(ModelResponseStatus.OK);
    expect(response.text).toBe('Hello, world!');
  });

  it('includes usage information', () => {
    const result = createMockResult({
      text: 'Response',
      finishReason: 'stop',
      usage: {inputTokens: 10, outputTokens: 20},
    });
    const response = mapResultToModelResponse(result);
    expect(response.usage).toEqual({
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
    });
  });

  it('handles structured output', () => {
    const result = createMockResult({
      text: '',
      output: {name: 'Test', value: 42},
      finishReason: 'stop',
    });
    const config: StructuredOutputConfig = {
      enabled: true,
      type: StructuredOutputType.JSON_SCHEMA,
      appendToPrompt: false,
      schema: {type: StructuredOutputDataType.OBJECT},
    };
    const response = mapResultToModelResponse(result, config);
    expect(response.parsedResponse).toEqual({name: 'Test', value: 42});
    expect(response.text).toBe('{"name":"Test","value":42}');
  });

  it('handles reasoning text', () => {
    const result = createMockResult({
      text: 'Answer',
      reasoningText: 'Let me think...',
      finishReason: 'stop',
    });
    const response = mapResultToModelResponse(result);
    expect(response.reasoning).toBe('Let me think...');
  });

  it('handles reasoning array', () => {
    const result = createMockResult({
      text: 'Answer',
      reasoning: [{text: 'Step 1'}, {text: 'Step 2'}],
      finishReason: 'stop',
    });
    const response = mapResultToModelResponse(result);
    expect(response.reasoning).toBe('Step 1Step 2');
  });

  it('maps error finish reasons', () => {
    const result = createMockResult({
      text: 'Partial...',
      finishReason: 'length',
    });
    const response = mapResultToModelResponse(result);
    expect(response.status).toBe(ModelResponseStatus.LENGTH_ERROR);
    expect(response.errorMessage).toContain('length');
  });

  it('handles files without reasoning', () => {
    const result = createMockResult({
      text: '',
      files: [{mediaType: 'image/png', base64: 'abc123'}],
      finishReason: 'stop',
    });
    const response = mapResultToModelResponse(result);
    expect(response.files).toEqual([
      {mediaType: 'image/png', base64: 'abc123'},
    ]);
  });
});

// ============================================================================
// CONTENT EXTRACTION TESTS
// ============================================================================

describe('extractContentFromMessages', () => {
  it('extracts text from assistant message', () => {
    const messages = [
      {
        role: 'assistant' as const,
        content: [{type: 'text' as const, text: 'Hello'}],
      },
    ];
    const result = extractContentFromMessages(messages);
    expect(result.text).toBe('Hello');
  });

  it('extracts reasoning from assistant message', () => {
    const messages = [
      {
        role: 'assistant' as const,
        content: [{type: 'reasoning' as const, text: 'Thinking...'}],
      },
    ];
    const result = extractContentFromMessages(messages);
    expect(result.reasoning).toBe('Thinking...');
  });

  it('extracts files from non-thinking response', () => {
    const messages = [
      {
        role: 'assistant' as const,
        content: [
          {type: 'file' as const, data: 'base64data', mediaType: 'image/png'},
        ],
      },
    ];
    const result = extractContentFromMessages(messages);
    expect(result.files).toHaveLength(1);
    expect(result.files[0]).toEqual({
      mediaType: 'image/png',
      base64: 'base64data',
    });
  });

  it('filters thought files in thinking response', () => {
    const messages = [
      {
        role: 'assistant' as const,
        content: [
          // Thought file (no providerOptions)
          {
            type: 'file' as const,
            data: 'thought_image',
            mediaType: 'image/png',
          },
          // Output file (has providerOptions)
          {
            type: 'file' as const,
            data: 'output_image',
            mediaType: 'image/jpeg',
            providerOptions: {google: {thoughtSignature: 'xyz'}},
          },
        ],
      },
    ];
    const result = extractContentFromMessages(messages);
    // Should only include the output file (with providerOptions)
    expect(result.files).toHaveLength(1);
    expect(result.files[0].base64).toBe('output_image');
  });

  it('ignores non-assistant messages', () => {
    const messages = [
      {role: 'user' as const, content: 'Hello'},
      {
        role: 'assistant' as const,
        content: [{type: 'text' as const, text: 'Response'}],
      },
    ];
    const result = extractContentFromMessages(messages);
    expect(result.text).toBe('Response');
  });

  it('returns empty values for empty messages', () => {
    const result = extractContentFromMessages([]);
    expect(result.text).toBe('');
    expect(result.reasoning).toBe('');
    expect(result.files).toEqual([]);
  });
});

// ============================================================================
// ERROR MAPPING TESTS
// ============================================================================

describe('mapErrorToModelResponse', () => {
  describe('APICallError handling', () => {
    it('maps 401 status to AUTHENTICATION_ERROR', () => {
      const error = new APICallError({
        message: 'Invalid API key',
        statusCode: 401,
        url: 'https://api.example.com',
        requestBodyValues: {},
      });
      const response = mapErrorToModelResponse(error);
      expect(response.status).toBe(ModelResponseStatus.AUTHENTICATION_ERROR);
      expect(response.errorMessage).toContain('Invalid API key');
    });

    it('maps 403 status to AUTHENTICATION_ERROR', () => {
      const error = new APICallError({
        message: 'Forbidden',
        statusCode: 403,
        url: 'https://api.example.com',
        requestBodyValues: {},
      });
      const response = mapErrorToModelResponse(error);
      expect(response.status).toBe(ModelResponseStatus.AUTHENTICATION_ERROR);
    });

    it('maps 429 status to QUOTA_ERROR', () => {
      const error = new APICallError({
        message: 'Rate limit exceeded',
        statusCode: 429,
        url: 'https://api.example.com',
        requestBodyValues: {},
      });
      const response = mapErrorToModelResponse(error);
      expect(response.status).toBe(ModelResponseStatus.QUOTA_ERROR);
      expect(response.errorMessage).toContain('Rate limit');
    });

    it('maps 500 status to PROVIDER_UNAVAILABLE_ERROR', () => {
      const error = new APICallError({
        message: 'Internal server error',
        statusCode: 500,
        url: 'https://api.example.com',
        requestBodyValues: {},
      });
      const response = mapErrorToModelResponse(error);
      expect(response.status).toBe(
        ModelResponseStatus.PROVIDER_UNAVAILABLE_ERROR,
      );
    });

    it('maps 503 status to PROVIDER_UNAVAILABLE_ERROR', () => {
      const error = new APICallError({
        message: 'Service Unavailable',
        statusCode: 503,
        url: 'https://api.example.com',
        requestBodyValues: {},
      });
      const response = mapErrorToModelResponse(error);
      expect(response.status).toBe(
        ModelResponseStatus.PROVIDER_UNAVAILABLE_ERROR,
      );
    });

    it('maps block reason to REFUSAL_ERROR', () => {
      const error = new APICallError({
        message: 'Request blocked',
        statusCode: 400,
        url: 'https://api.example.com',
        requestBodyValues: {},
        responseBody: JSON.stringify({
          promptFeedback: {blockReason: 'SAFETY'},
        }),
      });
      const response = mapErrorToModelResponse(error);
      expect(response.status).toBe(ModelResponseStatus.REFUSAL_ERROR);
      expect(response.errorMessage).toContain('SAFETY');
    });

    it('maps "not enabled for this model" to CONFIG_ERROR', () => {
      const error = new APICallError({
        message: 'JSON mode is not enabled for this model',
        statusCode: 400,
        url: 'https://api.example.com',
        requestBodyValues: {},
      });
      const response = mapErrorToModelResponse(error);
      expect(response.status).toBe(ModelResponseStatus.CONFIG_ERROR);
    });

    it('maps "not supported" to CONFIG_ERROR', () => {
      const error = new APICallError({
        message: 'Feature not supported',
        statusCode: 400,
        url: 'https://api.example.com',
        requestBodyValues: {},
      });
      const response = mapErrorToModelResponse(error);
      expect(response.status).toBe(ModelResponseStatus.CONFIG_ERROR);
    });

    it('maps JSON/parse errors to STRUCTURED_OUTPUT_PARSE_ERROR', () => {
      const error = new APICallError({
        message: 'Failed to parse JSON response',
        statusCode: 400,
        url: 'https://api.example.com',
        requestBodyValues: {},
      });
      const response = mapErrorToModelResponse(error);
      expect(response.status).toBe(
        ModelResponseStatus.STRUCTURED_OUTPUT_PARSE_ERROR,
      );
    });

    it('maps schema errors to STRUCTURED_OUTPUT_PARSE_ERROR', () => {
      const error = new APICallError({
        message: 'Response does not match schema',
        statusCode: 400,
        url: 'https://api.example.com',
        requestBodyValues: {},
      });
      const response = mapErrorToModelResponse(error);
      expect(response.status).toBe(
        ModelResponseStatus.STRUCTURED_OUTPUT_PARSE_ERROR,
      );
    });

    it('maps unknown APICallError to UNKNOWN_ERROR', () => {
      const error = new APICallError({
        message: 'Some other error',
        statusCode: 400,
        url: 'https://api.example.com',
        requestBodyValues: {},
      });
      const response = mapErrorToModelResponse(error);
      expect(response.status).toBe(ModelResponseStatus.UNKNOWN_ERROR);
    });
  });

  describe('NoObjectGeneratedError handling', () => {
    // Helper to create NoObjectGeneratedError with mock response
    // Uses type assertions because we're creating partial mock data
    const createNoObjectError = (opts: {
      messages?: unknown[];
      usage?: {inputTokens: number; outputTokens: number};
    }) =>
      new NoObjectGeneratedError({
        message: 'No object generated',
        finishReason: 'stop',
        usage: (opts.usage ?? {inputTokens: 0, outputTokens: 0}) as never,
        response: {messages: opts.messages ?? []} as never,
      });

    it('returns OK status when files are extracted', () => {
      const error = createNoObjectError({
        messages: [
          {
            role: 'assistant',
            content: [
              {type: 'file', data: 'base64imagedata', mediaType: 'image/png'},
            ],
          },
        ],
      });
      const response = mapErrorToModelResponse(error);
      expect(response.status).toBe(ModelResponseStatus.OK);
      expect(response.files).toHaveLength(1);
    });

    it('returns OK status when text is extracted', () => {
      const error = createNoObjectError({
        messages: [
          {
            role: 'assistant',
            content: [{type: 'text', text: 'Some text response'}],
          },
        ],
      });
      const response = mapErrorToModelResponse(error);
      expect(response.status).toBe(ModelResponseStatus.OK);
      expect(response.text).toBe('Some text response');
    });

    it('extracts reasoning from messages', () => {
      const error = createNoObjectError({
        messages: [
          {
            role: 'assistant',
            content: [
              {type: 'reasoning', text: 'Thinking process...'},
              {type: 'text', text: 'Final answer'},
            ],
          },
        ],
      });
      const response = mapErrorToModelResponse(error);
      expect(response.status).toBe(ModelResponseStatus.OK);
      expect(response.reasoning).toBe('Thinking process...');
      expect(response.text).toBe('Final answer');
    });

    it('returns STRUCTURED_OUTPUT_PARSE_ERROR when no content extracted', () => {
      const error = createNoObjectError({messages: []});
      const response = mapErrorToModelResponse(error);
      expect(response.status).toBe(
        ModelResponseStatus.STRUCTURED_OUTPUT_PARSE_ERROR,
      );
    });

    it('includes usage information when available', () => {
      const error = createNoObjectError({
        usage: {inputTokens: 100, outputTokens: 50},
        messages: [
          {
            role: 'assistant',
            content: [{type: 'text', text: 'Response'}],
          },
        ],
      });
      const response = mapErrorToModelResponse(error);
      expect(response.usage).toEqual({
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      });
    });
  });

  describe('generic error handling', () => {
    it('maps generic Error to UNKNOWN_ERROR', () => {
      const error = new Error('Something went wrong');
      const response = mapErrorToModelResponse(error);
      expect(response.status).toBe(ModelResponseStatus.UNKNOWN_ERROR);
      expect(response.errorMessage).toBe('Something went wrong');
    });

    it('maps non-Error to UNKNOWN_ERROR', () => {
      const response = mapErrorToModelResponse('string error');
      expect(response.status).toBe(ModelResponseStatus.UNKNOWN_ERROR);
      expect(response.errorMessage).toBe('string error');
    });
  });
});

// ============================================================================
// CREDENTIAL TESTS
// ============================================================================

describe('getCredentials', () => {
  const apiKeyConfig: APIKeyConfig = {
    geminiApiKey: 'gemini-key',
    openAIApiKey: {apiKey: 'openai-key', baseUrl: 'https://custom.openai.com'},
    claudeApiKey: {apiKey: 'claude-key', baseUrl: 'https://custom.claude.com'},
    ollamaApiKey: {url: 'http://localhost:11434', apiKey: 'ollama-key'},
  };

  it('extracts Gemini credentials', () => {
    const creds = getCredentials(apiKeyConfig, ApiKeyType.GEMINI_API_KEY);
    expect(creds).toEqual({apiKey: 'gemini-key'});
  });

  it('extracts OpenAI credentials with baseURL', () => {
    const creds = getCredentials(apiKeyConfig, ApiKeyType.OPENAI_API_KEY);
    expect(creds).toEqual({
      apiKey: 'openai-key',
      baseURL: 'https://custom.openai.com',
    });
  });

  it('extracts Claude credentials with baseURL', () => {
    const creds = getCredentials(apiKeyConfig, ApiKeyType.CLAUDE_API_KEY);
    expect(creds).toEqual({
      apiKey: 'claude-key',
      baseURL: 'https://custom.claude.com',
    });
  });

  it('extracts Ollama credentials', () => {
    const creds = getCredentials(apiKeyConfig, ApiKeyType.OLLAMA_CUSTOM_URL);
    expect(creds).toEqual({
      apiKey: 'ollama-key',
      baseURL: 'http://localhost:11434',
    });
  });

  it('handles missing optional baseUrl', () => {
    // Create a partial config - getCredentials handles missing fields gracefully
    const config = {
      openAIApiKey: {apiKey: 'key', baseUrl: ''},
    } as APIKeyConfig;
    const creds = getCredentials(config, ApiKeyType.OPENAI_API_KEY);
    expect(creds).toEqual({apiKey: 'key', baseURL: undefined});
  });
});

describe('API_TYPE_TO_PROVIDER', () => {
  it('maps all ApiKeyType values', () => {
    expect(API_TYPE_TO_PROVIDER[ApiKeyType.GEMINI_API_KEY]).toBe('google');
    expect(API_TYPE_TO_PROVIDER[ApiKeyType.OPENAI_API_KEY]).toBe('openai');
    expect(API_TYPE_TO_PROVIDER[ApiKeyType.CLAUDE_API_KEY]).toBe('anthropic');
    expect(API_TYPE_TO_PROVIDER[ApiKeyType.OLLAMA_CUSTOM_URL]).toBe('ollama');
  });
});
