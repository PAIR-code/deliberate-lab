import {generateId} from './shared';
import {SeedStrategy, choices, createShuffleConfig} from './utils/random.utils';
import {Type, type TSchema} from '@sinclair/typebox';
import {Value} from '@sinclair/typebox/value';
import {
  RandomPermutationVariableConfig,
  ScopeContext,
  StaticVariableConfig,
  VariableConfig,
  VariableConfigType,
  VariableDefinition,
  VariableInstance,
  VariableScope,
  VariableType,
} from './variables';

/**
 * Extract variable definitions from variable configs.
 * Returns a map of variable name to definition.
 *
 * For RandomPermutation configs with expandListToSeparateVariables:
 * Creates definitions for indexed variables (name_1, name_2, etc.)
 * based on the number of values that will be selected.
 */
export function extractVariablesFromVariableConfigs(
  configs: VariableConfig[],
): Record<string, VariableDefinition> {
  const variableMap: Record<string, VariableDefinition> = {};

  for (const config of configs) {
    switch (config.type) {
      case VariableConfigType.STATIC:
        variableMap[config.definition.name] = config.definition;
        break;
      case VariableConfigType.RANDOM_PERMUTATION:
        // Check if this config will be flattened into indexed variables
        if (config.expandListToSeparateVariables) {
          // Determine how many indexed variables will be created
          const numToSelect = config.numToSelect ?? config.values.length;

          // Extract item schema (the schema for each individual item)
          const itemSchema =
            'items' in config.definition.schema
              ? (config.definition.schema.items as TSchema)
              : config.definition.schema;

          // Create definitions for indexed variables: name_1, name_2, etc.
          for (let i = 1; i <= numToSelect; i++) {
            const indexedName = `${config.definition.name}_${i}`;
            variableMap[indexedName] = {
              name: indexedName,
              description: config.definition.description,
              schema: itemSchema,
            };
          }
        } else {
          // Standard array variable
          variableMap[config.definition.name] = config.definition;
        }
        break;
      default:
        break;
    }
  }

  return variableMap;
}

/**
 * Helper to safely get the value of a VariableInstance.
 * Since values are stored as JSON strings, this parses them.
 */
export function getVariableInstanceValue<T = unknown>(
  instance: VariableInstance,
): T {
  try {
    return JSON.parse(instance.value);
  } catch {
    return instance.value as unknown as T;
  }
}

export function createStaticVariableConfig(
  config: Partial<StaticVariableConfig> = {},
): StaticVariableConfig {
  return {
    id: config.id ?? generateId(),
    type: VariableConfigType.STATIC,
    scope: config.scope ?? VariableScope.EXPERIMENT,
    definition: config.definition ?? {
      name: 'variable',
      description: '',
      schema: VariableType.STRING,
    },
    value: config.value ?? {id: 'default', value: ''},
  };
}

export function mapScopeToSeedStrategy(scope: VariableScope): SeedStrategy {
  switch (scope) {
    case VariableScope.EXPERIMENT:
      return SeedStrategy.EXPERIMENT;
    case VariableScope.COHORT:
      return SeedStrategy.COHORT;
    case VariableScope.PARTICIPANT:
      return SeedStrategy.PARTICIPANT;
    default:
      return SeedStrategy.PARTICIPANT;
  }
}

export function createRandomPermutationVariableConfig(
  config: Partial<RandomPermutationVariableConfig> = {},
): RandomPermutationVariableConfig {
  const scope = config.scope ?? VariableScope.COHORT;

  return {
    id: config.id ?? generateId(),
    type: VariableConfigType.RANDOM_PERMUTATION,
    scope,
    definition: config.definition ?? {
      name: 'variable',
      description: '',
      // Schema describes the OUTPUT type (array of items)
      schema: VariableType.array(VariableType.STRING),
    },
    shuffleConfig: createShuffleConfig({
      shuffle: true,
      seed: mapScopeToSeedStrategy(scope),
      ...config.shuffleConfig,
    }),
    values: config.values ?? [],
    numToSelect: config.numToSelect,
    expandListToSeparateVariables: config.expandListToSeparateVariables ?? true,
  };
}

/**
 * Helper to generate value for RandomPermutationVariableConfig
 */
