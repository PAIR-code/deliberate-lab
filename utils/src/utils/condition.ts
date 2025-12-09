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

export interface BaseCondition {
  id: string;
  type: 'group' | 'comparison';
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

export interface ComparisonCondition extends BaseCondition {
  type: 'comparison';
  target: ConditionTargetReference; // Structured reference to the target
  operator: ComparisonOperator;
  value: string | number | boolean; // The value to compare against
}

export type Condition = ConditionGroup | ComparisonCondition;

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

/** Evaluate a condition against target values */
export function evaluateCondition(
  condition: Condition | undefined,
  targetValues: Record<string, unknown>,
): boolean {
  if (!condition) return true;

  if (condition.type === 'group') {
    return evaluateConditionGroup(condition, targetValues);
  } else {
    return evaluateComparisonCondition(condition, targetValues);
  }
}

function evaluateConditionGroup(
  group: ConditionGroup,
  targetValues: Record<string, unknown>,
): boolean {
  if (group.conditions.length === 0) return true;

  if (group.operator === ConditionOperator.AND) {
    return group.conditions.every((c) => evaluateCondition(c, targetValues));
  } else {
    return group.conditions.some((c) => evaluateCondition(c, targetValues));
  }
}

function evaluateComparisonCondition(
  condition: ComparisonCondition,
  targetValues: Record<string, unknown>,
): boolean {
  const targetKey = getConditionTargetKey(condition.target);
  const targetValue = targetValues[targetKey];

  if (targetValue === undefined) return false;

  switch (condition.operator) {
    case ComparisonOperator.EQUALS:
      return targetValue === condition.value;
    case ComparisonOperator.NOT_EQUALS:
      return targetValue !== condition.value;
    case ComparisonOperator.GREATER_THAN:
      return Number(targetValue) > Number(condition.value);
    case ComparisonOperator.GREATER_THAN_OR_EQUAL:
      return Number(targetValue) >= Number(condition.value);
    case ComparisonOperator.LESS_THAN:
      return Number(targetValue) < Number(condition.value);
    case ComparisonOperator.LESS_THAN_OR_EQUAL:
      return Number(targetValue) <= Number(condition.value);
    case ComparisonOperator.CONTAINS:
      return String(targetValue).includes(String(condition.value));
    case ComparisonOperator.NOT_CONTAINS:
      return !String(targetValue).includes(String(condition.value));
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
  } else if (condition.type === 'group') {
    for (const subCondition of condition.conditions) {
      dependencies.push(...extractConditionDependencies(subCondition));
    }
  }

  return deduplicateTargetReferences(dependencies);
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
