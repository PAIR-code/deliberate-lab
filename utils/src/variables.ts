import {Type, type TSchema} from '@sinclair/typebox';
import {SeedStrategy} from './utils/random.utils';

/** Variable config for defining variables. */
export type VariableConfig = RandomPermutationVariableConfig;

export interface BaseVariableConfig {
  id: string;
  type: VariableConfigType;
}

export interface RandomPermutationVariableConfig extends BaseVariableConfig {
  type: VariableConfigType.RANDOM_PERMUTATION;
  seedStrategy: SeedStrategy;
  variableNames: string[];
  // JSON Schema (TypeBox) describing the structure of variable values
  schema: TSchema;
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

/** TypeBox schema helpers for variable types */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace VariableType {
  // Primitive types
  export const STRING = Type.String();
  export const NUMBER = Type.Number();
  export const BOOLEAN = Type.Boolean();

  // Complex type builders
  export const object = (properties: Record<string, TSchema>) =>
    Type.Object(properties);

  export const array = (items: TSchema) => Type.Array(items);
}

export interface VariableItem {
  name: string;
  description: string;
  // JSON Schema (TypeBox) describing the structure
  schema: TSchema;
}
