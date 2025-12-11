import {generateId} from '../shared';

/** Reusable condition system for conditional logic */

export enum ConditionOperator {
  AND = 'and',
  OR = 'or',
}

export enum ComparisonOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN = 'less_than',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
}

/** Aggregation operators for evaluating conditions across multiple values */
export enum AggregationOperator {
  ANY = 'any', // True if any value passes the comparison
  ALL = 'all', // True if all values pass the comparison
  NONE = 'none', // True if no value passes the comparison
  COUNT = 'count', // Count of values (optionally filtered), comparison applied to count
  SUM = 'sum', // Sum of numeric values (optionally filtered), comparison applied to result
  AVERAGE = 'average', // Average of numeric values (optionally filtered), comparison applied to result
}

export interface BaseCondition {
  id: string;
  type: 'group' | 'comparison' | 'aggregation';
}

export interface ConditionGroup extends BaseCondition {
  type: 'group';
  operator: ConditionOperator;
  conditions: Condition[];
}

// Structured representation of a condition target
export interface ConditionTargetReference {
  stageId: string;
  questionId: string;
}

/**
 * Reusable comparison specification (operator + value pair).
 * Used for filter comparisons and as a building block for condition types.
 */
export interface ComparisonSpec {
  operator: ComparisonOperator;
  value: string | number | boolean;
}

/**
 * Comparison spec with a target reference.
 * Used as the base for both ComparisonCondition and AggregationCondition.
 */
export interface TargetedComparisonSpec extends ComparisonSpec {
  target: ConditionTargetReference;
}

/**
 * A condition that compares a single target value against an expected value.
 */
export interface ComparisonCondition
  extends BaseCondition, TargetedComparisonSpec {
  type: 'comparison';
}

/**
 * Aggregation condition for evaluating across multiple values.
 * Used when a target can have multiple values (e.g., answers from multiple participants).
 *
 * For ANY/ALL/NONE: applies operator/value to each value (filterComparison ignored)
 * For COUNT/SUM/AVERAGE:
 *   - filterComparison (optional): filters which values to include in aggregation
 *   - operator/value: compares the aggregated result
 */
export interface AggregationCondition
  extends BaseCondition, TargetedComparisonSpec {
  type: 'aggregation';
  aggregator: AggregationOperator;
  // Optional: filter values before aggregating (only used for COUNT/SUM/AVERAGE)
  filterComparison?: ComparisonSpec;
}

export type Condition =
  | ConditionGroup
  | ComparisonCondition
  | AggregationCondition;

/** Create a condition group with optional initial conditions */
export function createConditionGroup(
  operator: ConditionOperator = ConditionOperator.AND,
  conditions: Condition[] = [],
): ConditionGroup {
  return {
    id: generateId(),
    type: 'group',
    operator,
    conditions,
  };
}

/** Create a comparison condition */
export function createComparisonCondition(
  target: ConditionTargetReference,
  operator: ComparisonOperator = ComparisonOperator.EQUALS,
  value: string | number | boolean = '',
): ComparisonCondition {
  return {
    id: generateId(),
    type: 'comparison',
    target,
    operator,
    value,
  };
}

/** Create an aggregation condition for group contexts */
export function createAggregationCondition(
  target: ConditionTargetReference,
  aggregator: AggregationOperator = AggregationOperator.ANY,
  operator: ComparisonOperator = ComparisonOperator.EQUALS,
  value: string | number | boolean = '',
): AggregationCondition {
  return {
    id: generateId(),
    type: 'aggregation',
    target,
    aggregator,
    operator,
    value,
  };
}

/**
 * Evaluate a condition against target values.
 *
 * @param condition - The condition to evaluate
 * @param targetValues - Map of target keys to values. Values can be:
 *   - Single values (for comparison conditions)
 *   - Arrays of values (for aggregation conditions)
 */
