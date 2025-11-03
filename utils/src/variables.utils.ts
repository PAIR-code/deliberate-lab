import {generateId} from './shared';
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
            type: config.variableType,
            schema: config.variableSchema,
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
    variableNames: config.variableNames ?? [],
    variableType: config.variableType ?? VariableType.STRING,
    variableSchema: config.variableSchema ?? undefined,
    values: config.values ?? [],
  };
}
