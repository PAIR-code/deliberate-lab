import {Type, type Static} from '@sinclair/typebox';
import {VariableType} from './variables';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

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
