import {Type, type Static} from '@sinclair/typebox';
import {SeedStrategy} from './utils/random.utils';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ************************************************************************* //
// Variable Value Schema
// ************************************************************************* //

/** TypeBox schema for VariableValue type */
export const VariableValueData = Type.Union([
  Type.String(),
  Type.Number(),
  Type.Boolean(),
  Type.Record(Type.String(), Type.Unknown()),
  Type.Array(Type.Unknown()),
  Type.Null(),
  Type.Undefined(),
]);

// ************************************************************************* //
// Variable Definition Schema
// ************************************************************************* //

const VariablePropertySchemaData = Type.Object(
  {
    type: Type.Union([
      Type.Literal('string'),
      Type.Literal('number'),
      Type.Literal('boolean'),
    ]),
    description: Type.Optional(Type.String()),
  },
  strict,
);

const VariableDefinitionData = Type.Object(
  {
    type: Type.Union([
      Type.Literal('string'),
      Type.Literal('number'),
      Type.Literal('boolean'),
      Type.Literal('object'),
    ]),
    description: Type.Optional(Type.String()),
    defaultValue: Type.Optional(VariableValueData),
    schema: Type.Optional(
      Type.Record(Type.String(), VariablePropertySchemaData),
    ),
  },
  strict,
);

// ************************************************************************* //
// Variable Cohort Schema
// ************************************************************************* //

const VariableCohortData = Type.Object(
  {
    description: Type.Optional(Type.String()),
    isInitialCohort: Type.Optional(Type.Boolean()),
    variables: Type.Record(Type.String(), VariableValueData),
  },
  strict,
);

// ************************************************************************* //
// Assignment Configuration Schema
// ************************************************************************* //

const DistributionConfigData = Type.Object(
  {
    seedStrategy: Type.Union([
      Type.Literal(SeedStrategy.EXPERIMENT),
      Type.Literal(SeedStrategy.COHORT),
      Type.Literal(SeedStrategy.PARTICIPANT),
      Type.Literal(SeedStrategy.CUSTOM),
    ]),
    customSeed: Type.Optional(Type.String()),
    probabilities: Type.Optional(Type.Record(Type.String(), Type.Number())),
  },
  strict,
);

const AssignmentConfigData = Type.Object(
  {
    method: Type.Union([Type.Literal('distribution'), Type.Literal('manual')]),
    distribution: Type.Optional(DistributionConfigData),
  },
  strict,
);

// ************************************************************************* //
// Main Experiment Variables Schema
// ************************************************************************* //

export const ExperimentVariablesData = Type.Object(
  {
    definitions: Type.Record(Type.String(), VariableDefinitionData),
    cohorts: Type.Record(Type.String(), VariableCohortData),
    assignment: AssignmentConfigData,
  },
  strict,
);

export type ExperimentVariablesData = Static<typeof ExperimentVariablesData>;

// ************************************************************************* //
// initializeVariableCohorts endpoint
// ************************************************************************* //

export const InitializeVariableCohortsData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    variables: ExperimentVariablesData,
    // Whether to delete existing cohorts before creating new ones
    replaceExisting: Type.Optional(Type.Boolean()),
  },
  strict,
);

export type InitializeVariableCohortsData = Static<
  typeof InitializeVariableCohortsData
>;

// ************************************************************************* //
// getParticipantVariables endpoint
// ************************************************************************* //

export const GetParticipantVariablesData = Type.Object(
  {
    experimentId: Type.String({minLength: 1}),
    participantId: Type.String({minLength: 1}),
  },
  strict,
);

export type GetParticipantVariablesData = Static<
  typeof GetParticipantVariablesData
>;
