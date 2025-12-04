import {Type, type TSchema} from '@sinclair/typebox';
import {ShuffleConfig} from './utils/random.utils';

/** Variable config for defining variables. */
export type VariableConfig =
  | StaticVariableConfig
  | RandomPermutationVariableConfig
  | BalancedAssignmentVariableConfig;

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
  /** Assigns a single fixed value to all participants/cohorts */
  STATIC = 'static',
  /** Randomly selects and shuffles N values from the pool into separate variables */
  RANDOM_PERMUTATION = 'random_permutation',
  /** Assigns one value from a pool to each participant with balanced distribution */
  BALANCED_ASSIGNMENT = 'balanced_assignment',
}

/** Returns a human-readable description of a variable config type */
export function getVariableConfigTypeDescription(
  type: VariableConfigType,
): string {
  switch (type) {
    case VariableConfigType.STATIC:
      return 'Assigns a single fixed value to all participants/cohorts';
    case VariableConfigType.RANDOM_PERMUTATION:
      return 'Randomly selects and shuffles N values from the pool into separate variables';
    case VariableConfigType.BALANCED_ASSIGNMENT:
      return 'Assigns one value from a pool to each participant';
  }
}

/**
 * Strategy for balancing assignments across participants.
 */
export enum BalanceStrategy {
  /** Assign to value used by fewest participants (query-based) */
  LEAST_USED = 'least_used',
  /** Cycle through values based on participant count (deterministic) */
  ROUND_ROBIN = 'round_robin',
  /** Random selection without balancing (seeded by participant ID) */
  RANDOM = 'random',
}

/**
 * Scope for balancing: across entire experiment or per-cohort.
 */
export enum BalanceAcross {
  /** Balance across all participants in the experiment */
  EXPERIMENT = 'experiment',
  /** Balance within each cohort independently */
  COHORT = 'cohort',
}

/**
 * Balanced assignment variable config.
 * Assigns one value from a pool to each participant with balanced distribution.
 * Always PARTICIPANT-scoped since it assigns per-participant.
 */
export interface BalancedAssignmentVariableConfig extends BaseVariableConfig {
  type: VariableConfigType.BALANCED_ASSIGNMENT;
  values: string[]; // Pool of JSON string values to assign from
  balanceStrategy: BalanceStrategy;
  balanceAcross: BalanceAcross;
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
