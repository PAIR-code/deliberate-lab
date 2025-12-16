import Ajv from 'ajv';
import {generateId} from './shared';
import {SeedStrategy, choices, createShuffleConfig} from './utils/random.utils';
import {type TSchema} from '@sinclair/typebox';
import {
  BalancedAssignmentVariableConfig,
  BalanceAcross,
  BalanceStrategy,
  MultiValueVariableConfigType,
  RandomPermutationVariableConfig,
  ScopeContext,
  StaticVariableConfig,
  VariableConfig,
  VariableConfigType,
  VariableDefinition,
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
  const variableDefinitions: Record<string, VariableDefinition> = {};

  for (const config of configs) {
    switch (config.type) {
      case VariableConfigType.STATIC:
        variableDefinitions[config.definition.name] = config.definition;
        break;
      case VariableConfigType.RANDOM_PERMUTATION:
        // Check if this config will be flattened into indexed variables
        if (config.expandListToSeparateVariables) {
          // Determine how many indexed variables will be created
          const numToSelect = config.numToSelect ?? config.values.length;

          // Extract item schema (the schema for each individual item)
          const itemSchema = getItemSchemaIfArray(config.definition.schema);

          // Create definitions for indexed variables: name_1, name_2, etc.
          for (let i = 1; i <= numToSelect; i++) {
            const indexedName = `${config.definition.name}_${i}`;
            variableDefinitions[indexedName] = {
              name: indexedName,
              description: config.definition.description,
              schema: itemSchema,
            };
          }
        } else {
          // Standard array variable
          variableDefinitions[config.definition.name] = config.definition;
        }
        break;
      case VariableConfigType.BALANCED_ASSIGNMENT:
        // Balanced assignment produces a single variable with one value from the pool
        // Schema is stored as Array(ItemType), so extract the item schema
        variableDefinitions[config.definition.name] = {
          name: config.definition.name,
          description: config.definition.description,
          schema: getItemSchemaIfArray(config.definition.schema),
        };
        break;
      default:
        break;
    }
  }

  return variableDefinitions;
}

/**
 * Helper to safely parse a JSON string value.
 * Returns the parsed value, or the original string if parsing fails.
 */
export function parseJsonValue<T = unknown>(jsonString: string): T {
  try {
    return JSON.parse(jsonString);
  } catch {
    return jsonString as unknown as T;
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
    value: config.value ?? '',
  };
}

/**
 * Type guard that returns true if the config has multiple values to choose from.
 * Multi-value configs have a `values: string[]` array representing a pool of items.
 *
 * This affects the schema editor behavior:
 * - Schema editor: skips showing array type at root, shows item type directly
 * - Schema/value updates: navigates into array items automatically
 *
 * When passed a VariableConfig, narrows the type to MultiValueVariableConfigType.
 * When passed a VariableConfigType, returns a boolean.
 */
export function isMultiValueConfig(
  config: VariableConfig,
): config is MultiValueVariableConfigType;
export function isMultiValueConfig(configType: VariableConfigType): boolean;
export function isMultiValueConfig(
  configOrType: VariableConfig | VariableConfigType,
): boolean {
  const configType =
    typeof configOrType === 'string' ? configOrType : configOrType.type;
  return (
    configType === VariableConfigType.RANDOM_PERMUTATION ||
    configType === VariableConfigType.BALANCED_ASSIGNMENT
  );
}

/**
 * Extracts the item schema from an array schema, or returns the schema as-is.
 * Used for multi-value configs where the schema is Array(ItemType) but we need the item type.
 */
export function getItemSchemaIfArray(schema: TSchema): TSchema {
  if ('items' in schema && schema.items) {
    return schema.items as TSchema;
  }
  return schema;
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
 * Create a balanced assignment variable config.
 * Always PARTICIPANT-scoped since it assigns per-participant.
 * Schema is stored as Array(ItemType) from the UI; ItemType directly is also handled.
 * Each value in values[] is a single item (the type assigned to each participant).
 *
 * If weights are provided, they must match the length of values.
 * If weights are omitted, equal weights are assumed.
 */
export function createBalancedAssignmentVariableConfig(
  config: Partial<BalancedAssignmentVariableConfig> = {},
): BalancedAssignmentVariableConfig {
  return {
    id: config.id ?? generateId(),
    type: VariableConfigType.BALANCED_ASSIGNMENT,
    // Always participant-scoped
    scope: VariableScope.PARTICIPANT,
    definition: config.definition ?? {
      name: 'condition',
      description: 'Assigned experimental condition',
      // Schema describes the pool as array of items
      schema: VariableType.array(VariableType.STRING),
    },
    values: config.values ?? [],
    weights: config.weights, // undefined means equal weights
    balanceStrategy: config.balanceStrategy ?? BalanceStrategy.ROUND_ROBIN,
    balanceAcross: config.balanceAcross ?? BalanceAcross.EXPERIMENT,
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
  const maxAvailable = config.values.length;
  const requestedNum = config.numToSelect ?? maxAvailable;

  // Clamp numToSelect to valid range [1, maxAvailable]
  const numToSelect = Math.max(1, Math.min(requestedNum, maxAvailable));
  if (numToSelect !== requestedNum) {
    console.warn(
      `Variable "${config.definition.name}": numToSelect (${requestedNum}) out of range [1, ${maxAvailable}], using ${numToSelect}`,
    );
  }

  let selectedValues: string[];

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
    selectedValues = choices(config.values, numToSelect, seedValue);
  } else {
    selectedValues = config.values.slice(0, numToSelect);
  }

  // Parse JSON string values and build array
  return selectedValues.map((jsonString: string) => parseJsonValue(jsonString));
}

/**
 * Generate variables for a Static config.
 * Returns a map of variable name to JSON string value.
 */
export function generateStaticVariables(
  config: StaticVariableConfig,
): Record<string, string> {
  const value = parseJsonValue(config.value);

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
export function generateRandomPermutationVariables(
  config: RandomPermutationVariableConfig,
  context: ScopeContext,
): Record<string, string> {
  const value = generateRandomPermutationValue(config, context);
  const variables: Record<string, string> = {};

  // Check if we should flatten the array into indexed variables
  if (config.expandListToSeparateVariables && Array.isArray(value)) {
    // Extract item schema for validation
    const itemSchema = getItemSchemaIfArray(config.definition.schema);

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

// Ajv instance for JSON Schema validation
// Works directly with plain JSON Schema objects (no TypeBox symbol reconstruction needed)
const ajv = new Ajv();

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
  if (value === null) {
    return null;
  }

  const valid = ajv.validate(schema, value);
  if (!valid && ajv.errors) {
    const errorMsg = ajv.errors
      .map((e) => `${e.instancePath || '/'}: ${e.message}`)
      .join(', ');

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

/**
 * Sanitize a variable or property name by removing invalid characters.
 *
 * Valid names can only contain:
 * - Letters (a-z, A-Z)
 * - Numbers (0-9)
 * - Underscores (_)
 *
 * This prevents conflicts with Mustache template syntax where:
 * - Dots (.) are used for path access: {{obj.field}}
 * - Dashes (-) can cause parsing issues
 * - Spaces and special characters break template parsing
 *
 * If the result starts with a number, prepends an underscore.
 */
export function sanitizeVariableName(name: string): string {
  // Remove all characters except letters, numbers, and underscores
  let sanitized = name.replace(/[^a-zA-Z0-9_]/g, '');

  // If it starts with a number, prepend an underscore
  if (/^\d/.test(sanitized)) {
    sanitized = '_' + sanitized;
  }

  return sanitized;
}
