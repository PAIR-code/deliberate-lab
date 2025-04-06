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
}

export interface StructuredOutputSchema {
  type: StructuredOutputDataType;
  description?: string;
  properties?: {name: string; schema: StructuredOutputSchema}[];
  arrayItems?: StructuredOutputSchema;
}

export interface StructuredOutputConfig {
  enabled: boolean;
  type: StructuredOutputType;
  schema?: StructuredOutputSchema;
  appendToPrompt: boolean;
  shouldRespondField: string;
  explanationField: string;
  messageField: string;
}

// ****************************************************************************
// CONSTANTS
// ****************************************************************************
export const DEFAULT_SHOULD_RESPOND_FIELD = 'shouldRespond';
export const DEFAULT_RESPONSE_FIELD = 'response';
export const DEFAULT_EXPLANATION_FIELD = 'explanation';

// ****************************************************************************
// FUNCTIONS
// ****************************************************************************

export function createStructuredOutputConfig(
  config: Partial<StructuredOutputConfig> = {},
): StructuredOutputConfig {
  const schema = config.schema ?? {
    type: StructuredOutputDataType.OBJECT,
    properties: [
      {
        name: DEFAULT_EXPLANATION_FIELD,
        schema: {
          type: StructuredOutputDataType.STRING,
          description: 'Your reasoning for your response.',
        },
      },
      {
        name: DEFAULT_SHOULD_RESPOND_FIELD,
        schema: {
          type: StructuredOutputDataType.BOOLEAN,
          description: 'Whether or not to respond.',
        },
      },
      {
        name: DEFAULT_RESPONSE_FIELD,
        schema: {
          type: StructuredOutputDataType.STRING,
          description: 'Your response.',
        },
      },
    ],
  };
  return {
    enabled: config.enabled ?? true,
    type: config.type ?? StructuredOutputType.NONE,
    schema: schema,
    appendToPrompt: true,
    shouldRespondField:
      config.shouldRespondField ?? DEFAULT_SHOULD_RESPOND_FIELD,
    messageField: config.messageField ?? DEFAULT_RESPONSE_FIELD,
    explanationField: config.explanationField ?? DEFAULT_EXPLANATION_FIELD,
  };
}

function schemaToObject(schema: StructuredOutputSchema): object {
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
): string {
  if (
    !structuredOutputEnabled(config) ||
    !config?.appendToPrompt ||
    !config?.schema
  ) {
    return '';
  }
  return `Return only valid JSON, according to the following schema:
${printSchema(config.schema)}
`;
}