function generateRandomPermutationValue(
  config: RandomPermutationVariableConfig,
  context: ScopeContext,
): unknown {
  const {shuffle, seed: seedStrategy, customSeed} = config.shuffleConfig;
  const numToSelect = config.numToSelect ?? config.values.length;

  let selectedInstances: VariableInstance[];

  if (shuffle) {
    let seedValue = '';
    switch (seedStrategy) {
      case SeedStrategy.EXPERIMENT:
        seedValue = context.experimentId;
        break;
      case SeedStrategy.COHORT:
        if ('cohortId' in context) {
          seedValue = context.cohortId;
        }
        break;
      case SeedStrategy.PARTICIPANT:
        if ('participantId' in context) {
          seedValue = context.participantId;
        }
        break;
      case SeedStrategy.CUSTOM:
        seedValue = customSeed;
        break;
    }

    // seed() is called inside choices() if a seed value is provided
    selectedInstances = choices(config.values, numToSelect, seedValue);
  } else {
    selectedInstances = config.values.slice(0, numToSelect);
  }

  // Parse instance values and build array
  return selectedInstances.map((instance: VariableInstance) =>
    getVariableInstanceValue(instance),
  );
}

/**
 * Generate variables for a Static config.
 * Returns a map of variable name to JSON string value.
 */
function generateStaticVariables(
  config: StaticVariableConfig,
): Record<string, string> {
  const value = getVariableInstanceValue(config.value);

  // Validate against schema
  validateParsedVariableValue(
    config.definition.schema,
    value,
    config.definition.name,
  );

  return {
    [config.definition.name]: JSON.stringify(value),
  };
}

/**
 * Generate variables for a Random Permutation config.
 * Returns a map of variable name(s) to JSON string value(s).
 * May return multiple variables if expandListToSeparateVariables is true.
 */
function generateRandomPermutationVariables(
  config: RandomPermutationVariableConfig,
  context: ScopeContext,
): Record<string, string> {
  const value = generateRandomPermutationValue(config, context);
  const variables: Record<string, string> = {};

  // Check if we should flatten the array into indexed variables
  if (config.expandListToSeparateVariables && Array.isArray(value)) {
    // Extract item schema for validation
    const itemSchema =
      'items' in config.definition.schema
        ? (config.definition.schema.items as TSchema)
        : config.definition.schema;

    // Create indexed variables: name_1, name_2, etc.
    value.forEach((item, index) => {
      const indexedName = `${config.definition.name}_${index + 1}`;
      validateParsedVariableValue(itemSchema, item, indexedName);
      variables[indexedName] = JSON.stringify(item);
    });
  } else {
    // Standard single array variable
    validateParsedVariableValue(
      config.definition.schema,
      value,
      config.definition.name,
    );
    variables[config.definition.name] = JSON.stringify(value);
  }

  return variables;
}

/**
 * Given variable configs, generate variable-to-value mappings
 * for a specific scope (Experiment, Cohort, or Participant).
 *
 * - Static variables: Included if their scope matches the requested scope.
 * - Random permutation: Included if their scope matches the requested scope.
 *
 * @param variableConfigs List of configs to process
 * @param context The scope context (scope + IDs)
 */
export function generateVariablesForScope(
  variableConfigs: VariableConfig[],
  context: ScopeContext,
): Record<string, string> {
  const variableToValueMap: Record<string, string> = {};

  // Filter configs by scope first
  const scopedConfigs = variableConfigs.filter(
    (c) => c.scope === context.scope,
  );

  for (const config of scopedConfigs) {
    let generatedVariables: Record<string, string> = {};

    switch (config.type) {
      case VariableConfigType.STATIC:
        generatedVariables = generateStaticVariables(config);
        break;
      case VariableConfigType.RANDOM_PERMUTATION:
        generatedVariables = generateRandomPermutationVariables(
          config,
          context,
        );
        break;
      default:
        // Unknown config type - skip
        break;
    }

    // Merge generated variables into the result map
    Object.assign(variableToValueMap, generatedVariables);
  }

  return variableToValueMap;
}

/**
 * Navigate a TypeBox schema using a dot-separated path.
 * Handles object properties and array items (via numeric indices).
 *
 * Example paths:
 * - "user.name" (Object property)
 * - "users.0.name" (Array item property)
 *
 * @param rootSchema The starting TypeBox schema
 * @param path Dot-separated path string
 * @returns The schema at the path, or undefined if not found/invalid
 */
