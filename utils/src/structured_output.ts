export enum StructuredOutputType {
  NONE = 'NONE',                // No special constraints on the sampler.
  JSON_FORMAT = 'JSON_FORMAT',  // Constrain the sampler to output JSON.
  JSON_SCHEMA = 'JSON_SCHEMA',  // Constrain sampler to the configured schema.
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
  properties?: Map<string, StructuredOutputSchema>;
  arrayItems?: StructuredOutputSchema;
}

export interface StructuredOutputConfig {
  type: StructuredOutputType;
  schema?: StructuredOutputSchema;
}

export function createStructuredOutputConfig(
  config: Partial<StructuredOutputConfig> = {},
): StructuredOutputConfig {
  return {
    type: config.type ?? StructuredOutputType.NONE,
    schema: config.schema,
  }
}
