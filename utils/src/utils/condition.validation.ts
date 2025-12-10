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
  {$id: 'ConditionTargetReference', ...strict},
);

/** ComparisonCondition validation */
export const ComparisonConditionSchema = Type.Object(
  {
    id: Type.String({minLength: 1}),
    type: Type.Literal('comparison'),
    target: ConditionTargetReferenceSchema,
    operator: Type.Enum(ComparisonOperator, {$id: 'ComparisonOperator'}),
    value: Type.Union([Type.String(), Type.Number(), Type.Boolean()]),
  },
  {$id: 'ComparisonCondition', ...strict},
);

/**
 * Condition validation schema (recursive).
 * Supports both ConditionGroup and ComparisonCondition.
 */
export const ConditionSchema: ReturnType<typeof Type.Recursive> =
  Type.Recursive(
    (This) =>
      Type.Union([
        ComparisonConditionSchema,
        Type.Object(
          {
            id: Type.String({minLength: 1}),
            type: Type.Literal('group'),
            operator: Type.Enum(ConditionOperator, {$id: 'ConditionOperator'}),
            conditions: Type.Array(This),
          },
          {$id: 'ConditionGroup', ...strict},
        ),
      ]),
    {$id: 'Condition'},
  );

/** ConditionGroup schema for export to $defs (enables deduplication) */
export const ConditionGroupSchema = Type.Object(
  {
    id: Type.String({minLength: 1}),
    type: Type.Literal('group'),
    operator: Type.Enum(ConditionOperator, {$id: 'ConditionOperator'}),
    conditions: Type.Array(Type.Ref(ConditionSchema)),
  },
  {$id: 'ConditionGroup', ...strict},
);

export type ConditionSchemaType = Static<typeof ConditionSchema>;
