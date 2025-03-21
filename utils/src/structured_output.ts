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
  properties?: {name: string, schema: StructuredOutputSchema}[];
  arrayItems?: StructuredOutputSchema;
}

export interface StructuredOutputConfig {
  type: StructuredOutputType;
  schema?: StructuredOutputSchema;
  appendToPrompt: boolean;
}

export function createStructuredOutputConfig(
  config: Partial<StructuredOutputConfig> = {},
): StructuredOutputConfig {
  return {
    type: config.type ?? StructuredOutputType.NONE,
    schema: config.schema,
    appendToPrompt: true,
  }
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
  const arrayItems = (schema.arrayItems
                      ? schemaToObject(schema.arrayItems)
                      : undefined);
  return {
    description: schema.description ?? undefined,
    type: schema.type.toLowerCase(),
    properties: properties ?? undefined,
    items: arrayItems ?? undefined,
  }
}

export function printSchema(
  schema: StructuredOutputSchema,
  indent: number = 2): string {
    return JSON.stringify(schemaToObject(schema), null, indent);
}

export function makeStructuredOutputPrompt(config?: StructuredOutputConfig): string {
  if (!config?.appendToPrompt) {
    return '';
  }
  if (!config.schema) {
    return '';
  }
  if (config.schema.properties?.length == 0) {
    return '';
  }
  return `Return only valid JSON, according to the following schema:
${printSchema(config.schema)}
`;
}
