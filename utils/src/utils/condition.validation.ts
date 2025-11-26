import {Type, type Static} from '@sinclair/typebox';
import {ConditionOperator, ComparisonOperator} from './condition';

/** Shorthand for strict TypeBox object validation */
const strict = {additionalProperties: false} as const;

// ************************************************************************* //
// Condition validation schemas                                              //
// ************************************************************************* //

/** ConditionTargetReference validation */
export const ConditionTargetReferenceSchema = Type.Object(
  {
    stageId: Type.String({minLength: 1}),
    questionId: Type.String({minLength: 1}),
  },
  strict,
);

/** ComparisonCondition validation */
export const ComparisonConditionSchema = Type.Object(
  {
    id: Type.String({minLength: 1}),
    type: Type.Literal('comparison'),
    target: ConditionTargetReferenceSchema,
    operator: Type.Enum(ComparisonOperator),
    value: Type.Union([Type.String(), Type.Number(), Type.Boolean()]),
  },
  strict,
);

/**
 * Condition validation schema (recursive).
 * Supports both ConditionGroup and ComparisonCondition.
 */
export const ConditionSchema = Type.Recursive(
  (This) =>
    Type.Union([
      // ComparisonCondition
      ComparisonConditionSchema,
      // ConditionGroup (recursive)
      Type.Object(
        {
          id: Type.String({minLength: 1}),
          type: Type.Literal('group'),
          operator: Type.Enum(ConditionOperator),
          conditions: Type.Array(This),
        },
        strict,
      ),
    ]),
  {$id: 'Condition'},
);

export type ConditionSchemaType = Static<typeof ConditionSchema>;
