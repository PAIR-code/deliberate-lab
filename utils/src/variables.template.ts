import Mustache from 'mustache';
import type {TSchema} from '@sinclair/typebox';
import {CohortConfig} from './cohort';
import {Experiment} from './experiment';
import {ParticipantProfileExtended} from './participant';
import {VariableDefinition} from './variables';
import {
  extractVariablesFromVariableConfigs,
  getSchemaAtPath,
} from './variables.utils';

// Disable HTML escaping (prevents quotes from being rendered as `&quot;`)
Mustache.escape = (text: string) => text;

/** Reason why a variable reference is invalid */
export type InvalidVariableReason =
  | 'undefined'
  | 'object_needs_property'
  | 'syntax';

/** An invalid variable reference in a template */
export interface InvalidVariable {
  path: string;
  reason: InvalidVariableReason;
}

/** Format an invalid variable as a human-readable error message */
export function formatInvalidVariable(invalid: InvalidVariable): string {
  switch (invalid.reason) {
    case 'undefined':
      return `'${invalid.path}' is not defined`;
    case 'object_needs_property':
      return `'${invalid.path}' is an object - access a property like '${invalid.path}.propertyName'`;
    case 'syntax':
      return invalid.path || 'Invalid template syntax';
  }
}

/**
 * Find defined variables that are never used in a template.
 * Uses validateTemplateVariables with an empty map to extract all variable references.
 *
 * @param template The template string to check (e.g., JSON.stringify of all stages)
 * @param variableDefinitions Map of variable names to their definitions
 * @returns Array of variable names that are defined but never referenced
 */
export function findUnusedVariables(
  template: string,
  variableDefinitions: Record<string, VariableDefinition>,
): string[] {
  // With empty definitions, all variables are reported as "invalid"
  const {invalidVariables} = validateTemplateVariables(template, {});

  // Extract root variable names from full paths (e.g., "charity" from "charity.name")
  const usedRootNames = new Set<string>();
  for (const {path} of invalidVariables) {
    const rootName = path.split('.')[0];
    usedRootNames.add(rootName);
  }

  const definedNames = Object.keys(variableDefinitions);
  return definedNames.filter((name) => !usedRootNames.has(name));
}

/**
 * Resolve Mustache template variables in a given string.
 * https://mustache.github.io/mustache.5.html
 */
export function resolveTemplateVariables(
  template: string,
  variableDefinitions: Record<string, VariableDefinition>,
  valueMap: Record<string, string>,
) {
  const typedValueMap: Record<
    string,
    string | boolean | number | object | unknown[]
  > = {};
  Object.keys(valueMap).forEach((variableName) => {
    const variable = variableDefinitions[variableName];
    const schemaType = variable?.schema?.type;

    switch (schemaType) {
      case 'string':
        typedValueMap[variableName] = valueMap[variableName] ?? '';
        break;
      case 'boolean':
        typedValueMap[variableName] = valueMap[variableName] === 'true';
        break;
      case 'number':
      case 'integer':
        typedValueMap[variableName] = Number(valueMap[variableName]);
        break;
      case 'object':
      case 'array':
        // Parse JSON for complex types
        typedValueMap[variableName] = JSON.parse(valueMap[variableName]);
        break;
      default:
        break;
    }
  });

  try {
    Mustache.parse(template);
    return Mustache.render(template, typedValueMap);
  } catch (error) {
    console.warn('Failed to render Mustache template:', error);
    // Return original template string
    return template;
  }
}

/**
 * Validate that a template's variable references are defined and used correctly.
 * Also validates that the template is valid Mustache syntax.
 *
 * Supports:
 * - Dotted path access (e.g., {{policy.title}})
 * - Array indices (e.g., {{items.0.name}})
 * - Sections/Iteration (e.g., {{#items}}{{name}}{{/items}}) with context stacking
 *
 * Returns invalid variables for:
 * - Undefined variable references
 * - Object variables used directly without property access (will render as "[object Object]")
 */
