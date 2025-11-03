import {Type, type Static} from '@sinclair/typebox';
import {VariableConfigType, VariableType} from './variables';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

/** RandomPermutationVariableConfig. */
export const RandomPermutationVariableConfigData = Type.Object(
  {
    id: Type.String({minLength: 1}),
    type: Type.Literal(VariableConfigType.RANDOM_PERMUTATION),
    variableNames: Type.Array(Type.String()),
    variableType: Type.Union([
      Type.Literal(VariableType.STRING),
      Type.Literal(VariableType.NUMBER),
      Type.Literal(VariableType.BOOLEAN),
      Type.Literal(VariableType.OBJECT),
    ]),
    schema: Type.Optional(
      Type.Record(
        Type.String(),
        Type.Union([
          Type.Literal(VariableType.STRING),
          Type.Literal(VariableType.NUMBER),
          Type.Literal(VariableType.BOOLEAN),
        ]),
      ),
    ),
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
    type: Type.Union([
      Type.Literal(VariableType.STRING),
      Type.Literal(VariableType.NUMBER),
      Type.Literal(VariableType.BOOLEAN),
      Type.Literal(VariableType.OBJECT),
    ]),
    schema: Type.Optional(
      Type.Record(
        Type.String(),
        Type.Union([
          Type.Literal(VariableType.STRING),
          Type.Literal(VariableType.NUMBER),
          Type.Literal(VariableType.BOOLEAN),
        ]),
      ),
    ),
  },
  strict,
);