export function getSchemaAtPath(
  rootSchema: TSchema,
  path: string,
): TSchema | undefined {
  if (!path) return rootSchema;

  const parts = path.split('.');
  let currentSchema = rootSchema;

  for (const part of parts) {
    // 1. Handle Array Items (Numeric Index)
    // If the path part is a number, we expect to traverse into an array's 'items' schema.
    if (/^\d+$/.test(part)) {
      if (
        currentSchema.type === 'array' &&
        'items' in currentSchema &&
        currentSchema.items
      ) {
        currentSchema = currentSchema.items as TSchema;
        continue;
      }
      // Numeric index provided but schema is not an array or has no items
      return undefined;
    }

    // 2. Handle Object Properties
    if (currentSchema.type === 'object') {
      const properties =
        'properties' in currentSchema
          ? (currentSchema.properties as Record<string, TSchema>)
          : undefined;

      if (properties && part in properties) {
        currentSchema = properties[part];
        continue;
      }
    }

    // Path part did not match array index or object property
    return undefined;
  }

  return currentSchema;
}

/**
 * Parse a string value based on the expected schema type.
 * Handles primitives and complex JSON types.
 */
export function parseVariableValue(schema: TSchema, value: string): unknown {
  const type = schema.type as string;
  if (type === 'string') return value;
  if (type === 'number') return value === '' ? 0 : Number(value);
  if (type === 'boolean') return value === 'true';
  return value === '' ? null : JSON.parse(value);
}

/**
 * Reconstructs a TypeBox schema from a plain JSON schema object.
 *
 * TypeBox schemas have internal metadata that is lost during JSON serialization to Firestore.
 * This function reconstructs proper TypeBox schemas using the official Type.* API.
 */
function reconstructSchema(schema: TSchema): TSchema {
  // If already a proper TypeBox schema (has metadata), return as-is
  if (Symbol.for('TypeBox.Kind') in schema) {
    return schema;
  }

  // Otherwise, reconstruct from plain object

  // 1. Handle Objects
  if (schema.type === 'object' && schema.properties) {
    const properties: Record<string, TSchema> = {};

    for (const [key, value] of Object.entries(
      schema.properties as Record<string, TSchema>,
    )) {
      properties[key] = reconstructSchema(value);
    }
    // Pass original schema to preserve options like 'additionalProperties'
    return Type.Object(properties, schema);
  }

  // 2. Handle Arrays
  if (schema.type === 'array' && schema.items) {
    return Type.Array(reconstructSchema(schema.items as TSchema), schema);
  }

  // 3. Handle Primitives
  if (schema.type === 'string') return Type.String(schema);
  if (schema.type === 'number') return Type.Number(schema);
  if (schema.type === 'integer') return Type.Integer(schema);
  if (schema.type === 'boolean') return Type.Boolean(schema);
  if (schema.type === 'null') return Type.Null(schema);

  // Fallback: return as-is for unknown types
  return schema;
}

/**
 * Validate a parsed value against a schema.
 * Returns error message string if invalid, or null if valid.
 * Always logs a warning on validation failure.
 */
export function validateParsedVariableValue(
  schema: TSchema,
  value: unknown,
  variableName?: string,
): string | null {
  // Reconstruct schema if it was deserialized from Firestore
  const validSchema = reconstructSchema(schema);

  if (value !== null && !Value.Check(validSchema, value)) {
    const errors = [...Value.Errors(validSchema, value)];
    const errorMsg = errors.map((e) => `${e.path}: ${e.message}`).join(', ');

    const nameLog = variableName ? `Variable "${variableName}"` : 'Variable';
    console.warn(`${nameLog} value does not match its schema definition.`, {
      error: errorMsg,
      value,
      schema,
    });
    return errorMsg;
  }
  return null;
}

/**
 * Validate a string value against a schema.
 * Returns error message string if invalid, or null if valid.
 */
export function validateVariableValue(
  schema: TSchema,
  value: string,
): string | null {
  try {
    const parsed = parseVariableValue(schema, value);
    return validateParsedVariableValue(schema, parsed);
  } catch (e) {
    return `Invalid: ${e}`;
  }
}