export function evaluateCondition(
  condition: Condition | undefined,
  targetValues: Record<string, unknown> | Record<string, unknown[]>,
): boolean {
  if (!condition) return true;

  if (condition.type === 'group') {
    return evaluateConditionGroup(condition, targetValues);
  } else if (condition.type === 'aggregation') {
    return evaluateAggregationCondition(
      condition,
      targetValues as Record<string, unknown[]>,
    );
  } else {
    return evaluateComparisonCondition(
      condition,
      targetValues as Record<string, unknown>,
    );
  }
}

function evaluateConditionGroup(
  group: ConditionGroup,
  targetValues: Record<string, unknown> | Record<string, unknown[]>,
): boolean {
  if (group.conditions.length === 0) return true;

  if (group.operator === ConditionOperator.AND) {
    return group.conditions.every((c) => evaluateCondition(c, targetValues));
  } else {
    return group.conditions.some((c) => evaluateCondition(c, targetValues));
  }
}

/** Apply a comparison operator to two values */
function applyComparison(
  operator: ComparisonOperator,
  value: unknown,
  compareValue: string | number | boolean,
): boolean {
  switch (operator) {
    case ComparisonOperator.EQUALS:
      return value === compareValue;
    case ComparisonOperator.NOT_EQUALS:
      return value !== compareValue;
    case ComparisonOperator.GREATER_THAN:
      return Number(value) > Number(compareValue);
    case ComparisonOperator.GREATER_THAN_OR_EQUAL:
      return Number(value) >= Number(compareValue);
    case ComparisonOperator.LESS_THAN:
      return Number(value) < Number(compareValue);
    case ComparisonOperator.LESS_THAN_OR_EQUAL:
      return Number(value) <= Number(compareValue);
    case ComparisonOperator.CONTAINS:
      return String(value).includes(String(compareValue));
    case ComparisonOperator.NOT_CONTAINS:
      return !String(value).includes(String(compareValue));
    default:
      return false;
  }
}

function evaluateComparisonCondition(
  condition: ComparisonCondition,
  targetValues: Record<string, unknown>,
): boolean {
  const targetKey = getConditionTargetKey(condition.target);
  const targetValue = targetValues[targetKey];

  if (targetValue === undefined) return false;

  return applyComparison(condition.operator, targetValue, condition.value);
}

/**
 * Evaluate an aggregation condition against multiple values.
 */
function evaluateAggregationCondition(
  condition: AggregationCondition,
  targetValues: Record<string, unknown[]>,
): boolean {
  const targetKey = getConditionTargetKey(condition.target);
  const values = targetValues[targetKey];

  if (!values || values.length === 0) return false;

  switch (condition.aggregator) {
    case AggregationOperator.ANY:
      // True if any value passes the comparison
      return values.some((v) =>
        applyComparison(condition.operator, v, condition.value),
      );
    case AggregationOperator.ALL:
      // True if all values pass the comparison
      return values.every((v) =>
        applyComparison(condition.operator, v, condition.value),
      );
    case AggregationOperator.NONE:
      // True if no value passes the comparison
      return !values.some((v) =>
        applyComparison(condition.operator, v, condition.value),
      );
    case AggregationOperator.COUNT: {
      // Filter values if filterComparison is set, otherwise count all non-null
      let filteredValues: unknown[];
      if (condition.filterComparison) {
        filteredValues = values.filter((v) =>
          applyComparison(
            condition.filterComparison!.operator,
            v,
            condition.filterComparison!.value,
          ),
        );
      } else {
        filteredValues = values.filter((v) => v !== undefined && v !== null);
      }
      return applyComparison(
        condition.operator,
        filteredValues.length,
        condition.value,
      );
    }
    case AggregationOperator.SUM: {
      // Filter values if filterComparison is set, then sum
      let filteredValues = values;
      if (condition.filterComparison) {
        filteredValues = values.filter((v) =>
          applyComparison(
            condition.filterComparison!.operator,
            v,
            condition.filterComparison!.value,
          ),
        );
      }
      const sum = filteredValues.reduce(
        (acc: number, v) => acc + (Number(v) || 0),
        0,
      );
      return applyComparison(condition.operator, sum, condition.value);
    }
    case AggregationOperator.AVERAGE: {
      // Filter values if filterComparison is set, then average
      let filteredValues = values;
      if (condition.filterComparison) {
        filteredValues = values.filter((v) =>
          applyComparison(
            condition.filterComparison!.operator,
            v,
            condition.filterComparison!.value,
          ),
        );
      }
      if (filteredValues.length === 0) return false;
      const avg =
        filteredValues.reduce((acc: number, v) => acc + (Number(v) || 0), 0) /
        filteredValues.length;
      return applyComparison(condition.operator, avg, condition.value);
    }
    default:
      return false;
  }
}