export function validateTemplateVariables(
  template: string,
  variableDefinitions: Record<string, VariableDefinition> = {},
): {
  valid: boolean;
  invalidVariables: InvalidVariable[];
} {
  try {
    const tokens = Mustache.parse(template);
    const invalidVariables = new Map<string, InvalidVariable>();

    // Initial schema context is the variable definitions
    // We manually construct a schema-like object to avoid TypeBox runtime overhead/recursion
    const rootSchema: TSchema = {
      type: 'object',
      properties: {},
      additionalProperties: false,
    } as unknown as TSchema;

    if (rootSchema.properties) {
      for (const [name, def] of Object.entries(variableDefinitions)) {
        rootSchema.properties[name] = def.schema;
      }
    }

    // Context stack holds schemas for each scope level
    const contextStack: TSchema[] = [rootSchema];

    validateTokens(tokens, contextStack, invalidVariables);

    return {
      valid: invalidVariables.size === 0,
      invalidVariables: Array.from(invalidVariables.values()),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Invalid template syntax';
    return {
      valid: false,
      invalidVariables: [{path: message, reason: 'syntax'}],
    };
  }
}

/**
 * Recursively validate Mustache tokens against a context stack of schemas.
 */
function validateTokens(
  tokens: unknown[],
  contextStack: TSchema[],
  invalidVariables: Map<string, InvalidVariable>,
) {
  for (const token of tokens) {
    // Mustache token format: [type, value, start, end, subTokens, index]
    if (!Array.isArray(token)) continue;
    const [type, value, , , subTokens] = token as [
      string,
      string,
      number,
      number,
      unknown[]?,
    ];

    // Special case: '.' refers to the current context itself
    if (value === '.') {
      continue;
    }

    // Direct output: {{var}}, {{{var}}}, {{&var}} - renders value as text
    const isDirectOutput = type === 'name' || type === '&' || type === '{';
    // Sections: {{#var}}...{{/var}}, {{^var}}...{{/var}} - iterate/scope
    const isSection = type === '#' || type === '^';

    if (!isDirectOutput && !isSection) {
      continue;
    }

    const schema = resolvePathInContextStack(value, contextStack);

    if (!schema) {
      invalidVariables.set(value, {path: value, reason: 'undefined'});
    } else if (isDirectOutput && schema.type === 'object') {
      // Using {{object}} directly will render as "[object Object]"
      invalidVariables.set(value, {
        path: value,
        reason: 'object_needs_property',
      });
    }

    // For sections, recurse into sub-tokens
    if (isSection && subTokens) {
      if (schema) {
        // Push new context onto stack for nested content
        let newContext: TSchema | undefined;

        if (schema.type === 'array' && 'items' in schema) {
          newContext = schema.items as TSchema;
        } else if (schema.type === 'object') {
          newContext = schema;
        }

        if (newContext) {
          contextStack.push(newContext);
          validateTokens(subTokens, contextStack, invalidVariables);
          contextStack.pop();
        } else {
          // Primitive type (e.g. boolean toggle) - no context change
          validateTokens(subTokens, contextStack, invalidVariables);
        }
      } else {
        // Schema missing, but still validate children to find other errors
        validateTokens(subTokens, contextStack, invalidVariables);
      }
    }
  }
}

/**
 * Try to resolve a dotted path against schemas in the context stack,
 * searching from top (most specific) to bottom (root).
 */
function resolvePathInContextStack(
  path: string,
  contextStack: TSchema[],
): TSchema | undefined {
  // Search stack from top to bottom
  for (let i = contextStack.length - 1; i >= 0; i--) {
    const schema = getSchemaAtPath(contextStack[i], path);
    if (schema) {
      return schema;
    }
  }
  return undefined;
}

/**
 * Check if a string contains template variable syntax (e.g., {{variable}}).
 * This is a fast check to avoid unnecessary template processing.
 */
export function containsTemplateVariables(text: string): boolean {
  return text.includes('{{');
}

/**
 * Extracts variable definitions and merged value map from experiment, cohort, and participant context.
 * Used for resolving template variables in prompts.
 *
 * Variable maps are merged in order of precedence: experiment < cohort < participant.
 *
 * @param participant - The participant whose variables should be included (optional).
 *   For agent participants, pass themselves. For mediators in private chats, pass the
 *   participant they're chatting with.
 */
export function getVariableContext(
  experiment: Experiment,
  cohort: CohortConfig,
  participant?: ParticipantProfileExtended | null,
): {
  variableDefinitions: Record<string, VariableDefinition>;
  valueMap: Record<string, string>;
} {
  const experimentVariableMap = experiment.variableMap ?? {};
  const cohortVariableMap = cohort.variableMap ?? {};
  const participantVariableMap = participant?.variableMap ?? {};

  const variableDefinitions = extractVariablesFromVariableConfigs(
    experiment.variableConfigs ?? [],
  );
  const valueMap = {
    ...experimentVariableMap,
    ...cohortVariableMap,
    ...participantVariableMap,
  };

  return {variableDefinitions, valueMap};
}
