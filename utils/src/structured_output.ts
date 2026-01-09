/** Structured output types, constants, and functions. */
// ****************************************************************************
// TYPES
// ****************************************************************************

export enum StructuredOutputType {
  NONE = 'NONE', // No special constraints on the sampler.
  JSON_FORMAT = 'JSON_FORMAT', // Constrain the sampler to output JSON.
  JSON_SCHEMA = 'JSON_SCHEMA', // Constrain sampler to the configured schema.
}

export enum StructuredOutputDataType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  INTEGER = 'INTEGER',
  BOOLEAN = 'BOOLEAN',
  ARRAY = 'ARRAY',
  OBJECT = 'OBJECT',
  ENUM = 'ENUM',
}

export interface StructuredOutputSchema {
  type: StructuredOutputDataType;
  description?: string;
  properties?: {name: string; schema: StructuredOutputSchema}[];
  arrayItems?: StructuredOutputSchema;
  enumItems?: string[];
}

/**
 * Base configuration for structured output.
 * Use ChatMediatorStructuredOutputConfig for chat-specific configurations.
 */
export interface StructuredOutputConfig {
  enabled: boolean;
  type: StructuredOutputType;
  schema?: StructuredOutputSchema;
  appendToPrompt: boolean;
}

/**
 * Chat mediator-specific structured output configuration.
 * Extends base config with field mappings for extracting chat decision fields.
 */
export interface ChatMediatorStructuredOutputConfig extends StructuredOutputConfig {
  shouldRespondField: string; // Maps to schema field for respond decision
  messageField: string; // Maps to schema field for message content
  explanationField: string; // Maps to schema field for decision explanation
  readyToEndField: string; // Maps to schema field for end-chat signal
}

/**
 * Extracted fields from a chat mediator's structured output.
 * Represents the mediator's decision about responding to the conversation.
 */
export interface ChatMediatorStructuredFields {
  shouldRespond: boolean; // Should the mediator send a message?
  message: string | null; // The message to send (null if not responding)
  explanation: string | null; // Why the mediator made this decision
  readyToEndChat: boolean; // Is the mediator ready to end the conversation?
}

/**
 * Extract chat mediator decision fields from parsed structured output.
 * Uses the configured field names from ChatMediatorStructuredOutputConfig.
 */
export function extractChatMediatorStructuredFields(
  parsed: Record<string, unknown>,
  config: ChatMediatorStructuredOutputConfig,
): ChatMediatorStructuredFields {
  // shouldRespond: defaults to true unless explicitly set to false
  const shouldRespondValue = config.shouldRespondField
    ? parsed[config.shouldRespondField]
    : undefined;
  const shouldRespond = shouldRespondValue !== false;

  // message: from the configured messageField (default 'response')
  const messageField = config.messageField || DEFAULT_RESPONSE_FIELD;
  const message =
    typeof parsed[messageField] === 'string'
      ? (parsed[messageField] as string)
      : null;

  // explanation: from the configured explanationField (default 'explanation')
  const explanationField = config.explanationField || DEFAULT_EXPLANATION_FIELD;
  const explanation =
    typeof parsed[explanationField] === 'string'
      ? (parsed[explanationField] as string)
      : null;

  // readyToEndChat: from the configured readyToEndField
  const readyToEndChat = config.readyToEndField
    ? Boolean(parsed[config.readyToEndField])
    : false;

  return {
    shouldRespond,
    message,
    explanation,
    readyToEndChat,
  };
}

// ****************************************************************************
// CONSTANTS
// ****************************************************************************
// TODO: Move constants to group_chat.structured_output.ts
export const DEFAULT_SHOULD_RESPOND_FIELD = 'shouldRespond';
export const DEFAULT_RESPONSE_FIELD = 'response';
export const DEFAULT_EXPLANATION_FIELD = 'explanation';
export const DEFAULT_READY_TO_END_FIELD = 'readyToEndChat';

// ****************************************************************************
// FUNCTIONS
// ****************************************************************************

/** Defaults to chat structured output with should respond, ready to end,
 * etc. fields.
 */
export function createStructuredOutputConfig(
  config: Partial<ChatMediatorStructuredOutputConfig> = {},
): ChatMediatorStructuredOutputConfig {
  const schema = config.schema ?? {
    type: StructuredOutputDataType.OBJECT,
    properties: [
      {
        name: DEFAULT_EXPLANATION_FIELD,
        schema: {
          type: StructuredOutputDataType.STRING,
          description:
            '1-2 sentences explaining why you are sending this message, or why you are staying silent, based on your persona and the chat context.',
        },
      },
      {
        name: DEFAULT_SHOULD_RESPOND_FIELD,
        schema: {
          type: StructuredOutputDataType.BOOLEAN,
          description:
            'True if you will send a message, False if you prefer to stay silent.',
        },
      },
      {
        name: DEFAULT_RESPONSE_FIELD,
        schema: {
          type: StructuredOutputDataType.STRING,
          description:
            'Your chat message (empty if you prefer to stay silent).',
        },
      },
      {
        name: DEFAULT_READY_TO_END_FIELD,
        schema: {
          type: StructuredOutputDataType.BOOLEAN,
          description:
            'Whether or not you completed your goals and are ready to end the conversation.',
        },
      },
    ],
  };
  return {
    enabled: config.enabled ?? true,
    type: config.type ?? StructuredOutputType.JSON_FORMAT,
    schema: schema,
    appendToPrompt: config.appendToPrompt ?? true,
    shouldRespondField:
      config.shouldRespondField ?? DEFAULT_SHOULD_RESPOND_FIELD,
    messageField: config.messageField ?? DEFAULT_RESPONSE_FIELD,
    explanationField: config.explanationField ?? DEFAULT_EXPLANATION_FIELD,
    readyToEndField: config.readyToEndField ?? DEFAULT_READY_TO_END_FIELD,
  };
}

export function schemaToObject(schema: StructuredOutputSchema): object {
  let properties: Record<string, object> | undefined = undefined;
  let required = undefined;
  if (schema.properties) {
    properties = {};
    for (const property of schema.properties) {
      properties[property.name] = schemaToObject(property.schema);
    }
    required = schema.properties.map((property) => property.name);
  }
  const arrayItems = schema.arrayItems
    ? schemaToObject(schema.arrayItems)
    : undefined;
  return {
    description: schema.description ?? undefined,
    type: schema.type.toLowerCase(),
    properties: properties ?? undefined,
    items: arrayItems ?? undefined,
    enum: schema.enumItems ?? undefined,
    required: required,
  };
}

export function structuredOutputEnabled(
  config?: StructuredOutputConfig,
): boolean {
  if (!config) {
    return false;
  }
  if (config.type == StructuredOutputType.NONE && !config?.appendToPrompt) {
    return false;
  }
  if (!config.schema) {
    return false;
  }
  if (config.schema.properties?.length == 0) {
    return false;
  }
  return config.enabled;
}

export function printSchema(
  schema: StructuredOutputSchema,
  indent: number = 2,
): string {
  return JSON.stringify(schemaToObject(schema), null, indent);
}

export function makeStructuredOutputPrompt(
  config?: StructuredOutputConfig,
  includeScaffolding = true,
): string {
  if (
    !structuredOutputEnabled(config) ||
    !config?.appendToPrompt ||
    !config?.schema
  ) {
    return '';
  }
  const scaffolding = includeScaffolding ? `\n--- Response format ---\n` : '';
  return `${scaffolding}Return only valid JSON, according to the following schema:
${printSchema(config.schema)}
`;
}