/** Get human-readable label for comparison operator */
export function getComparisonOperatorLabel(
  operator: ComparisonOperator,
): string {
  switch (operator) {
    case ComparisonOperator.EQUALS:
      return 'equals';
    case ComparisonOperator.NOT_EQUALS:
      return 'not equals';
    case ComparisonOperator.GREATER_THAN:
      return 'greater than';
    case ComparisonOperator.GREATER_THAN_OR_EQUAL:
      return 'greater than or equal to';
    case ComparisonOperator.LESS_THAN:
      return 'less than';
    case ComparisonOperator.LESS_THAN_OR_EQUAL:
      return 'less than or equal to';
    case ComparisonOperator.CONTAINS:
      return 'contains';
    case ComparisonOperator.NOT_CONTAINS:
      return 'does not contain';
    default:
      return operator;
  }
}

/** Get human-readable label for condition operator */
export function getConditionOperatorLabel(operator: ConditionOperator): string {
  switch (operator) {
    case ConditionOperator.AND:
      return 'AND';
    case ConditionOperator.OR:
      return 'OR';
    default:
      return operator;
  }
}

/** Build the key string for a condition target reference */
export function getConditionTargetKey(
  target: ConditionTargetReference,
): string {
  return `${target.stageId}::${target.questionId}`;
}

/** Parse a condition target key back into a reference */
export function parseConditionTargetKey(key: string): ConditionTargetReference {
  const [stageId, questionId] = key.split('::');
  return {stageId, questionId};
}

/** Helper to deduplicate condition target references */
function deduplicateTargetReferences(
  references: ConditionTargetReference[],
): ConditionTargetReference[] {
  const uniqueKeys = new Set(references.map(getConditionTargetKey));
  return Array.from(uniqueKeys).map(parseConditionTargetKey);
}

/** Extract all target references that a condition depends on */
export function extractConditionDependencies(
  condition: Condition | undefined,
): ConditionTargetReference[] {
  if (!condition) return [];

  const dependencies: ConditionTargetReference[] = [];

  if (condition.type === 'comparison') {
    dependencies.push(condition.target);
  } else if (condition.type === 'aggregation') {
    dependencies.push(condition.target);
  } else if (condition.type === 'group') {
    for (const subCondition of condition.conditions) {
      dependencies.push(...extractConditionDependencies(subCondition));
    }
  }

  return deduplicateTargetReferences(dependencies);
}

/** Check if a condition contains any aggregation conditions */
export function hasAggregationConditions(
  condition: Condition | undefined,
): boolean {
  if (!condition) return false;

  if (condition.type === 'aggregation') {
    return true;
  } else if (condition.type === 'group') {
    return condition.conditions.some((c) => hasAggregationConditions(c));
  }
  return false;
}

/** Extract dependencies from multiple conditions */
export function extractMultipleConditionDependencies(
  conditions: (Condition | undefined)[],
): ConditionTargetReference[] {
  const allDeps: ConditionTargetReference[] = [];

  for (const condition of conditions) {
    allDeps.push(...extractConditionDependencies(condition));
  }

  return deduplicateTargetReferences(allDeps);
}
