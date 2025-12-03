import {Type, type TSchema} from '@sinclair/typebox';
import {ShuffleConfig} from './utils/random.utils';

/** Variable config for defining variables. */
export type VariableConfig =
  | StaticVariableConfig
  | RandomPermutationVariableConfig;

export enum VariableScope {
  EXPERIMENT = 'experiment',
  COHORT = 'cohort',
  PARTICIPANT = 'participant',
}

export type ScopeContext =
  | {scope: VariableScope.EXPERIMENT; experimentId: string}
  | {scope: VariableScope.COHORT; experimentId: string; cohortId: string}
  | {
      scope: VariableScope.PARTICIPANT;
      experimentId: string;
      cohortId: string;
      participantId: string;
    };

/**
 * Defines the structure and metadata for a variable.
 * This describes what the variable is and how it's used in templates.
 */
export interface VariableDefinition {
  name: string; // Variable name used in templates (e.g., "charities")
  description: string;
  schema: TSchema; // JSON Schema (TypeBox) describing the structure
}

export interface BaseVariableConfig {
  id: string;
  type: VariableConfigType;
  scope: VariableScope;
  definition: VariableDefinition;
}

/**
 * Static variable config.
 * Assigns a single fixed value to all participants/cohorts.
 * Value is used as-is without array wrapping.
 */
export interface StaticVariableConfig extends BaseVariableConfig {
  type: VariableConfigType.STATIC;
  value: string; // JSON string of the value
}

/**
 * Random permutation variable config.
 * Randomly selects N values from a pool and assigns them to a single variable.
 * If numToSelect is not provided, all values are selected and shuffled.
 */
export interface RandomPermutationVariableConfig extends BaseVariableConfig {
  type: VariableConfigType.RANDOM_PERMUTATION;
  shuffleConfig: ShuffleConfig;
  values: string[]; // Pool of JSON string values to select from
  numToSelect?: number; // How many to select (if omitted, selects all and shuffles)
  expandListToSeparateVariables?: boolean; // If true, creates name_1, name_2, etc. instead of single array
}

export enum VariableConfigType {
  // Assigns a single static value to all participants/cohorts
  STATIC = 'static',
  // Randomly selects N values from a pool and assigns to a single variable (often an array)
  // If numToSelect is omitted, all values are selected and shuffled
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
