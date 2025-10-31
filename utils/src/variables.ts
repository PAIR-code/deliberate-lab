import {SeedStrategy} from './utils/random.utils';

/** Experiment Variables - Defines experimental conditions and their values */

// ************************************************************************* //
// Variable Type Definitions
// ************************************************************************* //

export type VariableType = 'string' | 'number' | 'boolean' | 'object';

/** Type for variable values (can be primitives, objects, or arrays) */
export type VariableValue =
  | string
  | number
  | boolean
  | Record<string, unknown>
  | unknown[]
  | null
  | undefined;

/** Schema for object variable properties */
export interface VariablePropertySchema {
  type: 'string' | 'number' | 'boolean';
  description?: string;
}

/** Definition of a single variable */
export interface VariableDefinition {
  type: VariableType;
  description?: string;
  defaultValue?: VariableValue;
  /** For object types, defines the structure of properties */
  schema?: Record<string, VariablePropertySchema>;
}

// ************************************************************************* //
// Variable Assignment
// ************************************************************************* //

/** Method for assigning participants to cohorts */
export type AssignmentMethod = 'distribution' | 'manual';

/** Configuration for probability distribution assignment */
export interface DistributionConfig {
  seedStrategy: SeedStrategy;
  customSeed?: string;
  /** Optional probabilities per cohort (defaults to equal distribution) */
  probabilities?: Record<string, number>;
}

/** Assignment strategy for distributing participants */
export interface AssignmentConfig {
  method: AssignmentMethod;
  /** Configuration for probability distribution assignment */
  distribution?: DistributionConfig;
}

// ************************************************************************* //
// Variable Cohort
// ************************************************************************* //

/** Configuration for a variable cohort */
export interface VariableCohort {
  description?: string;
  /** Mark as initial cohort (max 1 per experiment) */
  isInitialCohort?: boolean;
  /** Variable values for this cohort */
  variables: Record<string, VariableValue>;
  /** Cohort ID (set when cohort is created) */
  cohortId?: string;
}

// ************************************************************************* //
// Main Variables Configuration
// ************************************************************************* //

/** Complete experiment variables configuration */
export interface ExperimentVariables {
  /** Define available variables and their types */
  definitions: Record<string, VariableDefinition>;

  /** Define cohorts and their variable values */
  cohorts: Record<string, VariableCohort>;

  /** Assignment strategy for distributing participants */
  assignment: AssignmentConfig;
}

// ************************************************************************* //
// Helper Functions
// ************************************************************************* //

/** Create a default experiment variables configuration */
export function createExperimentVariables(): ExperimentVariables {
  return {
    definitions: {},
    cohorts: {},
    assignment: {
      method: 'manual',
    },
  };
}

/** Create a variable definition */
export function createVariableDefinition(
  type: VariableType,
  config: Partial<VariableDefinition> = {},
): VariableDefinition {
  return {
    type,
    description: config.description,
    defaultValue: config.defaultValue,
    schema: config.schema,
  };
}

/** Create a variable cohort */
export function createVariableCohort(
  config: Partial<VariableCohort> = {},
): VariableCohort {
  return {
    description: config.description,
    isInitialCohort: config.isInitialCohort ?? false,
    variables: config.variables ?? {},
  };
}

/** Validate that only one cohort is marked as initial */
export function validateInitialCohort(variables: ExperimentVariables): boolean {
  const initialCohorts = Object.values(variables.cohorts).filter(
    (c) => c.isInitialCohort,
  );
  return initialCohorts.length <= 1;
}

/** Get the initial cohort name if one exists */
export function getInitialCohortName(
  variables: ExperimentVariables,
): string | null {
  for (const [name, cohort] of Object.entries(variables.cohorts)) {
    if (cohort.isInitialCohort) {
      return name;
    }
  }
  return null;
}

/** Get cohorts available for assignment (excludes initial cohort) */
export function getAssignableCohorts(variables: ExperimentVariables): string[] {
  return Object.entries(variables.cohorts)
    .filter(([_, cohort]) => !cohort.isInitialCohort)
    .map(([name, _]) => name);
}
