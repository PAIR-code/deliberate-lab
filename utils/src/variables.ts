/** Variable config for defining variables. */
export type VariableConfig = RandomPermutationVariableConfig;

export interface BaseVariableConfig {
  id: string;
  type: VariableConfigType;
}

export interface RandomPermutationVariableConfig extends BaseVariableConfig {
  type: VariableConfigType.RANDOM_PERMUTATION;
  variableNames: string[];
  variableType: VariableType;
  // Only set schema if variable item type is OBJECT
  variableSchema?: Record<
    string,
    VariableType.STRING | VariableType.NUMBER | VariableType.BOOLEAN
  >;
  // List of values to choose from (this can be any type in string form)
  values: string[];
}

export enum VariableConfigType {
  // For each participant, populate all variables (can be more than one) by
  // randomly selecting one permutation from a set of potential values
  // TODO: Consider cycling through the permutations in order to ensure
  // even distribution?
  RANDOM_PERMUTATION = 'random_permutation',
  // Other eventual config types might include:
  // - MANUAL_COHORT_ASSIGNMENT: Manually specify values for each cohort
  // - RANDOM_NUMBER: Randomly choose number within specified bounds, step
  // - DISTRIBUTION: Assign one of N values based on specified value weights
}

export interface VariableItem {
  name: string;
  description: string;
  type: VariableType;
  // Only set schema if variable item type is OBJECT
  schema?: Record<
    string,
    VariableType.STRING | VariableType.NUMBER | VariableType.BOOLEAN
  >;
}

export enum VariableType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
}
