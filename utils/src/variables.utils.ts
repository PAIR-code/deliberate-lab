import {generateId} from './shared';
import {SeedStrategy, choices} from './utils/random.utils';
import {type TSchema} from '@sinclair/typebox';
import {
  RandomPermutationVariableConfig,
  StaticVariableConfig,
  VariableConfig,
  VariableConfigType,
  VariableDefinition,
  VariableInstance,
  VariableType,
} from './variables';

/**
 * Extract variable definitions from variable configs.
 * Returns a map of variable name to definition.
 */
export function extractVariablesFromVariableConfigs(
  configs: VariableConfig[],
): Record<string, VariableDefinition> {
  const variableMap: Record<string, VariableDefinition> = {};

  for (const config of configs) {
    switch (config.type) {
      case VariableConfigType.STATIC:
      case VariableConfigType.RANDOM_PERMUTATION:
        variableMap[config.definition.name] = config.definition;
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
    definition: config.definition ?? {
      name: 'variable',
      description: '',
      schema: VariableType.STRING,
    },
    value: config.value ?? {id: 'default', value: ''},
  };
}

export function createRandomPermutationVariableConfig(
  config: Partial<RandomPermutationVariableConfig> = {},
): RandomPermutationVariableConfig {
  return {
    id: config.id ?? generateId(),
    type: VariableConfigType.RANDOM_PERMUTATION,
    definition: config.definition ?? {
      name: 'variable',
      description: '',
      schema: VariableType.array(VariableType.STRING),
    },
    seedStrategy: config.seedStrategy ?? SeedStrategy.COHORT,
    values: config.values ?? [],
    numToSelect: config.numToSelect,
  };
}

/**
 * Given variable configs, generate variable-to-value mappings
 * if the variable config seed strategy matches the given seed strategy.
 *
 * For static:
 * - Returns the value as-is for all seed strategies
 *
 * For random permutation:
 * - Selects numToSelect instances (or all if not specified)
 * - Builds an array from the selected instance values
 * - Returns map of variable name → JSON array string
 */
export function createVariableToValueMapForSeed(
  variableConfigs: VariableConfig[],
  seedStrategy: SeedStrategy,
): Record<string, string> {
  const variableToValueMap: Record<string, string> = {};

  for (const config of variableConfigs) {
    switch (config.type) {
      case VariableConfigType.STATIC:
        // Static values apply to all seed strategies
        variableToValueMap[config.definition.name] = config.value.value;
        break;
      case VariableConfigType.RANDOM_PERMUTATION:
        if (config.seedStrategy === seedStrategy) {
          const numToSelect = config.numToSelect ?? config.values.length;

          // TODO: Use seed to ensure consistent results?
          const selectedInstances = choices(config.values, numToSelect);

          // Parse instance values and build array
          const selectedValues = selectedInstances.map(
            (instance: VariableInstance) => getVariableInstanceValue(instance),
          );

          // Store as JSON array string
          variableToValueMap[config.definition.name] =
            JSON.stringify(selectedValues);
        }
        break;
      default:
        break;
    }
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
