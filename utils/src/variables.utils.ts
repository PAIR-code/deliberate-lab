import {generateId} from './shared';
import {SeedStrategy, choices} from './utils/random.utils';
import {
  RandomPermutationVariableConfig,
  VariableConfig,
  VariableConfigType,
  VariableItem,
  VariableType,
} from './variables';

export function extractVariablesFromVariableConfigs(
  configs: VariableConfig[],
): Record<string, VariableItem> {
  const variableMap: Record<string, VariableItem> = {};

  for (const config of configs) {
    switch (config.type) {
      case VariableConfigType.RANDOM_PERMUTATION:
        config.variableNames.forEach((name) => {
          variableMap[name] = {
            name,
            description: '',
            schema: config.schema,
          };
        });
        break;
      default:
        break;
    }
  }

  return variableMap;
}

export function createRandomPermutationVariableConfig(
  config: Partial<RandomPermutationVariableConfig> = {},
) {
  return {
    id: config.id ?? generateId(),
    type: VariableConfigType.RANDOM_PERMUTATION,
    seedStrategy: config.seedStrategy ?? SeedStrategy.COHORT,
    variableNames: config.variableNames ?? [],
    schema: config.schema ?? VariableType.STRING,
    values: config.values ?? [],
  };
}

/** Given variable configs, extract variables and generate values
 * if the variable config seed strategy matches the given seed strategy
 * (e.g., generate a variable-to-value map for 'experiment' seed that
 * will then be stored at the experiment level).
 */
export function createVariableToValueMapForSeed(
  variableConfigs: VariableConfig[],
  seedStrategy: SeedStrategy,
) {
  const variableToValueMap: Record<string, string> = {};

  for (const config of variableConfigs) {
    switch (config.type) {
      case VariableConfigType.RANDOM_PERMUTATION:
        if (config.seedStrategy === seedStrategy) {
          const numVariables = config.variableNames.length;
          // TODO: Use seed to ensure consistent results?
          const chosenValues = choices(config.values, numVariables);
          for (let index = 0; index < numVariables; index++) {
            variableToValueMap[config.variableNames[index]] =
              chosenValues[index];
          }
        }
        break;
      default:
        break;
    }
  }

  return variableToValueMap;
}
