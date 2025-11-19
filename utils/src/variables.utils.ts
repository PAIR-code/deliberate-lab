import {generateId} from './shared';
import {SeedStrategy, choices} from './utils/random.utils';
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
            (instance: VariableInstance) => JSON.parse(instance.value),
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
