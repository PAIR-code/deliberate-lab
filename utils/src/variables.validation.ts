import {Type, type TSchema} from '@sinclair/typebox';
import {SeedStrategy} from './utils/random.utils';
import {
  BalanceAcross,
  BalanceStrategy,
  VariableConfigType,
  VariableScope,
} from './variables';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

/** JSON Schema validation - recursive schema for validating TypeBox schemas */
const JSONSchemaData: TSchema = Type.Recursive(
  (Self) =>
    Type.Union([
      // Primitive types
      Type.Object({type: Type.Literal('string')}, {additionalProperties: true}),
      Type.Object({type: Type.Literal('number')}, {additionalProperties: true}),
      Type.Object(
        {type: Type.Literal('integer')},
        {additionalProperties: true},
      ),
      Type.Object(
        {type: Type.Literal('boolean')},
        {additionalProperties: true},
      ),

      // Complex types
      Type.Object(
        {
          type: Type.Literal('object'),
          properties: Type.Optional(Type.Record(Type.String(), Self)),
        },
        {additionalProperties: true},
      ),

      Type.Object(
        {
          type: Type.Literal('array'),
          items: Type.Optional(Self),
        },
        {additionalProperties: true},
      ),
    ]),
  {$id: 'JSONSchemaDefinition'},
);

/** VariableDefinition. */
export const VariableDefinitionData = Type.Object(
  {
    name: Type.String({minLength: 1}),
    description: Type.String(),
    schema: JSONSchemaData,
  },
  {$id: 'VariableDefinition', ...strict},
);

/** BaseVariableConfig. */
export const BaseVariableConfigData = Type.Object({
  id: Type.String({minLength: 1}),
  type: Type.Union([
    Type.Literal(VariableConfigType.STATIC),
    Type.Literal(VariableConfigType.RANDOM_PERMUTATION),
    Type.Literal(VariableConfigType.BALANCED_ASSIGNMENT),
  ]),
  scope: Type.Union([
    Type.Literal(VariableScope.EXPERIMENT),
    Type.Literal(VariableScope.COHORT),
    Type.Literal(VariableScope.PARTICIPANT),
  ]),
  definition: VariableDefinitionData,
});

/** ShuffleConfig. */
export const ShuffleConfigData = Type.Object(
  {
    shuffle: Type.Boolean(),
    seed: Type.Union([
      Type.Literal(SeedStrategy.EXPERIMENT),
      Type.Literal(SeedStrategy.COHORT),
      Type.Literal(SeedStrategy.PARTICIPANT),
      Type.Literal(SeedStrategy.CUSTOM),
    ]),
    customSeed: Type.String(),
  },
  strict,
);

/** StaticVariableConfig. */
export const StaticVariableConfigData = Type.Composite(
  [
    BaseVariableConfigData,
    Type.Object(
      {
        type: Type.Literal(VariableConfigType.STATIC, {
          default: VariableConfigType.STATIC,
        }),
        value: Type.String(),
      },
      strict,
    ),
  ],
  {$id: 'StaticVariableConfig'},
);

/** RandomPermutationVariableConfig. */
export const RandomPermutationVariableConfigData = Type.Composite(
  [
    BaseVariableConfigData,
    Type.Object(
      {
        type: Type.Literal(VariableConfigType.RANDOM_PERMUTATION, {
          default: VariableConfigType.RANDOM_PERMUTATION,
        }),
        shuffleConfig: ShuffleConfigData,
        values: Type.Array(Type.String()),
        numToSelect: Type.Optional(Type.Number({minimum: 1})),
        expandListToSeparateVariables: Type.Optional(Type.Boolean()),
      },
      strict,
    ),
  ],
  {$id: 'RandomPermutationVariableConfig'},
);

/** BalancedAssignmentVariableConfig. */
export const BalancedAssignmentVariableConfigData = Type.Composite(
  [
    BaseVariableConfigData,
    Type.Object(
      {
        type: Type.Literal(VariableConfigType.BALANCED_ASSIGNMENT, {
          default: VariableConfigType.BALANCED_ASSIGNMENT,
        }),
        values: Type.Array(Type.String()),
        weights: Type.Optional(Type.Array(Type.Number({minimum: 1}))),
        balanceStrategy: Type.Union([
          Type.Literal(BalanceStrategy.ROUND_ROBIN),
          Type.Literal(BalanceStrategy.RANDOM),
        ]),
        balanceAcross: Type.Union([
          Type.Literal(BalanceAcross.EXPERIMENT),
          Type.Literal(BalanceAcross.COHORT),
        ]),
      },
      strict,
    ),
  ],
  {$id: 'BalancedAssignmentVariableConfig'},
);

/** VariableConfig. */
export const VariableConfigData = Type.Union([
  StaticVariableConfigData,
  RandomPermutationVariableConfigData,
  BalancedAssignmentVariableConfigData,
]);
