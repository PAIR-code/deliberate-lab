import {Type, type TSchema} from '@sinclair/typebox';
import {SeedStrategy} from './utils/random.utils';
import {VariableConfigType} from './variables';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

/** JSON Schema validation - recursive schema for validating TypeBox schemas */
const JSONSchemaData: TSchema = Type.Recursive((Self) =>
  Type.Union([
    // Primitive types
    Type.Object({type: Type.Literal('string')}, {additionalProperties: true}),
    Type.Object({type: Type.Literal('number')}, {additionalProperties: true}),
    Type.Object({type: Type.Literal('integer')}, {additionalProperties: true}),
    Type.Object({type: Type.Literal('boolean')}, {additionalProperties: true}),

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
);

/** RandomPermutationVariableConfig. */
export const RandomPermutationVariableConfigData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    type: Type.Literal(VariableConfigType.RANDOM_PERMUTATION),
    seedStrategy: Type.Union([
      Type.Literal(SeedStrategy.EXPERIMENT),
      Type.Literal(SeedStrategy.COHORT),
      Type.Literal(SeedStrategy.PARTICIPANT),
      Type.Literal(SeedStrategy.CUSTOM),
    ]),
    variableNames: Type.Array(Type.String()),
    schema: JSONSchemaData,
    values: Type.Array(Type.String()),
  },
  strict,
);

/** VariableConfig. */
export const VariableConfigData = Type.Union([
  RandomPermutationVariableConfigData,
]);

/** VariableItem. */
export const VariableItemData = Type.Object(
  {
    name: Type.String({minLength: 1}),
    description: Type.String(),
    schema: JSONSchemaData,
  },
  strict,
);
